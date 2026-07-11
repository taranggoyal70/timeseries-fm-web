"use client";

import { useMemo, useState } from "react";

import type { Bundle } from "@/lib/types";

type Show = { mv: boolean; uv: boolean; band: boolean };

const W = 900;
const H = 380;
const PAD = { top: 20, right: 16, bottom: 28, left: 52 };

export function ForecastChart({ bundle, show }: { bundle: Bundle; show: Show }) {
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    const ctxN = bundle.context.length;
    const fN = bundle.actual.length;
    const total = ctxN + fN;

    // y-domain across everything visible
    const ys: number[] = [...bundle.context, ...bundle.actual];
    if (show.uv) ys.push(...bundle.uv);
    if (show.mv) ys.push(...bundle.mv);
    if (show.band) ys.push(...bundle.mvLo, ...bundle.mvHi);
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    const pad = (hi - lo) * 0.08 || 1;
    lo -= pad;
    hi += pad;

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (i / (total - 1)) * plotW;
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;

    const line = (arr: number[], offset: number) =>
      arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(offset + i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

    // context then continue into forecast start for continuity
    const ctxPath = line(bundle.context, 0);
    const startAt = ctxN - 1;
    const lastCtx = bundle.context[ctxN - 1];
    const withAnchor = (arr: number[]) => [lastCtx, ...arr];
    const actualPath = line(withAnchor(bundle.actual), startAt);
    const uvPath = line(withAnchor(bundle.uv), startAt);
    const mvPath = line(withAnchor(bundle.mv), startAt);

    const bandPts = [
      ...withAnchor(bundle.mvHi).map((v, i) => `${x(startAt + i).toFixed(1)},${y(v).toFixed(1)}`),
      ...withAnchor(bundle.mvLo)
        .map((v, i) => ({ v, i }))
        .reverse()
        .map(({ v, i }) => `${x(startAt + i).toFixed(1)},${y(v).toFixed(1)}`),
    ].join(" ");

    const ticks = 5;
    const yTicks = Array.from({ length: ticks }, (_, i) => {
      const v = lo + (i / (ticks - 1)) * (hi - lo);
      return { v, y: y(v) };
    });

    return { x, y, ctxPath, actualPath, uvPath, mvPath, bandPts, yTicks, ctxN, fN, total, forecastX0: x(ctxN - 1) };
  }, [bundle, show]);

  const fmt = (v: number) =>
    bundle.unit === "percent" ? `${v.toFixed(2)}%` : v.toFixed(1);

  // hover index in forecast region
  const hIdx = hover;
  const hoverX = hIdx !== null ? geom.x(geom.ctxN + hIdx) : null;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[640px]"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          if (px < geom.forecastX0) return setHover(null);
          const frac = (px - geom.forecastX0) / (W - PAD.right - geom.forecastX0);
          const idx = Math.round(frac * (geom.fN - 1));
          setHover(Math.max(0, Math.min(geom.fN - 1, idx)));
        }}
      >
        {/* y grid */}
        {geom.yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="var(--line)" />
            <text x={PAD.left - 8} y={t.y + 3} textAnchor="end" className="fill-[var(--muted)] text-[10px] tabular">
              {fmt(t.v)}
            </text>
          </g>
        ))}

        {/* forecast region shading */}
        <rect
          x={geom.forecastX0}
          y={PAD.top}
          width={W - PAD.right - geom.forecastX0}
          height={H - PAD.top - PAD.bottom}
          fill="rgba(34,211,238,0.04)"
        />
        <line x1={geom.forecastX0} x2={geom.forecastX0} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--line-strong)" strokeDasharray="3 3" />
        <text x={geom.forecastX0 + 6} y={PAD.top + 12} className="fill-[var(--muted)] text-[10px]">
          forecast →
        </text>

        {/* MV band */}
        {show.band && show.mv && <polygon points={geom.bandPts} fill="rgba(34,211,238,0.13)" />}

        {/* context */}
        <path d={geom.ctxPath} fill="none" stroke="var(--muted-light)" strokeWidth={1.5} opacity={0.85} />
        {/* actual */}
        <path d={geom.actualPath} fill="none" stroke="var(--actual)" strokeWidth={2} />
        {/* uv */}
        {show.uv && <path d={geom.uvPath} fill="none" stroke="var(--uv)" strokeWidth={2} strokeDasharray="5 3" />}
        {/* mv */}
        {show.mv && <path d={geom.mvPath} fill="none" stroke="var(--mv)" strokeWidth={2} />}

        {/* hover */}
        {hIdx !== null && hoverX !== null && (
          <g>
            <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--line-strong)" />
            <circle cx={hoverX} cy={geom.y(bundle.actual[hIdx])} r={3.5} fill="var(--actual)" />
            {show.mv && <circle cx={hoverX} cy={geom.y(bundle.mv[hIdx])} r={3.5} fill="var(--mv)" />}
            {show.uv && <circle cx={hoverX} cy={geom.y(bundle.uv[hIdx])} r={3.5} fill="var(--uv)" />}
          </g>
        )}
      </svg>

      {hIdx !== null && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-line-strong bg-surface-raised px-3 py-1.5 text-[11px] shadow-lg">
          <span className="text-muted">{bundle.forecastDates[hIdx]}</span>
          <span className="mx-2 text-actual">actual {fmt(bundle.actual[hIdx])}</span>
          {show.mv && <span className="mr-2 text-mv">MV {fmt(bundle.mv[hIdx])}</span>}
          {show.uv && <span className="text-uv">UV {fmt(bundle.uv[hIdx])}</span>}
        </div>
      )}
    </div>
  );
}
