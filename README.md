# Chronos-2 Forecasting Lab

An interactive companion site to the research paper **"Multivariate Financial
Forecasting using the Chronos Time Series Foundation Models"** (Das, Goyal, Yadav),
https://arxiv.org/abs/2605.21504.

It lets you explore **real** [Chronos-2](https://huggingface.co/amazon/chronos-2)
forecasts of Magnificent-7 equities and U.S. Treasury rates, comparing
**univariate** (each series forecast from its own history) against
**multivariate** (related series forecast jointly) — the paper's central question.

**Research repo (data, notebooks, paper):**
https://github.com/taranggoyal70/timeseries-fm

## What's real here

The forecasts are **not simulated** and nothing is hardcoded. They were generated
offline by running the actual `amazon/chronos-2` model over a 252-day rolling input
window for a large grid — **~90 monthly dates (2018–2025) × three panels (equities,
rates, and a combined 17-series "world") × horizons 21 & 63 × UV and MV** — aligned
against realized values, with MAPE/RMSE computed per forecast. Results ship as static
per-panel JSON (`public/fc/`, lazy-loaded, gzip-served) — no model runs at request
time (Chronos-2 needs GPU-class inference, so precomputation keeps the site free to host).

The sandbox lets you **scrub through a decade** of forecasts, watch UV vs MV error
diverge over time, and see win-rate / mean improvement **computed live in the browser
from the real grid** — not transcribed. No `localStorage`, cookies, or mock data.

- **Univariate:** one series in, one forecast out.
- **Multivariate:** the whole panel in (e.g. all 10 Treasury maturities), with
  Chronos-2 attending across series. In Chronos-2's API this means a single
  `item_id` with multiple `target` columns — not multiple item_ids (which is just
  batched univariate).

The **Findings** section reports the paper's rigorous aggregate result across the
full rolling evaluation, where multivariate consistently wins (especially rates).
The interactive demo shows individual forecasts, which vary case by case.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Custom inline-SVG charts (no chart library)
- Static forecast data precomputed with Python + `chronos-forecasting` + PyTorch
- Deployed on Vercel

## Regenerating the forecast data

`scripts_precompute_forecasts.py` documents how `public/forecasts.json` was
produced. It runs inside the research repo (it imports that repo's `data_loader`)
with `torch` + `chronos-forecasting` installed, then the JSON is copied here.

## Local development

```bash
pnpm install
pnpm dev
```

## Paper & credits

Paper: **Multivariate Financial Forecasting using the Chronos Time Series
Foundation Models** by Sanjiv Das, Tarang Goyal, and Mohini Yadav —
https://arxiv.org/abs/2605.21504

Chronos-2 by Amazon Science. Rate data from FRED; equity data from Yahoo Finance.
Forecasts are illustrative and not investment advice.
