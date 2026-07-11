export type Metrics = { mape: number | null; rmse: number };

export type Bundle = {
  dataset: "stocks" | "rates";
  series: string;
  label: string;
  unit: "price" | "percent";
  date: string;
  horizon: number;
  contextDates: string[];
  context: number[];
  forecastDates: string[];
  actual: number[];
  uv: number[];
  mv: number[];
  mvLo: number[];
  mvHi: number[];
  metrics: { uv: Metrics; mv: Metrics };
};

export type PanelMeta = {
  series: string[];
  labels: Record<string, string>;
  unit: string;
};

export type ForecastData = {
  generatedAt: string;
  model: string;
  window: number;
  dates: string[];
  horizons: number[];
  panels: { stocks: PanelMeta; rates: PanelMeta };
  bundles: Record<string, Bundle>;
};

export function bundleKey(
  dataset: string,
  series: string,
  date: string,
  horizon: number,
): string {
  return `${dataset}|${series}|${date}|${horizon}`;
}
