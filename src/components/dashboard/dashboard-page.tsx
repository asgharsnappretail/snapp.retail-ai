"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CashVsBankChart } from "./cash-bank-donut";
import { KpiGrid } from "./kpi-grid";
import { PeakHoursChart } from "./peak-hours-chart";
import { PosStatusPanel } from "./pos-status-panel";
import { ScannedVsUnscannedChart } from "./scanned-unscanned-donut";
import { Topbar } from "./topbar";
// import { TopItemsPanel } from "./top-items-panel";
import { VideoPanel } from "./video-panel";
import { useLatestStats } from "@/hooks/use-latest-stats";
import { clearSession, readSession, type Session } from "@/lib/session";

export function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | "checking">("checking");
  
  // 2s polling while a session is streaming, 60s otherwise
  const [pollMs, setPollMs] = useState(60_000);
  const { stats, error, lastSync, nextIn, refresh } = useLatestStats(pollMs);

  useEffect(() => {
    setPollMs(stats?.is_streaming ? 2_000 : 60_000);
  }, [stats?.is_streaming]);

  useEffect(() => {
    setSession(readSession());
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  function handleSurveillanceStarted() {
    refresh();
    // /latest-stats flips is_streaming only after the backend's model warm-up
    // (~2-3s) — re-check so the 2s fast polling kicks in promptly
    window.setTimeout(refresh, 2_500);
    window.setTimeout(refresh, 6_000);
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
        sessionId={stats?.session_id}
        streaming={stats?.is_streaming}
        lastSync={lastSync}
        nextIn={nextIn}
        error={error}
        onRefresh={refresh}
        onLogout={handleLogout}
      />

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-5 px-5 pb-14 pt-6">
        <VideoPanel stats={stats} onStarted={handleSurveillanceStarted} />
        <KpiGrid stats={stats} />

                {/* transaction breakdowns — donuts + POS telemetry side by side */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ScannedVsUnscannedChart stats={stats} />
                <CashVsBankChart stats={stats} />
                <PosStatusPanel stats={stats} />
              </div>

              {/* peak hours — full width */}
              <PeakHoursChart stats={stats} />

              {/* Top Items Sold — disabled for now
              <TopItemsPanel stats={stats} />
        */}
      {/* </div> */}

      
      </div>
    </main>
  );
}