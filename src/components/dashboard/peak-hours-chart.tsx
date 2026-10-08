"use client";

import { useEffect, useState } from "react";
import type { LatestStats } from "@/types/api";

const DEFAULT_SLOTS = [
  "00:00 - 03:00", "03:00 - 06:00", "06:00 - 09:00", "09:00 - 12:00",
  "12:00 - 15:00", "15:00 - 18:00", "18:00 - 21:00", "21:00 - 00:00",
];

export function PeakHoursChart({ stats }: { stats: LatestStats | null }) {
  const slots = stats?.peak_hour?.slots ?? [];
  const peak = stats?.peak_hour?.peak;
  const [armed, setArmed] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const r = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const max = Math.max(1, ...slots.map((s) => s.customers ?? 0));

  return (
    <section className="h-full rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 p-6 shadow-[0_16px_48px_0_rgba(0,0,0,0.25)] backdrop-blur-2xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">
            Peak Hours · Footfall
          </span>
          <span className="rounded-full border border-amber-300/40 bg-amber-400/20 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur-xl shadow-[0_0_12px_rgba(251,191,36,0.25)]">
            PEAK {peak ? peak.label : "—"}{peak && peak.customers > 0 ? ` · ${peak.customers}` : ""}
          </span>
        </div>
        <span className="font-mono text-[10px] font-medium text-white/50">
          {stats?.peak_hour?.updated_at ?? ""}
        </span>
      </div>

      <div className="flex h-48 items-stretch gap-2 sm:gap-3">
        {DEFAULT_SLOTS.map((fallback, i) => {
          const slot = slots.find((s) => s.slot_index === i);
          const v = slot?.customers ?? 0;
          const isCur = slot?.is_current ?? false;
          const isPeak = peak?.slot_index === i && v > 0;
          const isHovered = hoveredIdx === i;
          const scale = armed ? Math.max(0.004, v / max) : 0.004;

          const fill = isPeak
            ? "bg-gradient-to-t from-amber-500 to-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
            : isCur
              ? "bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.5)]"
              : "bg-white/15";

          return (
            <div
              key={i}
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Custom Glassmorphic Floating Tooltip */}
              {isHovered && (
                <div className="pointer-events-none absolute -top-12 z-30 flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
                  <div className="whitespace-nowrap rounded-xl border border-white/30 border-t-white/50 bg-slate-900/80 px-3 py-1.5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                    <p className="font-mono text-[10px] font-bold text-cyan-200">
                      {slot?.label ?? fallback}
                    </p>
                    <p className="font-mono text-xs font-black text-white">
                      {v} <span className="text-[9px] font-medium text-white/70">customers</span>
                    </p>
                  </div>
                  {/* Subtle Tooltip Arrow */}
                  <div className="h-1.5 w-1.5 -translate-y-1 rotate-45 border-b border-r border-white/30 bg-slate-900/80" />
                </div>
              )}

              {/* Value display above bar */}
              <span
                className={`mb-1.5 font-mono text-[10px] font-black transition-colors ${
                  isPeak
                    ? "text-amber-200 drop-shadow-sm"
                    : isHovered
                      ? "text-cyan-200"
                      : "text-white/70"
                }`}
              >
                {v > 0 ? v : ""}
              </span>

              {/* Bar Container */}
              <div className="relative w-full max-w-[56px] flex-1 border-b border-white/20">
                <div
                  className={`absolute inset-0 origin-bottom rounded-t-xl transition-all duration-300 ease-out cursor-pointer ${fill} ${
                    isHovered ? "brightness-125 scale-x-105" : ""
                  }`}
                  style={{ transform: `scaleY(${scale})` }}
                />
              </div>

              {/* Time Label Below Bar */}
              <span
                className={`mt-2.5 w-full truncate text-center font-mono text-[9px] font-bold tracking-tight transition-colors ${
                  isCur
                    ? "text-cyan-300"
                    : isPeak
                      ? "text-amber-300"
                      : isHovered
                        ? "text-white"
                        : "text-white/50"
                }`}
              >
                {slot?.label ?? fallback}
              </span>
            </div>
          );
        })}
      </div>

      {!stats && (
        <p className="mt-4 text-center font-mono text-[10px] font-medium tracking-wide text-white/40">
          AWAITING FIRST /latest-stats SYNC…
        </p>
      )}
    </section>
  );
}