import {
  Banknote, CreditCard, EyeOff, Flag, ScanLine, TriangleAlert, UserCheck, Users,
} from "lucide-react";

import { KpiCard, type KpiTone } from "./kpi-card";
import type { LatestStats } from "@/types/api";

export function KpiGrid({ stats }: { stats: LatestStats | null }) {
  const anomalies = stats
    ? (stats.SCANNED_ANAMOLIES ?? stats.SCANNED_ANOMALIES ?? 0)
    : undefined;

  const cards: { label: string; value: number | undefined; icon: typeof Users; tone: KpiTone }[] = [
    { label: "Scanned Transactions", value: stats?.total_scanned_transactions, icon: ScanLine, tone: "green" },
    { label: "Unscanned Transactions", value: stats?.total_unscanned_transactions, icon: EyeOff, tone: "amber" },
    { label: "Cash Transactions", value: stats?.cash_transactions, icon: Banknote, tone: "green" },
    { label: "Bank Transactions", value: stats?.bank_transactions, icon: CreditCard, tone: "teal" },
    { label: "Foot Fall", value: stats?.total_customers, icon: Users, tone: "neutral" },
    { label: "Live Customers", value: stats?.customers_at_pos_live, icon: UserCheck, tone: "orange" },
    { label: "Scanned Anomalies", value: anomalies, icon: TriangleAlert, tone: "amber" },
    { label: "Flagged Transactions", value: stats?.Flagged_Transactions, icon: Flag, tone: "red" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} loading={!stats} />
      ))}
    </div>
  );
}