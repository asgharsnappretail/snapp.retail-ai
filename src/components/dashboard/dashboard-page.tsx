"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { CashVsBankChart } from "./cash-bank-donut";
import { KpiGrid } from "./kpi-grid";
import { PeakHoursChart } from "./peak-hours-chart";
import { PosStatusPanel } from "./pos-status-panel";
import { ScannedVsUnscannedChart } from "./scanned-unscanned-donut";
import { StatsEmptyState } from "./stats-empty-state";
import { Topbar } from "./topbar";
import { VideoPanel } from "./video-panel";
import { useLiveStats } from "@/hooks/use-latest-stats";
import { clearSession, readSession, type Session } from "@/lib/session";

export function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | "checking">("checking");
  const { stats, live, error, lastSync, nextIn, refresh, start, stop } = useLiveStats();

  useEffect(() => {
    setSession(readSession());
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  // Surveillance began -> open polling gate
  const handleStarted = useCallback(() => {
    start();
    window.setTimeout(refresh, 2_500);
    window.setTimeout(refresh, 6_000);
  }, [start, refresh]);

  // Surveillance ended -> stop polling gate
  const handleStopped = useCallback(() => {
    stop();
  }, [stop]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (session === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 border-t-white/40 bg-white/10 p-8 shadow-[0_16px_48px_0_rgba(0,0,0,0.37)] backdrop-blur-2xl">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
          <span className="text-sm font-semibold text-white/80">Loading session…</span>
        </div>
      </main>
    );
  }
  if (!session) return null;

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* Background ambient light effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-10 left-1/3 h-[400px] w-[400px] rounded-full bg-teal-500/10 blur-[100px]" />
      </div>

      <Topbar
        username={session.username}
        live={live}
        hasStats={stats !== null}
        lastSync={lastSync}
        nextIn={nextIn}
        error={error}
        onRefresh={refresh}
        onLogout={handleLogout}
      />

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-6 pb-14 pt-6">
        <VideoPanel stats={stats} onStarted={handleStarted} onStopped={handleStopped} />

        {stats === null && !live ? (
          <StatsEmptyState />
        ) : (
          <>
            <KpiGrid stats={stats} />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              <ScannedVsUnscannedChart stats={stats} />
              <CashVsBankChart stats={stats} />
              <PosStatusPanel stats={stats} />
            </div>
            <PeakHoursChart stats={stats} />
          </>
        )}

        <p className="text-center font-mono text-[10px] font-bold tracking-[0.25em] text-white/30">
          <span className="text-brand-orange/80">SNAPP</span>
          <span className="text-brand-red/80">RETAIL</span>
        </p>
      </div>
    </main>
  );
}