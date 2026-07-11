import { Findings } from "@/components/findings";
import { ForecastExplorer } from "@/components/forecast-explorer";
import { researchQuestions } from "@/data/findings";

const REPO = "https://github.com/taranggoyal70/timeseries-fm";

export default function Home() {
  return (
    <div>
      {/* nav */}
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <a href="#top" className="flex items-center gap-2 font-semibold text-paper">
            <span className="grid size-6 place-items-center rounded bg-accent/15 text-accent">⌁</span>
            Chronos-2 Lab
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
            <a href="#demo" className="transition hover:text-paper">Explore</a>
            <a href="#method" className="transition hover:text-paper">Method</a>
            <a href="#findings" className="transition hover:text-paper">Findings</a>
            <a href={REPO} className="rounded-lg border border-line-strong px-3 py-1.5 text-paper transition hover:border-accent hover:text-accent">
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section id="top" className="mx-auto max-w-6xl px-6 pb-8 pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 text-xs text-muted-light">
          <span className="size-1.5 rounded-full bg-accent" />
          Time-series foundation models for finance
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] text-paper sm:text-5xl">
          Does giving a forecasting model{" "}
          <span className="text-accent">more series</span> make it more accurate?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-light">
          A study of Amazon&apos;s <strong className="text-paper">Chronos-2</strong>, a
          pretrained time-series transformer, on Magnificent-7 equities and U.S. Treasury
          rates. We compare <span className="text-uv">univariate</span> forecasts against{" "}
          <span className="text-mv">multivariate</span> ones — and let you run the real
          forecasts yourself.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#demo" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-accent/90">
            Explore forecasts →
          </a>
          <a href="#findings" className="rounded-lg border border-line-strong px-5 py-2.5 text-sm font-semibold text-paper transition hover:border-accent">
            See the results
          </a>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Stat big="−60%" label="Rates forecast error" sub="MV vs UV MAPE (4.97% vs 12.33%)" />
          <Stat big="−16%" label="Equity forecast error" sub="MV vs UV MAPE (7.06% vs 8.44%)" />
          <Stat big="17" label="Series, jointly modeled" sub="7 equities + 10 Treasury maturities" />
        </div>
      </section>

      {/* demo */}
      <section id="demo" className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Explore</p>
          <h2 className="mt-2 text-3xl font-semibold text-paper">Run a real forecast</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Pick a series, a date, and a horizon. The chart shows the realized path
            against Chronos-2&apos;s univariate and multivariate forecasts — computed
            offline with the real model, not simulated.
          </p>
        </div>
        <ForecastExplorer />
      </section>

      {/* method */}
      <section id="method" className="border-y border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Method</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold text-paper">
            Univariate vs multivariate, one foundation model
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-uv/25 bg-ink/40 p-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-uv">Univariate</span>
              <p className="mt-2 text-sm text-muted-light">
                Forecast each series from <em>its own history alone</em>. One input series
                in, one forecast out — the classic baseline.
              </p>
            </div>
            <div className="rounded-2xl border border-mv/25 bg-ink/40 p-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-mv">Multivariate</span>
              <p className="mt-2 text-sm text-muted-light">
                Feed <em>all related series together</em> (e.g. the whole yield curve) and
                let Chronos-2 attend across them. Same model, richer context.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-paper">The setup</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>• Input window <span className="text-paper tabular">n = 252</span> trading days (rolling)</li>
                <li>• Horizons <span className="text-paper tabular">m = 21</span> and <span className="text-paper tabular">63</span> days (1 &amp; 3 months)</li>
                <li>• Panels: Mag-7 equities, 10 Treasury maturities, and both combined</li>
                <li>• Metrics: MAPE (primary) and RMSE on realized values</li>
                <li>• Zero-shot: Chronos-2 is <em>not</em> fine-tuned on these series</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-paper">Research questions</h3>
              <ol className="mt-3 space-y-2 text-sm text-muted">
                {researchQuestions.map((q, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent tabular">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <Findings />

      {/* leakage */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Robustness</p>
          <h2 className="mt-2 text-3xl font-semibold text-paper">Is this just training leakage?</h2>
          <p className="mt-3 text-muted-light">
            A fair worry: maybe Chronos-2 already saw these series in pre-training. Two
            checks argue against it. If the gains were leakage, (1) MV and UV would look
            alike — they don&apos;t, and (2) forecasts <em>before</em> the ~2023 training
            cutoff would beat those after. Instead,{" "}
            <span className="text-paper">post-2023 forecasts are more accurate</span>, on
            data the model could not have seen. Suggestive, not conclusive — but the
            multivariate advantage is not an artifact.
          </p>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div>
              <p className="font-semibold text-paper">Chronos-2 Forecasting Lab</p>
              <p className="mt-1 max-w-md text-sm text-muted">
                An interactive companion to the paper &ldquo;Multivariate Forecasting with
                Foundation Models.&rdquo; Forecasts computed with the real{" "}
                <code className="text-muted-light">amazon/chronos-2</code> model.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              <a className="text-muted transition hover:text-accent" href={REPO}>Code &amp; paper</a>
              <a className="text-muted transition hover:text-accent" href="https://arxiv.org/abs/2510.15821">Chronos-2 paper</a>
              <a className="text-muted transition hover:text-accent" href="https://huggingface.co/amazon/chronos-2">Model on HF</a>
              <a className="text-muted transition hover:text-accent" href="https://fred.stlouisfed.org/">FRED data</a>
            </div>
          </div>
          <p className="mt-8 border-t border-line pt-6 text-xs text-muted">
            Research based on the Chronos-2 study by S. Das. Forecasts are illustrative and
            not investment advice. Built as an independent, open showcase.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ big, label, sub }: { big: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-5">
      <p className="text-3xl font-semibold tabular text-paper">{big}</p>
      <p className="mt-1 text-sm font-medium text-paper">{label}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  );
}
