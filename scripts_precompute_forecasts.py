"""
Expanded precompute for the Chronos-2 sandbox.

Monthly rolling dates (2018–2025), three panels — equities (7), rates (10),
and a combined 17-series "world" — at horizons 21 & 63, window n=252. UV
forecasts are computed once per (series,date,horizon) and shared across panels;
MV is computed per panel (cross-series). Writes one JSON per panel + meta.json.
"""

import json, os, sys
import numpy as np
import pandas as pd
from datetime import datetime

from data_loader import DataLoader
from chronos import Chronos2Pipeline

STOCKS = ["AAPL", "AMZN", "GOOGL", "MSFT", "NFLX", "NVDA", "TSLA"]
RATES = ["DGS3MO", "DGS6MO", "DGS1", "DGS2", "DGS3", "DGS5", "DGS7", "DGS10", "DGS20", "DGS30"]
RATE_LABELS = {"DGS3MO": "3-Month", "DGS6MO": "6-Month", "DGS1": "1-Year", "DGS2": "2-Year",
    "DGS3": "3-Year", "DGS5": "5-Year", "DGS7": "7-Year", "DGS10": "10-Year", "DGS20": "20-Year", "DGS30": "30-Year"}
STOCK_NAMES = {"AAPL": "Apple", "AMZN": "Amazon", "GOOGL": "Alphabet", "MSFT": "Microsoft",
    "NFLX": "Netflix", "NVDA": "NVIDIA", "TSLA": "Tesla"}

HORIZONS = [21, 63]
N = 252
CONTEXT_SHOW = 45
OUTDIR = sys.argv[1] if len(sys.argv) > 1 else "/tmp/fc"

pipe = None


def get_pipe():
    global pipe
    if pipe is None:
        pipe = Chronos2Pipeline.from_pretrained("amazon/chronos-2", device_map="cpu")
    return pipe


def month_end_bdays(df, start, end):
    ts = pd.to_datetime(df["timestamp"])
    months = pd.date_range(start, end, freq="ME")
    out = []
    for m in months:
        prior = ts[ts <= m]
        if len(prior):
            out.append(prior.iloc[-1])
    return sorted(set(out))


def metrics(a, p):
    a = np.asarray(a, float); p = np.asarray(p, float)
    mask = np.abs(a) > 1e-9
    mape = float(np.mean(np.abs((a[mask] - p[mask]) / a[mask]))) if mask.any() else None
    rmse = float(np.sqrt(np.mean((a - p) ** 2)))
    return {"mape": mape, "rmse": rmse}


