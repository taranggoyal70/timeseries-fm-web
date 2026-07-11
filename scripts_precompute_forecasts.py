"""
Precompute real Chronos-2 UV & MV forecasts for the interactive demo site.

Downloads Mag-7 equities + FRED Treasury rates, runs Chronos-2 for a grid of
(series x date x horizon) in both univariate and multivariate modes, aligns
with realized actuals, computes MAPE/RMSE, and writes a single forecasts.json
the web app serves statically. No model runs at request time.
"""

import json
import sys
import numpy as np
import pandas as pd
from datetime import datetime

from data_loader import DataLoader
from chronos import Chronos2Pipeline

# Paper's panels: 7 equities (matches the results tables) + 10 Treasury rates.
STOCKS = ["AAPL", "AMZN", "GOOGL", "MSFT", "NFLX", "NVDA", "TSLA"]
RATES = ["DGS3MO", "DGS6MO", "DGS1", "DGS2", "DGS3", "DGS5", "DGS7", "DGS10", "DGS20", "DGS30"]
RATE_LABELS = {
    "DGS3MO": "3-Month", "DGS6MO": "6-Month", "DGS1": "1-Year", "DGS2": "2-Year",
    "DGS3": "3-Year", "DGS5": "5-Year", "DGS7": "7-Year", "DGS10": "10-Year",
    "DGS20": "20-Year", "DGS30": "30-Year",
}
STOCK_NAMES = {
    "AAPL": "Apple", "AMZN": "Amazon", "GOOGL": "Alphabet", "MSFT": "Microsoft",
    "NFLX": "Netflix", "NVDA": "NVIDIA", "TSLA": "Tesla",
}

DATES = ["2023-12-29", "2024-03-28", "2024-06-28", "2024-09-30", "2024-12-31", "2025-03-31"]
HORIZONS = [21, 63]
N = 252            # input window (1 trading year)
CONTEXT_SHOW = 90  # context points kept for the chart


def to_long(df, cols):
    frames = []
    for c in cols:
        s = df[["timestamp", c]].dropna()
        frames.append(pd.DataFrame({"item_id": c, "timestamp": s["timestamp"], "target": s[c]}))
    return pd.concat(frames, ignore_index=True)


def metrics(actual, pred):
    a = np.asarray(actual, float)
    p = np.asarray(pred, float)
    mask = np.abs(a) > 1e-9
    mape = float(np.mean(np.abs((a[mask] - p[mask]) / a[mask]))) if mask.any() else None
    rmse = float(np.sqrt(np.mean((a - p) ** 2)))
    return {"mape": mape, "rmse": rmse}


def run():
    loader = DataLoader()
    loader.mag7_tickers = STOCKS
    print("Downloading data...", flush=True)
    stocks = loader.download_stocks(start_date="2019-01-01")
    rates = loader.download_interest_rates(start_date="2019-01-01")

    pipe = Chronos2Pipeline.from_pretrained("amazon/chronos-2", device_map="cpu")

    panels = {
        "stocks": {"df": stocks, "series": STOCKS, "labels": STOCK_NAMES, "unit": "price"},
        "rates": {"df": rates, "series": RATES, "labels": RATE_LABELS, "unit": "percent"},
    }

    bundles = {}
    for pkey, panel in panels.items():
        df = panel["df"].copy()
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp").reset_index(drop=True)
        series = panel["series"]

        for date_str in DATES:
            t = pd.Timestamp(date_str)
            hist = df[df["timestamp"] <= t]
            if len(hist) < N:
                print(f"  skip {pkey} {date_str}: insufficient history", flush=True)
                continue
            ctx = hist.iloc[-N:].reset_index(drop=True)
            fut_all = df[df["timestamp"] > t].reset_index(drop=True)

            for m in HORIZONS:
                if len(fut_all) < m:
                    continue
                actual_block = fut_all.iloc[:m]
                fdates = list(actual_block["timestamp"])

                # True multivariate: ONE item_id, many target columns → the model
                # attends across series (target as a list). Output carries target_name.
                present = [s for s in series if ctx[s].dropna().shape[0] >= N * 0.8]
                ctx_mv = ctx[["timestamp"] + present].copy()
                ctx_mv["item_id"] = pkey
                future_mv = pd.DataFrame({"item_id": pkey, "timestamp": fdates})
                mv = pipe.predict_df(
                    ctx_mv, future_df=future_mv, prediction_length=m,
                    quantile_levels=[0.1, 0.5, 0.9], id_column="item_id",
                    timestamp_column="timestamp", target=present,
                )
                print(f"  {pkey} {date_str} h={m}: MV done ({len(present)} variates)", flush=True)

                for s in series:
                    if s not in ctx.columns or ctx[s].dropna().shape[0] < N * 0.8:
                        continue
                    actual = actual_block[s].to_numpy(float)
                    if np.isnan(actual).any():
                        continue

                    ctx_s = ctx[["timestamp", s]].dropna()
                    future_uv = pd.DataFrame({"item_id": s, "timestamp": fdates})
                    uv = pipe.predict_df(
                        pd.DataFrame({"item_id": s, "timestamp": ctx_s["timestamp"], "target": ctx_s[s]}),
                        future_df=future_uv, prediction_length=m,
                        quantile_levels=[0.1, 0.5, 0.9], id_column="item_id",
                        timestamp_column="timestamp", target="target",
                    )
                    mv_s = mv[mv["target_name"] == s]
                    uv_pred = uv["0.5"].to_numpy(float)
                    mv_pred = mv_s["0.5"].to_numpy(float)
                    mv_lo = mv_s["0.1"].to_numpy(float)
                    mv_hi = mv_s["0.9"].to_numpy(float)

                    ctx_tail = ctx[["timestamp", s]].dropna().iloc[-CONTEXT_SHOW:]
                    key = f"{pkey}|{s}|{date_str}|{m}"
                    bundles[key] = {
                        "dataset": pkey,
                        "series": s,
                        "label": panel["labels"].get(s, s),
                        "unit": panel["unit"],
                        "date": date_str,
                        "horizon": m,
                        "contextDates": [d.strftime("%Y-%m-%d") for d in ctx_tail["timestamp"]],
                        "context": [round(v, 4) for v in ctx_tail[s].tolist()],
                        "forecastDates": [d.strftime("%Y-%m-%d") for d in fdates],
                        "actual": [round(v, 4) for v in actual.tolist()],
                        "uv": [round(v, 4) for v in uv_pred.tolist()],
                        "mv": [round(v, 4) for v in mv_pred.tolist()],
                        "mvLo": [round(v, 4) for v in mv_lo.tolist()],
                        "mvHi": [round(v, 4) for v in mv_hi.tolist()],
                        "metrics": {"uv": metrics(actual, uv_pred), "mv": metrics(actual, mv_pred)},
                    }

    out = {
        "generatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "model": "amazon/chronos-2",
        "window": N,
        "dates": DATES,
        "horizons": HORIZONS,
        "panels": {
            "stocks": {"series": STOCKS, "labels": STOCK_NAMES, "unit": "price"},
            "rates": {"series": RATES, "labels": RATE_LABELS, "unit": "percent"},
        },
        "bundles": bundles,
    }
    with open(sys.argv[1] if len(sys.argv) > 1 else "forecasts.json", "w") as f:
        json.dump(out, f)
    print(f"\nWrote {len(bundles)} bundles.", flush=True)


if __name__ == "__main__":
    run()
