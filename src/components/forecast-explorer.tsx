"use client";

import { useEffect, useMemo, useState } from "react";

import { ErrorOverTime } from "@/components/error-over-time";
import { ForecastChart } from "@/components/forecast-chart";
import { errorOverTime, winStats } from "@/lib/analytics";
import { key, type Bundle, type Meta, type PanelData, type PanelKey } from "@/lib/types";

const PANELS: { k: PanelKey; l: string; hint: string }[] = [
  { k: "equities", l: "Equities", hint: "7 Mag-7 stocks" },
  { k: "rates", l: "Treasury rates", hint: "10 maturities" },
  { k: "world", l: "World (17)", hint: "stocks + rates together" },
];

export function ForecastExplorer() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [panels, setPanels] = useState<Record<string, PanelData>>({});
  const [error, setError] = useState(false);

  const [panel, setPanel] = useState<PanelKey>("equities");
  const [series, setSeries] = useState("NVDA");
  const [dateIdx, setDateIdx] = useState(0);
  const [horizon, setHorizon] = useState(21);
  const [show, setShow] = useState({ mv: true, uv: true, band: true });

  // meta first
  useEffect(() => {
    fetch("/fc/meta.json")
      .then((r) => r.json())
      .then((m: Meta) => {
        setMeta(m);
        setDateIdx(m.dates.length - 1);
      })
      .catch(() => setError(true));
  }, []);

  // lazy-load the active panel
  useEffect(() => {
    if (panels[panel]) return;
    fetch(`/fc/forecasts_${panel}.json`)
      .then((r) => r.json())
      .then((d: PanelData) => setPanels((p) => ({ ...p, [panel]: d })))
      .catch(() => setError(true));
  }, [panel, panels]);

  const pmeta = meta?.panels[panel];
  const pdata = panels[panel];
  const dates = useMemo(() => meta?.dates ?? [], [meta]);
  const date = dates[dateIdx] ?? "";

  function changePanel(next: PanelKey) {
    setPanel(next);
    const first = meta?.panels[next]?.series[0];
    if (first) setSeries(first);
  }

  const bundle: Bundle | null = useMemo(() => {
    if (!pdata) return null;
    return pdata.bundles[key(series, date, horizon)] ?? null;
  }, [pdata, series, date, horizon]);

  const stats = useMemo(
    () => (pdata ? winStats(pdata.bundles, horizon) : null),
    [pdata, horizon],
  );
  const errPoints = useMemo(
    () => (pdata ? errorOverTime(pdata.bundles, series, horizon, dates) : []),
    [pdata, series, horizon, dates],
  );

  if (error) {
    return <Shell>Could not load forecast data.</Shell>;
  }
  if (!meta || !pmeta) {
    return <Shell>Loading real Chronos-2 forecasts…</Shell>;
  }

  const mape = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(2)}%`);
  const improvement =
    bundle && bundle.metrics.mv.mape !== null && bundle.metrics.uv.mape !== null
      ? ((bundle.metrics.uv.mape - bundle.metrics.mv.mape) / bundle.metrics.uv.mape) * 100
      : null;
  const winner =
    bundle && bundle.metrics.mv.mape !== null && bundle.metrics.uv.mape !== null
      ? bundle.metrics.mv.mape < bundle.metrics.uv.mape
        ? "MV"
        : "UV"
      : null;

  return (
    <div className="rounded-2xl border border-line-strong bg-surface/70 p-4 backdrop-blur sm:p-6">
      {/* controls row 1 */}
      <div className="flex flex-wrap items-end gap-4">
        <Toggle
          label="Panel"
          value={panel}
          options={PANELS.map((p) => ({ v: p.k, l: p.l }))}
          onChange={(v) => changePanel(v as PanelKey)}
        />
        <Field label="Series">
          <select value={series} onChange={(e) => setSeries(e.target.value)} className="select">
            {pmeta.series.map((s) => (
              <option key={s} value={s}>
                {pmeta.labels[s] ?? s} ({s})
              </option>
            ))}
          </select>
        </Field>
        <Toggle
          label="Horizon"
          value={String(horizon)}
          options={meta.horizons.map((h) => ({ v: String(h), l: `${h}d` }))}
          onChange={(v) => setHorizon(Number(v))}
        />
      </div>

      {/* date scrubber */}
      <div className="mt-4 rounded-xl border border-line bg-ink/40 p-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="uppercase tracking-wide text-muted">Forecast date</span>
          <span className="tabular text-paper">{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <StepButton onClick={() => setDateIdx((i) => Math.max(0, i - 1))} disabled={dateIdx === 0}>
            ‹
          </StepButton>
          <input
            type="range"
            min={0}
            max={dates.length - 1}
            value={dateIdx}
            onChange={(e) => setDateIdx(Number(e.target.value))}
            className="range flex-1"
          />
          <StepButton onClick={() => setDateIdx((i) => Math.min(dates.length - 1, i + 1))} disabled={dateIdx === dates.length - 1}>
            ›
          </StepButton>
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>{dates[0]}</span>
          <span>drag to scrub through time · {dates.length} months</span>
          <span>{dates[dates.length - 1]}</span>
        </div>
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <LegendToggle color="var(--actual)" label="Actual" on solid onClick={() => {}} />
        <LegendToggle color="var(--mv)" label="Multivariate" on={show.mv} onClick={() => setShow((s) => ({ ...s, mv: !s.mv }))} />
        <LegendToggle color="var(--uv)" label="Univariate" on={show.uv} dashed onClick={() => setShow((s) => ({ ...s, uv: !s.uv }))} />
        <button
          onClick={() => setShow((s) => ({ ...s, band: !s.band }))}
          className={`ml-auto rounded-md border px-2 py-1 transition ${show.band ? "border-mv/40 text-mv" : "border-line text-muted"}`}
        >
          80% interval
        </button>
      </div>

      {/* main chart */}
      <div className="mt-3">
        {bundle ? (
          <ForecastChart bundle={bundle} show={show} />
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted">
            {pdata ? "No forecast for this combination." : "Loading panel…"}
          </div>
        )}
      </div>

      {/* metrics */}
      {bundle && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricCard title="Multivariate MAPE" value={mape(bundle.metrics.mv.mape)} accent="mv" best={winner === "MV"} />
          <MetricCard title="Univariate MAPE" value={mape(bundle.metrics.uv.mape)} accent="uv" best={winner === "UV"} />
          <div className="rounded-xl border border-line bg-ink/40 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">MV vs UV here</p>
            <p className={`mt-1 text-2xl font-semibold tabular ${improvement !== null && improvement >= 0 ? "text-up" : "text-down"}`}>
              {improvement === null ? "—" : `${improvement >= 0 ? "−" : "+"}${Math.abs(improvement).toFixed(1)}%`}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {improvement === null ? "" : improvement >= 0 ? "lower error with multivariate" : "univariate won this one"}
            </p>
          </div>
        </div>
      )}

      {/* error over time */}
      <div className="mt-6 rounded-xl border border-line bg-ink/30 p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Forecast error over time — {pmeta.labels[series] ?? series}, {horizon}-day
          </p>
          <span className="text-[10px] text-muted">click to jump to a date</span>
        </div>
        {pdata ? (
          <ErrorOverTime points={errPoints} activeDate={date} onPick={(d) => setDateIdx(dates.indexOf(d))} />
        ) : (
          <div className="h-[120px]" />
        )}
      </div>

      {/* panel-wide analytics computed live from the grid */}
      {stats && stats.total > 0 && (
        <div className="mt-4 rounded-xl border border-line-strong bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Across this whole panel · {horizon}-day · {stats.total} forecasts
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Analytic big={`${(stats.winRate * 100).toFixed(0)}%`} label="of forecasts, MV beats UV" sub={`${stats.mvWins} of ${stats.total}`} />
            <Analytic
              big={`${stats.avgImprovementPct >= 0 ? "−" : "+"}${Math.abs(stats.avgImprovementPct).toFixed(1)}%`}
              label={stats.avgImprovementPct >= 0 ? "mean MAPE reduction (MV)" : "mean MAPE increase (MV)"}
              sub={`MV ${(stats.avgMvMape * 100).toFixed(2)}% vs UV ${(stats.avgUvMape * 100).toFixed(2)}%`}
              good={stats.avgImprovementPct >= 0}
            />
            <Analytic big={`${(stats.avgMvMape * 100).toFixed(2)}%`} label="mean multivariate MAPE" sub="realized, this panel" />
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Computed live in your browser from the real forecast grid — not transcribed. This
            is a single-window (n=252), monthly subset, so the edge is smaller and noisier than
            the paper&apos;s full multi-window rolling average in{" "}
            <a href="#findings" className="text-accent hover:underline">Findings</a>.
          </p>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Real {meta.model} forecasts over a {meta.window}-day input window, precomputed
        offline. Individual forecasts vary; the aggregate advantage is summarized above and
        in the paper&apos;s full rolling evaluation.
      </p>

      <style>{`
        .select { background: var(--surface-raised); border: 1px solid var(--line-strong); color: var(--paper); border-radius: 8px; padding: 7px 10px; font-size: 13px; }
        .select:focus { outline: none; border-color: var(--accent); }
        .range { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 999px; background: var(--line-strong); }
        .range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--accent); cursor: pointer; box-shadow: 0 0 0 4px rgba(34,211,238,0.15); }
        .range::-moz-range-thumb { width: 16px; height: 16px; border: none; border-radius: 50%; background: var(--accent); cursor: pointer; }
      `}</style>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

function StepButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="grid size-7 shrink-0 place-items-center rounded-md border border-line-strong text-muted-light transition hover:text-paper disabled:opacity-30"
    >
      {children}
    </button>
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
  on,
  onClick,
  dashed,
  solid,
}: {
  color: string;
  label: string;
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
          opacity: on ? 1 : 0.4,
        }}
      />
      {label}
    </button>
  );
}

const ACCENT = {
  mv: { card: "border-mv/40 bg-mv/5", badge: "bg-mv/15 text-mv", value: "text-mv" },
  uv: { card: "border-uv/40 bg-uv/5", badge: "bg-uv/15 text-uv", value: "text-uv" },
} as const;

function MetricCard({ title, value, accent, best }: { title: string; value: string; accent: "mv" | "uv"; best: boolean }) {
  const a = ACCENT[accent];
  return (
    <div className={`rounded-xl border p-4 ${best ? a.card : "border-line bg-ink/40"}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-muted">{title}</p>
        {best && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${a.badge}`}>best</span>}
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular ${a.value}`}>{value}</p>
    </div>
  );
}

function Analytic({ big, label, sub, good }: { big: string; label: string; sub: string; good?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-ink/40 p-3">
      <p className={`text-2xl font-semibold tabular ${good ? "text-up" : "text-paper"}`}>{big}</p>
      <p className="mt-0.5 text-xs text-muted-light">{label}</p>
      <p className="text-[10px] text-muted">{sub}</p>
    </div>
  );
}
