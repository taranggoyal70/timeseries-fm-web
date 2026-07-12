# Chronos-2 Forecasting Lab

This context defines the language for the interactive web companion to the Chronos-2 multivariate financial forecasting research.

## Language

**Series**:
A dated sequence of observed values for one equity or Treasury maturity.
_Avoid_: Forecast path, panel

**Panel**:
A related group of Series evaluated together: equities, rates, or the combined 17-series world panel.
_Avoid_: Chart, individual asset

**Forecast Origin**:
The historical date at which an experiment stops observing data and begins predicting future values.
_Avoid_: Page load date, dataset end date

**Lookback Window**:
The fixed number of observations supplied to Chronos-2 before a Forecast Origin.
_Avoid_: Forecast Horizon, browser range filter

**Forecast Horizon**:
The number of future trading days predicted after a Forecast Origin, currently 21 or 63 in the published grid.
_Avoid_: Lookback Window

**Univariate Forecast**:
A forecast generated from the target Series' own history.
_Avoid_: A batch of independent series labelled multivariate

**Multivariate Forecast**:
A forecast generated with the Series in a Panel represented jointly for one item so Chronos-2 can attend across them.
_Avoid_: Multiple item IDs processed in one batch

**Realized Path**:
The observed values after a Forecast Origin used to evaluate a forecast.
_Avoid_: Model output, simulated future

**Forecast Artifact**:
Precomputed, immutable JSON containing model forecasts, Realized Paths, and metrics for part of the evaluation grid.
_Avoid_: Hardcoded UI copy, request-time model inference

**Interactive Case**:
One selected Panel, Series, Forecast Origin, Forecast Horizon, and forecasting mode shown in the sandbox.
_Avoid_: Aggregate research conclusion

**Aggregate Finding**:
A conclusion computed across the full evaluation grid. An Interactive Case may illustrate it but cannot establish it alone.
_Avoid_: Single-chart anecdote, investment advice
