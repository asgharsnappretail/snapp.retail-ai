"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

export type KpiTone = "green" | "amber" | "red" | "teal" | "orange" | "neutral";

const TONES: Record<KpiTone, { text: string; bg: string; border: string; glow: string; k: string }> = {
  green: {
    text: "text-emerald-200",
    bg: "bg-emerald-400/15",
    border: "border-emerald-300/30",
    glow: "shadow-[0_0_15px_rgba(52,211,153,0.15)]",
    k: "52 211 153",
  },
  amber: {
    text: "text-amber-200",
    bg: "bg-amber-400/15",
    border: "border-amber-300/30",
    glow: "shadow-[0_0_15px_rgba(251,191,36,0.15)]",
    k: "251 191 36",
  },
  red: {
    text: "text-red-200",
    bg: "bg-red-500/15",
    border: "border-red-300/30",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    k: "239 68 68",
  },
  teal: {
    text: "text-cyan-200",
    bg: "bg-cyan-400/15",
    border: "border-cyan-300/30",
    glow: "shadow-[0_0_15px_rgba(34,211,238,0.15)]",
    k: "34 211 238",
  },
  orange: {
    text: "text-orange-200",
    bg: "bg-orange-400/15",
    border: "border-orange-300/30",
    glow: "shadow-[0_0_15px_rgba(251,146,60,0.15)]",
    k: "251 146 60",
  },
  neutral: {
    text: "text-slate-200",
    bg: "bg-slate-400/15",
    border: "border-slate-300/30",
    glow: "shadow-[0_0_15px_rgba(203,213,225,0.1)]",
    k: "203 213 225",
  },
};

interface KpiCardProps {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  tone: KpiTone;
  loading?: boolean;
}

export function KpiCard({ label, value, icon: Icon, tone, loading }: KpiCardProps) {
  const { text, bg, border, glow, k } = TONES[tone];
  const [delta, setDelta] = useState<number | null>(null);
  const [bump, setBump] = useState(false);
  const prevRef = useRef<number | undefined>(value);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (typeof value === "number" && typeof prev === "number" && value > prev) {
      setDelta(value - prev);
      setBump(true);
      const t1 = setTimeout(() => setBump(false), 550);
      const t2 = setTimeout(() => setDelta(null), 4000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [value]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] backdrop-blur-2xl transition-all duration-300 hover:bg-white/15 ${
        bump ? "scale-[1.02] border-white/60" : ""
      }`}
      style={{ "--k": k } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
          {label}
        </span>
        <div className={`grid h-7 w-7 place-items-center rounded-xl border ${border} ${bg} ${glow} backdrop-blur-md`}>
          <Icon className={`h-3.5 w-3.5 ${text}`} />
        </div>
      </div>
      <div className="mt-3">
        {loading ? (
          <span className="block h-[38px] w-24 animate-pulse rounded-xl border border-white/20 bg-white/10" />
        ) : (
          <div className="flex items-baseline gap-2 font-mono">
            <span className={`text-2xl font-black tracking-tight ${text} drop-shadow-sm`}>
              {typeof value === "number" ? value.toLocaleString() : "—"}
            </span>
            {delta !== null && (
              <span className={`text-xs font-bold ${text} opacity-80 animate-bounce`}>
                +{delta}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}