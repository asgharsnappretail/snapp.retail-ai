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

  useEffect(() => {
    const r = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const max = Math.max(1, ...slots.map((s) => s.customers ?? 0));

  return (
    <section className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
          Peak Hours · Footfall
        </span>
        <span className="chip-peak">
          PEAK {peak ? peak.label : "—"}{peak && peak.customers > 0 ? ` · ${peak.customers}` : ""}
        </span>
        <span className="ml-auto font-mono text-[10px] text-white/35">
          {stats?.peak_hour?.updated_at ?? ""}
        </span>
      </div>

      <div className="flex h-48 items-stretch gap-2 sm:gap-3">
        {DEFAULT_SLOTS.map((fallback, i) => {
          const slot = slots.find((s) => s.slot_index === i);
          const v = slot?.customers ?? 0;
          const isCur = slot?.is_current ?? false;
          const isPeak = peak?.slot_index === i && v > 0;
          const scale = armed ? Math.max(0.004, v / max) : 0.004;

          const fill = isPeak
            ? "bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]"
            : isCur
              ? "bg-teal-400/90 shadow-[0_0_14px_rgba(45,212,191,0.35)]"
              : "bg-white/[0.09]";

          return (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className={`mb-1 font-mono text-[10px] font-bold ${isPeak ? "text-amber-300" : "text-white/55"}`}>
                {v > 0 ? v : ""}
              </span>
              <div className="relative w-full max-w-[56px] flex-1 border-b border-white/10">
                <div
                  title={slot ? `${slot.label} · ${v} customers` : fallback}
                  className={`absolute inset-0 origin-bottom rounded-t-md transition-transform duration-700 ease-out ${fill}`}
                  style={{ transform: `scaleY(${scale})` }}
                />
              </div>
              <span
                className={`mt-2 w-full truncate text-center font-mono text-[8.5px] tracking-tight ${
                  isCur ? "text-teal-300" : isPeak ? "text-amber-300/80" : "text-white/30"
                }`}
              >
                {slot?.label ?? fallback}
              </span>
            </div>
          );
        })}
      </div>

      {!stats && (
        <p className="mt-4 text-center font-mono text-[10px] tracking-wide text-white/30">
          AWAITING FIRST /latest-stats SYNC…
        </p>
      )}
    </section>
  );
}