import type { Bundle } from "./types";

// Serialize the currently-displayed forecast horizon to CSV so users can pull
// the real Chronos-2 numbers into a notebook or spreadsheet.
export function bundleToCsv(bundle: Bundle): string {
  const header = "date,actual,multivariate,univariate,mv_lo_80,mv_hi_80";
  const cell = (v: string | number | undefined | null) =>
    v === undefined || v === null || (typeof v === "number" && Number.isNaN(v))
      ? ""
      : String(v);
  const rows = bundle.forecastDates.map((d, i) =>
    [d, bundle.actual[i], bundle.mv[i], bundle.uv[i], bundle.mvLo[i], bundle.mvHi[i]]
      .map(cell)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