def rnd(arr, d):
    return [round(float(v), d) for v in arr]


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    loader = DataLoader(); loader.mag7_tickers = STOCKS
    print("Downloading...", flush=True)
    stocks = loader.download_stocks(start_date="2016-06-01")
    rates = loader.download_interest_rates(start_date="2016-06-01")
    stocks["timestamp"] = pd.to_datetime(stocks["timestamp"])
    rates["timestamp"] = pd.to_datetime(rates["timestamp"])
    world = pd.merge(stocks, rates, on="timestamp", how="inner").sort_values("timestamp").reset_index(drop=True)

    dates = month_end_bdays(world, "2018-01-01", "2025-06-30")
    date_strs = [d.strftime("%Y-%m-%d") for d in dates]
    print(f"{len(dates)} monthly dates", flush=True)

    pipe = get_pipe()
    uv_cache = {}  # (series,date,horizon) -> {pred, dec}

    panels = {
        "equities": {"df": stocks, "series": STOCKS, "labels": STOCK_NAMES, "unit": "price", "dec": 2},
        "rates": {"df": rates, "series": RATES, "labels": RATE_LABELS, "unit": "percent", "dec": 4},
        "world": {"df": world, "series": STOCKS + RATES, "labels": {**STOCK_NAMES, **RATE_LABELS}, "unit": "mixed", "dec": 4},
    }

    def uv_forecast(df, s, t, fdates, m, dec):
        key = (s, t.strftime("%Y-%m-%d"), m)
        if key in uv_cache:
            return uv_cache[key]
        hist = df[df["timestamp"] <= t]
        ctx_s = hist[["timestamp", s]].dropna().iloc[-N:]
        if len(ctx_s) < N * 0.8:
            uv_cache[key] = None; return None
        uv = pipe.predict_df(
            pd.DataFrame({"item_id": s, "timestamp": ctx_s["timestamp"], "target": ctx_s[s]}),
            future_df=pd.DataFrame({"item_id": s, "timestamp": fdates}), prediction_length=m,
            quantile_levels=[0.5], id_column="item_id", timestamp_column="timestamp", target="target")
        val = rnd(uv["0.5"].to_numpy(float), dec)
        uv_cache[key] = val
        return val

    meta_panels = {}
    for pkey, panel in panels.items():
        df = panel["df"].sort_values("timestamp").reset_index(drop=True)
        series = panel["series"]
        dec = panel["dec"]
        bundles = {}
        for t in dates:
            hist = df[df["timestamp"] <= t]
            if len(hist) < N:
                continue
            ctx = hist.iloc[-N:].reset_index(drop=True)
            fut_all = df[df["timestamp"] > t].reset_index(drop=True)
            present = [s for s in series if ctx[s].dropna().shape[0] >= N * 0.8]
            for m in HORIZONS:
                if len(fut_all) < m:
                    continue
                block = fut_all.iloc[:m]
                fdates = list(block["timestamp"])
                ctx_mv = ctx[["timestamp"] + present].copy(); ctx_mv["item_id"] = pkey
                mv = pipe.predict_df(
                    ctx_mv, future_df=pd.DataFrame({"item_id": pkey, "timestamp": fdates}),
                    prediction_length=m, quantile_levels=[0.1, 0.5, 0.9],
                    id_column="item_id", timestamp_column="timestamp", target=present)
                for s in present:
                    actual = block[s].to_numpy(float)
                    if np.isnan(actual).any():
                        continue
                    uv_pred = uv_forecast(df, s, t, fdates, m, dec)
                    if uv_pred is None:
                        continue
                    mv_s = mv[mv["target_name"] == s]
                    mv_pred = mv_s["0.5"].to_numpy(float)
                    sdec = 2 if s in STOCK_NAMES else 4
                    ctx_tail = ctx[["timestamp", s]].dropna().iloc[-CONTEXT_SHOW:]
                    bundles[f"{s}|{t.strftime('%Y-%m-%d')}|{m}"] = {
                        "series": s, "label": panel["labels"].get(s, s),
                        "unit": "price" if s in STOCK_NAMES else "percent",
                        "date": t.strftime("%Y-%m-%d"), "horizon": m,
                        "contextDates": [d.strftime("%Y-%m-%d") for d in ctx_tail["timestamp"]],
                        "context": rnd(ctx_tail[s].tolist(), sdec),
                        "forecastDates": [d.strftime("%Y-%m-%d") for d in fdates],
                        "actual": rnd(actual, sdec), "uv": uv_pred, "mv": rnd(mv_pred, sdec),
                        "mvLo": rnd(mv_s["0.1"].to_numpy(float), sdec),
                        "mvHi": rnd(mv_s["0.9"].to_numpy(float), sdec),
                        "metrics": {"uv": metrics(actual, uv_pred), "mv": metrics(actual, mv_pred)},
                    }
            print(f"  {pkey} {t.strftime('%Y-%m-%d')} done", flush=True)
        with open(f"{OUTDIR}/forecasts_{pkey}.json", "w") as f:
            json.dump({"panel": pkey, "bundles": bundles}, f)
        meta_panels[pkey] = {"series": series, "labels": panel["labels"], "unit": panel["unit"]}
        sz = os.path.getsize(f"{OUTDIR}/forecasts_{pkey}.json") / 1024
        print(f"  -> {pkey}: {len(bundles)} bundles, {sz:.0f} KB", flush=True)

    meta = {"generatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "model": "amazon/chronos-2", "window": N, "dates": date_strs, "horizons": HORIZONS,
            "panels": meta_panels}
    with open(f"{OUTDIR}/meta.json", "w") as f:
        json.dump(meta, f)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
