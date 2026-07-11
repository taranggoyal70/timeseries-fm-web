import {
  aggregate,
  combinedEffect,
  ratesResults,
  stocksResults,
  type SeriesResult,
} from "@/data/findings";

function pct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

function AggregateCard({ dataset }: { dataset: "Rates" | "Stocks" }) {
  const mv = aggregate.find((a) => a.dataset === dataset && a.mode === "MV")!;
  const uv = aggregate.find((a) => a.dataset === dataset && a.mode === "UV")!;
  const imp = ((uv.mape - mv.mape) / uv.mape) * 100;
  return (
    <div className="rounded-2xl border border-line-strong bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h4 className="text-lg font-semibold text-paper">{dataset}</h4>
        <span className="rounded-full bg-up/10 px-2 py-0.5 text-xs font-semibold text-up">
          −{imp.toFixed(0)}% MAPE
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <Bar label="Multivariate" value={mv.mape} max={uv.mape} color="var(--mv)" />
        <Bar label="Univariate" value={uv.mape} max={uv.mape} color="var(--uv)" />
      </div>
      <p className="mt-4 text-xs text-muted">
        Mean MAPE across all windows, horizons, and{" "}
        {dataset === "Rates" ? "10 maturities" : "7 equities"}, 2000–2025.
      </p>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-light">{label}</span>
        <span className="tabular text-paper">{pct(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink">
        <div
          className="h-full rounded-full"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

function SeriesBars({ title, rows }: { title: string; rows: SeriesResult[] }) {
  const max = Math.max(...rows.flatMap((r) => [r.mapeMV, r.mapeUV]));
  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-6">
      <h4 className="mb-4 text-sm font-semibold text-paper">{title}</h4>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.series} className="grid grid-cols-[76px_1fr] items-center gap-3">
            <span className="truncate text-xs text-muted-light" title={r.label}>
              {r.label}
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink">
                  <div className="h-full rounded-full bg-mv" style={{ width: `${(r.mapeMV / max) * 100}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-[10px] tabular text-mv">{pct(r.mapeMV)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink">
                  <div className="h-full rounded-full bg-uv" style={{ width: `${(r.mapeUV / max) * 100}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-[10px] tabular text-uv">{pct(r.mapeUV)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Findings() {
  return (
    <section id="findings" className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">Findings</p>
      <h2 className="mt-2 max-w-2xl text-3xl font-semibold text-paper">
        Multivariate inputs consistently beat univariate ones
      </h2>
      <p className="mt-3 max-w-2xl text-muted">
        Across the full rolling evaluation, feeding Chronos-2 related series together
        lowers error for every rate and every stock — with the largest gains in
        interest rates. These are the paper&apos;s aggregate numbers.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <AggregateCard dataset="Rates" />
        <AggregateCard dataset="Stocks" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <SeriesBars title="Treasury rates — MAPE by maturity" rows={ratesResults} />
        <SeriesBars title="Equities — MAPE by ticker" rows={stocksResults} />
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded bg-mv" /> Multivariate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded bg-uv" /> Univariate
        </span>
        <span>(lower is better)</span>
      </div>

      {/* combined panel */}
      <div className="mt-10 rounded-2xl border border-line bg-surface/60 p-6">
        <h4 className="text-sm font-semibold text-paper">
          But a bigger &ldquo;world&rdquo; model doesn&apos;t help
        </h4>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Forecasting stocks and rates <em>jointly</em> — a combined 17-series panel —
          slightly <em>degrades</em> accuracy versus modeling each asset class on its
          own. Cross-domain context adds noise, not signal. MAPE, individual panel vs
          combined:
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {combinedEffect.map((c) => {
            const worse = c.combined > c.individual;
            return (
              <div key={c.series} className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2 text-sm">
                <span className="text-muted-light">{c.series}</span>
                <span className="tabular text-paper">
                  {pct(c.individual)} <span className="text-muted">→</span>{" "}
                  <span className={worse ? "text-down" : "text-up"}>{pct(c.combined)}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
