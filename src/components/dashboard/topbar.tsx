"use client";

import Image from "next/image";
import { LogOut, RefreshCw } from "lucide-react";

interface TopbarProps {
  username: string;
  live: boolean;
  hasStats: boolean;
  lastSync?: Date | null;
  nextIn?: number | null;
  error?: string | null;
  onRefresh: () => void;
  onLogout: () => void;
}

export function Topbar({
  username, live, hasStats, lastSync, nextIn, error, onRefresh, onLogout,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#04141d]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 ring-1 ring-white/20">
            <Image src="/pso-logo.png" alt="PSO" width={36} height={36} className="h-full w-full object-cover" />
          </span>
          <div className="text-[17px] font-extrabold leading-none tracking-tight">
            <span className="text-brand-orange">Snapp</span>
            <span className="text-brand-red">Retail</span>
          </div>
          <span className="hidden pt-0.5 text-[9px] font-bold uppercase tracking-[0.3em] text-white/35 md:block">
            Intelligence
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className={`pill ${live ? "pill-live" : "pill-idle"}`}>
            {live && <i className="pdot" />}
            {live ? "Live" : "Idle"}
          </span>

          <button
            type="button"
            onClick={onRefresh}
            title="Check now"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <span
            className={`hidden font-mono text-[10px] tracking-wide sm:block ${
              error && live ? "text-red-400" : "text-white/40"
            }`}
          >
            {live
              ? error
                ? "SYNC ERROR · KEEPING LAST DATA"
                : lastSync
                  ? `SYNCED ${lastSync.toLocaleTimeString()} · NEXT ${nextIn ?? "—"}s`
                  : "SYNCING…"
              : hasStats
                ? `FINAL SNAPSHOT · ${lastSync ? lastSync.toLocaleTimeString() : "—"}`
                : "STANDBY · NO SESSION TODAY"}
          </span>

          <div className="hidden items-center gap-2 border-l border-white/10 pl-3 md:flex">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-[10px] font-bold text-white/70">
              {username.slice(0, 2).toUpperCase()}
            </span>
            <div className="leading-tight">
              <div className="text-[11.5px] font-semibold text-white/90">{username}</div>
              <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/35">Operator</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}