export type Metrics = { mape: number | null; rmse: number };

export type Bundle = {
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

export type Meta = {
  generatedAt: string;
  model: string;
  window: number;
  dates: string[];
  horizons: number[];
  panels: Record<string, PanelMeta>;
};

export type PanelData = {
  panel: string;
  bundles: Record<string, Bundle>;
};

export type PanelKey = "equities" | "rates" | "world";

export function key(series: string, date: string, horizon: number): string {
  return `${series}|${date}|${horizon}`;
}

export function fmtValue(v: number, unit: "price" | "percent"): string {
  return unit === "percent" ? `${v.toFixed(2)}%` : v.toFixed(1);
}
