"use client";

import { useMemo } from "react";

import type { ErrorPoint } from "@/lib/analytics";

const W = 900;
const H = 170;
const PAD = { top: 14, right: 14, bottom: 22, left: 44 };
const CUTOFF = "2023-01-01";

export function ErrorOverTime({
  points,
  activeDate,
  onPick,
}: {
  points: ErrorPoint[];
  activeDate: string;
  onPick?: (date: string) => void;
}) {
  const geom = useMemo(() => {
    const vals = points.flatMap((p) => [p.mv, p.uv]).filter((v): v is number => v !== null);
    const hi = Math.max(...vals, 0.01) * 1.1;
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (i / Math.max(1, points.length - 1)) * plotW;
    const y = (v: number) => PAD.top + (1 - v / hi) * plotH;

    const path = (sel: (p: ErrorPoint) => number | null) => {
      let d = "";
      let started = false;
      points.forEach((p, i) => {
        const v = sel(p);
        if (v === null) {
          started = false;
          return;
        }
        d += `${started ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
        started = true;
      });
      return d.trim();
    };

    const cutoffIdx = points.findIndex((p) => p.date >= CUTOFF);
    const activeIdx = points.findIndex((p) => p.date === activeDate);
    const yTicks = [0, hi / 2, hi].map((v) => ({ v, y: y(v) }));
    return { x, y, mvPath: path((p) => p.mv), uvPath: path((p) => p.uv), cutoffIdx, activeIdx, hi, yTicks };
  }, [points, activeDate]);

  return (
    <div className="w-full overflow-x-auto">
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full min-w-[560px] cursor-pointer"
      onClick={(e) => {
        if (!onPick) return;
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * W;
        const frac = (px - PAD.left) / (W - PAD.left - PAD.right);
        const idx = Math.round(frac * (points.length - 1));
        const p = points[Math.max(0, Math.min(points.length - 1, idx))];
        if (p) onPick(p.date);
      }}
    >
      {geom.yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="var(--line)" />
          <text x={PAD.left - 6} y={t.y + 3} textAnchor="end" className="fill-[var(--muted)] text-[9px] tabular">
            {(t.v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* training cutoff */}
      {geom.cutoffIdx > 0 && (
        <g>
          <line x1={geom.x(geom.cutoffIdx)} x2={geom.x(geom.cutoffIdx)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--line-strong)" strokeDasharray="2 3" />
          <text x={geom.x(geom.cutoffIdx) + 4} y={H - PAD.bottom - 4} className="fill-[var(--muted)] text-[9px]">
            ~2023 cutoff
          </text>
        </g>
      )}

      <path d={geom.uvPath} fill="none" stroke="var(--uv)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.9} />
      <path d={geom.mvPath} fill="none" stroke="var(--mv)" strokeWidth={1.75} />

      {/* active date marker */}
      {geom.activeIdx >= 0 && (
        <line x1={geom.x(geom.activeIdx)} x2={geom.x(geom.activeIdx)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--accent)" strokeWidth={1.5} opacity={0.6} />
      )}

      {/* x labels: first, mid, last */}
      {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
        <text key={i} x={geom.x(i)} y={H - 6} textAnchor="middle" className="fill-[var(--muted)] text-[9px]">
          {points[i]?.date.slice(0, 7)}
        </text>
      ))}
    </svg>
    </div>
  );
}
