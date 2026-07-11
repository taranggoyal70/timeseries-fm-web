import { key, type Bundle } from "@/lib/types";

export type WinStats = {
  total: number;
  mvWins: number;
  winRate: number;
  avgMvMape: number;
  avgUvMape: number;
  avgImprovementPct: number;
};

/** MV-vs-UV summary across every bundle at a horizon, computed from real data. */
export function winStats(
  bundles: Record<string, Bundle>,
  horizon: number,
): WinStats {
  let total = 0;
  let mvWins = 0;
  let mvSum = 0;
  let uvSum = 0;
  for (const b of Object.values(bundles)) {
    if (b.horizon !== horizon) continue;
    const mv = b.metrics.mv.mape;
    const uv = b.metrics.uv.mape;
    if (mv === null || uv === null) continue;
    total += 1;
    if (mv < uv) mvWins += 1;
    mvSum += mv;
    uvSum += uv;
  }
  const avgMv = total ? mvSum / total : 0;
  const avgUv = total ? uvSum / total : 0;
  return {
    total,
    mvWins,
    winRate: total ? mvWins / total : 0,
    avgMvMape: avgMv,
    avgUvMape: avgUv,
    avgImprovementPct: avgUv ? ((avgUv - avgMv) / avgUv) * 100 : 0,
  };
}

export type ErrorPoint = { date: string; mv: number | null; uv: number | null };

/** MV & UV MAPE over time for one series+horizon — the hypothesis, over time. */
export function errorOverTime(
  bundles: Record<string, Bundle>,
  series: string,
  horizon: number,
  dates: string[],
): ErrorPoint[] {
  return dates.map((date) => {
    const b = bundles[key(series, date, horizon)];
    return {
      date,
      mv: b?.metrics.mv.mape ?? null,
      uv: b?.metrics.uv.mape ?? null,
    };
  });
}
