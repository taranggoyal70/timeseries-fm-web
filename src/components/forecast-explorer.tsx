"use client";

import { useEffect, useMemo, useState } from "react";

import { ForecastChart } from "@/components/forecast-chart";
import { bundleKey, type Bundle, type ForecastData } from "@/lib/types";

type Dataset = "stocks" | "rates";

export function ForecastExplorer() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [error, setError] = useState(false);

  const [dataset, setDataset] = useState<Dataset>("stocks");
  const [series, setSeries] = useState("NVDA");
  const [date, setDate] = useState("2025-03-31");
  const [horizon, setHorizon] = useState(21);
  const [show, setShow] = useState({ mv: true, uv: true, band: true });

  useEffect(() => {
    fetch("/forecasts.json")
      .then((r) => r.json())
      .then((d: ForecastData) => setData(d))
      .catch(() => setError(true));
  }, []);

  const panel = data?.panels[dataset];
  const seriesList = panel?.series ?? [];

  // Switching panel picks a valid default series in the same update.
  function changeDataset(next: Dataset) {
    setDataset(next);
    const first = data?.panels[next]?.series[0];
    if (first) setSeries(first);
  }

  const bundle: Bundle | null = useMemo(() => {
    if (!data) return null;
    return data.bundles[bundleKey(dataset, series, date, horizon)] ?? null;
  }, [data, dataset, series, date, horizon]);

  if (error) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-muted">
        Could not load forecast data.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-muted">
        Loading real Chronos-2 forecasts…
      </div>
    );
  }

  const mape = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(2)}%`);
  const winner =
    bundle && bundle.metrics.mv.mape !== null && bundle.metrics.uv.mape !== null
      ? bundle.metrics.mv.mape < bundle.metrics.uv.mape
        ? "MV"
        : "UV"
      : null;
  const improvement =
    bundle && bundle.metrics.mv.mape !== null && bundle.metrics.uv.mape !== null
      ? ((bundle.metrics.uv.mape - bundle.metrics.mv.mape) / bundle.metrics.uv.mape) * 100
      : null;

  return (
    <div className="rounded-2xl border border-line-strong bg-surface/70 p-4 backdrop-blur sm:p-6">
      {/* controls */}
      <div className="flex flex-wrap items-end gap-4">
        <Toggle
          label="Panel"
          value={dataset}
          options={[
            { v: "stocks", l: "Equities" },
            { v: "rates", l: "Treasury rates" },
          ]}
          onChange={(v) => changeDataset(v as Dataset)}
        />
        <Field label="Series">
          <select
            value={series}
            onChange={(e) => setSeries(e.target.value)}
            className="select"
          >
            {seriesList.map((s) => (
              <option key={s} value={s}>
                {panel?.labels[s] ?? s} ({s})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Forecast date">
          <select value={date} onChange={(e) => setDate(e.target.value)} className="select">
            {data.dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Toggle
          label="Horizon"
          value={String(horizon)}
          options={data.horizons.map((h) => ({ v: String(h), l: `${h}d` }))}
          onChange={(v) => setHorizon(Number(v))}
        />
      </div>

      {/* legend + toggles */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <LegendToggle color="var(--actual)" label="Actual" active on onClick={() => {}} solid />
        <LegendToggle color="var(--mv)" label="Multivariate" active={show.mv} on={show.mv} onClick={() => setShow((s) => ({ ...s, mv: !s.mv }))} />
        <LegendToggle color="var(--uv)" label="Univariate" active={show.uv} on={show.uv} onClick={() => setShow((s) => ({ ...s, uv: !s.uv }))} dashed />
        <button
          onClick={() => setShow((s) => ({ ...s, band: !s.band }))}
          className={`ml-auto rounded-md border px-2 py-1 transition ${show.band ? "border-mv/40 text-mv" : "border-line text-muted"}`}
        >
          80% interval
        </button>
      </div>

      {/* chart */}
      <div className="mt-3">
        {bundle ? (
          <ForecastChart bundle={bundle} show={show} />
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted">
            No forecast for this combination.
          </div>
        )}
      </div>

      {/* metrics */}
      {bundle && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricCard
            title="Multivariate MAPE"
            value={mape(bundle.metrics.mv.mape)}
            accent="mv"
            best={winner === "MV"}
          />
          <MetricCard
            title="Univariate MAPE"
            value={mape(bundle.metrics.uv.mape)}
            accent="uv"
            best={winner === "UV"}
          />
          <div className="rounded-xl border border-line bg-ink/40 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">MV vs UV</p>
            <p
              className={`mt-1 text-2xl font-semibold tabular ${improvement !== null && improvement >= 0 ? "text-up" : "text-down"}`}
            >
              {improvement === null
                ? "—"
                : `${improvement >= 0 ? "−" : "+"}${Math.abs(improvement).toFixed(1)}%`}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {improvement === null
                ? ""
                : improvement >= 0
                  ? "lower error with multivariate"
                  : "univariate did better here"}
            </p>
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Real {data.model} forecasts, generated offline over a {data.window}-day input
        window. MAPE = mean absolute percentage error on the realized values. Individual
        forecasts vary; the aggregate advantage of multivariate inputs is in{" "}
        <a href="#findings" className="text-accent hover:underline">
          Findings
        </a>
        .
      </p>

      <style>{`
        .select { background: var(--surface-raised); border: 1px solid var(--line-strong); color: var(--paper); border-radius: 8px; padding: 7px 10px; font-size: 13px; }
        .select:focus { outline: none; border-color: var(--accent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <div className="flex rounded-lg border border-line-strong bg-surface-raised p-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`rounded-md px-3 py-1.5 text-[13px] transition ${
              value === o.v ? "bg-accent/15 text-accent" : "text-muted hover:text-paper"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function LegendToggle({
  color,
  label,
  active,
  on,
  onClick,
  dashed,
  solid,
}: {
  color: string;
  label: string;
  active: boolean;
  on: boolean;
  onClick: () => void;
  dashed?: boolean;
  solid?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={solid}
      className={`flex items-center gap-1.5 transition ${on ? "text-paper" : "text-muted line-through"} ${solid ? "cursor-default" : ""}`}
    >
      <span
        className="inline-block h-0.5 w-4 rounded"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`
            : color,
          opacity: active ? 1 : 0.4,
        }}
      />
      {label}
    </button>
  );
}

const ACCENT = {
  mv: {
    card: "border-mv/40 bg-mv/5",
    badge: "bg-mv/15 text-mv",
    value: "text-mv",
  },
  uv: {
    card: "border-uv/40 bg-uv/5",
    badge: "bg-uv/15 text-uv",
    value: "text-uv",
  },
} as const;

function MetricCard({
  title,
  value,
  accent,
  best,
}: {
  title: string;
  value: string;
  accent: "mv" | "uv";
  best: boolean;
}) {
  const a = ACCENT[accent];
  return (
    <div className={`rounded-xl border p-4 ${best ? a.card : "border-line bg-ink/40"}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-muted">{title}</p>
        {best && (
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${a.badge}`}>
            best
          </span>
        )}
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular ${a.value}`}>{value}</p>
    </div>
  );
}
