"use client";

import Image from "next/image";
import { History,LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

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
  username,
  live,
  hasStats,
  lastSync,
  nextIn,
  error,
  onRefresh,
  onLogout,
}: TopbarProps) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 border-b border-white/20 border-t-white/30 bg-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-6">
        {/* Brand Section */}
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/30 border-t-white/50 bg-white/15 shadow-sm backdrop-blur-md">
            <Image
              src="/pso-logo.png"
              alt="PSO"
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          </span>
          <div className="text-[17px] font-black leading-none tracking-tight">
            <span className="text-brand-orange">Snapp</span>
            <span className="text-brand-red">Retail</span>
          </div>
          <span className="hidden pt-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-200/80 md:block">
            Intelligence
          </span>
        </div>

        {/* Right Status Controls */}
        <div className="ml-auto flex items-center gap-3">
          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-t-white/30 border-l-white/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xl ${
              live
                ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                : "border-slate-300/30 bg-slate-500/20 text-slate-300"
            }`}
          >
            {live && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            )}
            {live ? "Live" : "Idle"}
          </span>

          {/* Session Review Button */}
          <button
            type="button"
            onClick={() => router.push("/session-review")}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 border-t-white/40 bg-white/10 px-3.5 text-xs font-semibold text-white/90 backdrop-blur-xl transition hover:bg-white/20 active:scale-[0.98]"
          >
            <History className="h-4 w-4 text-cyan-300" />
            <span>Session Review</span>
          </button>

          {/* Sync Status Banner */}
          <span className="hidden sm:block">
            <span
              className={`inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-3 py-1 font-mono text-[10px] font-semibold tracking-wide text-white/80 backdrop-blur-md ${
                error && live ? "border-red-400/40 bg-red-500/20 text-red-200" : ""
              }`}
            >
              {live
                ? error
                  ? "SYNC ERROR · LAST DATA KEPT"
                  : lastSync
                    ? `SYNCED ${lastSync.toLocaleTimeString()} · NEXT ${nextIn ?? "—"}s`
                    : "SYNCING…"
                : hasStats
                  ? `FINAL · ${lastSync ? lastSync.toLocaleTimeString() : "—"}`
                  : "STANDBY · NO SESSION"}
            </span>
          </span>

          {/* User Profile Info */}
          <div className="hidden items-center gap-2.5 border-l border-white/15 pl-4 md:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-white/25 border-t-white/40 bg-white/15 text-xs font-bold text-white shadow-sm backdrop-blur-md">
              {username.slice(0, 2).toUpperCase()}
            </span>
            <div className="leading-tight">
              <div className="text-xs font-bold text-white">{username}</div>
              <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/60">
                Operator
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 border-t-white/40 bg-white/10 text-white/80 backdrop-blur-xl transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}