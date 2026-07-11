// Aggregate results transcribed from the paper (Das, "Multivariate Forecasting
// with Foundation Models: Using Chronos-2 for Economic and Financial Forecasts").
// These are the rolling-evaluation averages across n={126,252,504,756} and
// m={21,63}, 2000–2025. The interactive demo shows live individual forecasts;
// this section reports the paper's rigorous aggregate claim.

export type SeriesResult = {
  series: string;
  label: string;
  mapeMV: number;
  mapeUV: number;
  rmseMV: number;
  rmseUV: number;
};

// Table 1 — average performance by dataset and mode.
export const aggregate = [
  { dataset: "Rates", mode: "MV", mape: 0.0497, mapeStd: 0.1673, rmse: 0.0418, rmseStd: 0.0445 },
  { dataset: "Rates", mode: "UV", mape: 0.1233, mapeStd: 0.2213, rmse: 0.1865, rmseStd: 0.1783 },
  { dataset: "Stocks", mode: "MV", mape: 0.0706, mapeStd: 0.0728, rmse: 3.9619, rmseStd: 9.044 },
  { dataset: "Stocks", mode: "UV", mape: 0.0844, mapeStd: 0.0834, rmse: 5.0395, rmseStd: 11.571 },
] as const;

// Table 2 — UV vs MV by series (within-asset-class panels).
export const ratesResults: SeriesResult[] = [
  { series: "DGS3MO", label: "3-Month", mapeMV: 0.2355, mapeUV: 0.3186, rmseMV: 0.0618, rmseUV: 0.1227 },
  { series: "DGS6MO", label: "6-Month", mapeMV: 0.0833, mapeUV: 0.177, rmseMV: 0.0455, rmseUV: 0.1257 },
  { series: "DGS1", label: "1-Year", mapeMV: 0.0572, mapeUV: 0.1326, rmseMV: 0.0454, rmseUV: 0.1424 },
  { series: "DGS2", label: "2-Year", mapeMV: 0.0334, mapeUV: 0.127, rmseMV: 0.0413, rmseUV: 0.1845 },
  { series: "DGS3", label: "3-Year", mapeMV: 0.0243, mapeUV: 0.1181, rmseMV: 0.0388, rmseUV: 0.2068 },
  { series: "DGS5", label: "5-Year", mapeMV: 0.0171, mapeUV: 0.0972, rmseMV: 0.0359, rmseUV: 0.2232 },
  { series: "DGS7", label: "7-Year", mapeMV: 0.0134, mapeUV: 0.0827, rmseMV: 0.0345, rmseUV: 0.2278 },
  { series: "DGS10", label: "10-Year", mapeMV: 0.0114, mapeUV: 0.0703, rmseMV: 0.0344, rmseUV: 0.2184 },
  { series: "DGS20", label: "20-Year", mapeMV: 0.0099, mapeUV: 0.0572, rmseMV: 0.0364, rmseUV: 0.212 },
  { series: "DGS30", label: "30-Year", mapeMV: 0.0113, mapeUV: 0.052, rmseMV: 0.0442, rmseUV: 0.2012 },
];

export const stocksResults: SeriesResult[] = [
  { series: "AAPL", label: "Apple", mapeMV: 0.0599, mapeUV: 0.072, rmseMV: 3.3016, rmseUV: 4.1563 },
  { series: "AMZN", label: "Amazon", mapeMV: 0.0567, mapeUV: 0.0707, rmseMV: 3.0825, rmseUV: 4.0517 },
  { series: "GOOGL", label: "Alphabet", mapeMV: 0.0478, mapeUV: 0.0635, rmseMV: 3.1803, rmseUV: 4.007 },
  { series: "MSFT", label: "Microsoft", mapeMV: 0.0368, mapeUV: 0.0466, rmseMV: 4.2003, rmseUV: 6.1519 },
  { series: "NFLX", label: "Netflix", mapeMV: 0.104, mapeUV: 0.1145, rmseMV: 1.7871, rmseUV: 2.0192 },
  { series: "NVDA", label: "NVIDIA", mapeMV: 0.0906, mapeUV: 0.1107, rmseMV: 1.5994, rmseUV: 1.842 },
  { series: "TSLA", label: "Tesla", mapeMV: 0.1098, mapeUV: 0.1242, rmseMV: 13.6796, rmseUV: 16.787 },
];

// Combined "world" panel (Table 3): mixing asset classes slightly degrades MV.
// Rates MAPE(MV): individual-panel vs combined-panel, to show the noise effect.
export const combinedEffect = [
  { series: "3-Month", individual: 0.2304, combined: 0.2392 },
  { series: "2-Year", individual: 0.0366, combined: 0.0392 },
  { series: "10-Year", individual: 0.0128, combined: 0.0126 },
  { series: "NVDA", individual: 0.0743, combined: 0.0761 },
  { series: "MSFT", individual: 0.0305, combined: 0.0318 },
  { series: "TSLA", individual: 0.109, combined: 0.1114 },
];

export const researchQuestions = [
  "Do multivariate (MV) inputs beat univariate (UV) ones when a foundation model forecasts both?",
  "Is the MV advantage larger for stocks or for interest rates?",
  "Does forecasting stocks and rates jointly — a small “world” model — help or hurt?",
  "Are the gains an artifact of pre-training leakage, or real?",
];
