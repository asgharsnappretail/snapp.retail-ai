import { Archive, ScanBarcode, UserCheck, Users } from "lucide-react";
import type { LatestStats } from "@/types/api";

export function PosStatusPanel({ stats }: { stats: LatestStats | null }) {
  const drawerOpen = stats?.drawer_status === "open";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
          POS Telemetry
        </span>
        <span className={`pill ${stats?.is_streaming ? "pill-live" : "pill-idle"}`}>
          {stats?.is_streaming && <i className="pdot" />}
          {stats?.is_streaming ? "Streaming" : "Standby"}
        </span>
      </div>

      <dl className="divide-y divide-white/[0.06]">
        <div className="flex items-center justify-between py-2.5">
          <dt className="flex items-center gap-2.5 text-[12px] text-white/55">
            <Archive className="h-3.5 w-3.5 text-white/30" /> Drawer Status
          </dt>
          <dd className="pill pill-idle" style={drawerOpen ? { color: "#34D399", background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.4)" } : undefined}>
            {stats ? (drawerOpen ? "Open" : "Close") : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="flex items-center gap-2.5 text-[12px] text-white/55">
            <UserCheck className="h-3.5 w-3.5 text-white/30" /> Cashiers at POS
          </dt>
          <dd className="font-mono text-[12px] font-semibold text-white/85">
            {stats ? `${stats.cashiers_at_pos_live} / ${stats.total_no_of_cashiers}` : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="flex items-center gap-2.5 text-[12px] text-white/55">
            <Users className="h-3.5 w-3.5 text-white/30" /> Total Staff
          </dt>
          <dd className="font-mono text-[12px] font-semibold text-white/85">
            {stats ? stats.total_no_of_staff.toLocaleString() : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="flex items-center gap-2.5 text-[12px] text-white/55">
            <ScanBarcode className="h-3.5 w-3.5 text-white/30" /> Top-Item Scans
          </dt>
          <dd className="font-mono text-[12px] font-semibold text-white/85">
            {stats ? stats.transactions_with_top_items.toLocaleString() : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}