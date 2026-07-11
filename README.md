# Chronos-2 Forecasting Lab

An interactive companion site to the research paper **"Multivariate Forecasting
with Foundation Models: Using Chronos-2 for Economic and Financial Forecasts."**

It lets you explore **real** [Chronos-2](https://huggingface.co/amazon/chronos-2)
forecasts of Magnificent-7 equities and U.S. Treasury rates, comparing
**univariate** (each series forecast from its own history) against
**multivariate** (related series forecast jointly) — the paper's central question.

**Research repo (data, notebooks, paper):**
https://github.com/taranggoyal70/timeseries-fm

## What's real here

The forecasts are **not simulated**. They were generated offline by running the
actual `amazon/chronos-2` model over a 252-day rolling input window for a grid of
(series × date × horizon) in both UV and MV modes, aligned against realized
values, with MAPE/RMSE computed per forecast. The results are shipped as a static
`public/forecasts.json` and served instantly — no model runs at request time
(Chronos-2 needs GPU-class inference, so precomputation keeps the site free to host).

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

## Credits

Research based on the Chronos-2 study by S. Das. Chronos-2 by Amazon Science.
Rate data from FRED; equity data from Yahoo Finance. Forecasts are illustrative
and not investment advice. Built as an independent, open showcase.
