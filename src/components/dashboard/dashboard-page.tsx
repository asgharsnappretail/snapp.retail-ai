"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  // surveillance began → open the polling gate (immediate + warm-up rechecks)
  const handleStarted = useCallback(() => {
    start();
    window.setTimeout(refresh, 2_500);
    window.setTimeout(refresh, 6_000);
  }, [start, refresh]);

  // surveillance ended → close the gate, /latest-stats hits stop
  const handleStopped = useCallback(() => {
    stop();
  }, [stop]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (session === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#03141B]">
        <span className="text-[13px] text-white/50">Loading session…</span>
      </main>
    );
  }
  if (!session) return null;

  return (
    <main className="dash-bg relative min-h-screen">
      <div aria-hidden className="grid-lines pointer-events-none fixed inset-0" />

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

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-5 px-5 pb-14 pt-6">
        <VideoPanel stats={stats} onStarted={handleStarted} onStopped={handleStopped} />

        {stats === null && !live ? (
          <StatsEmptyState />
        ) : (
          <>
            <KpiGrid stats={stats} />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <ScannedVsUnscannedChart stats={stats} />
              <CashVsBankChart stats={stats} />
              <PosStatusPanel stats={stats} />
            </div>
            <PeakHoursChart stats={stats} />
          </>
        )}

        <p className="text-center font-mono text-[9.5px] tracking-[0.18em] text-white/25">
          <span className="text-brand-orange/60">SNAPP</span>
          <span className="text-brand-red/60">RETAIL</span>
        </p>
      </div>
    </main>
  );
}