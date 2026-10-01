"use client";

import { useEffect, useState } from "react";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  centerLabel: string;
  segments: DonutSegment[];
  note?: string;
}

const SIZE = 132;
const RADIUS = 52;
const STROKE = 14;
const CIRC = 2 * Math.PI * RADIUS;

export function DonutChart({ title, centerLabel, segments, note }: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const total = segments.reduce((a, s) => a + (s.value || 0), 0);

  let cumulative = 0;
  const arcs = segments.map((s) => {
    const len = total > 0 ? (s.value / total) * CIRC : 0;
    const arc = { ...s, len, offset: cumulative };
    cumulative += len;
    return arc;
  });

  return (
    <section className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">{title}</span>
        {note && <span className="font-mono text-[10px] text-white/35">{note}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        {/* donut */}
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
            {arcs.map((a, i) => (
              <circle
                key={a.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={a.color}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                style={{
                  strokeDasharray: armed ? `${a.len} ${CIRC - a.len}` : `0 ${CIRC}`,
                  strokeDashoffset: armed ? -a.offset : 0,
                  strokeWidth: active === i ? STROKE + 4 : STROKE,
                  opacity: active === null || active === i ? 1 : 0.35,
                  transition:
                    "stroke-dasharray 700ms ease-out, stroke-dashoffset 700ms ease-out, stroke-width 250ms ease, opacity 250ms ease",
                }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <span className="block font-mono text-[24px] font-bold leading-none text-white">
                {total > 0 ? total.toLocaleString() : "—"}
              </span>
              <span className="mt-1.5 block text-[8.5px] font-bold uppercase tracking-[0.18em] text-white/40">
                {centerLabel}
              </span>
            </div>
          </div>
        </div>

        {/* legend */}
        <div className="flex min-w-[180px] flex-1 flex-col gap-2.5">
          {arcs.map((a, i) => {
            const pct = total > 0 ? Math.round((a.value / total) * 100) : 0;
            return (
              <div
                key={a.label}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className={`flex cursor-default items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  active === i ? "bg-white/[0.06]" : ""
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-white/70">{a.label}</span>
                <span className="font-mono text-[15px] font-bold text-white">{(a.value || 0).toLocaleString()}</span>
                <span className="w-10 text-right font-mono text-[10.5px] font-semibold text-white/40">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}