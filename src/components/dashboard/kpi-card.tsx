"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

export type KpiTone = "green" | "amber" | "red" | "teal" | "orange" | "neutral";

const TONES: Record<KpiTone, { text: string; k: string }> = {
  green: { text: "text-emerald-300", k: "52 211 153" },
  amber: { text: "text-amber-300", k: "251 191 36" },
  red: { text: "text-red-400", k: "248 113 113" },
  teal: { text: "text-teal-300", k: "45 212 191" },
  orange: { text: "text-brand-orange", k: "245 130 32" },
  neutral: { text: "text-white", k: "232 238 249" },
};

interface KpiCardProps {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  tone: KpiTone;
  loading?: boolean;
}

export function KpiCard({ label, value, icon: Icon, tone, loading }: KpiCardProps) {
  const { text, k } = TONES[tone];
  const [delta, setDelta] = useState<number | null>(null);
  const [bump, setBump] = useState(false);
  const prevRef = useRef<number | undefined>(value);

  // flash + delta chip when the polled value increases
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (typeof value === "number" && typeof prev === "number" && value > prev) {
      setDelta(value - prev);
      setBump(true);
      const t1 = setTimeout(() => setBump(false), 550);
      const t2 = setTimeout(() => setDelta(null), 4000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [value]);

  return (
    <div
      className={`relative rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-[box-shadow,border-color] duration-300 ${bump ? "kpi-bump" : ""}`}
      style={{ "--k": k } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</span>
        <Icon className="h-4 w-4 flex-none text-white/30" />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        {loading ? (
          <span className="block h-7 w-16 animate-pulse rounded-md bg-white/10" />
        ) : (
          <span className={`font-mono text-[28px] font-bold leading-none tracking-tight ${text}`}>
            {typeof value === "number" ? value.toLocaleString() : "—"}
          </span>
        )}
        {delta !== null && (
          <span className={`font-mono text-[11px] font-bold ${text}`}>+{delta}</span>
        )}
      </div>
    </div>
  );
}