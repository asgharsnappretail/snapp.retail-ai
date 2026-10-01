import { DonutChart } from "./donut-chart";
import type { LatestStats } from "@/types/api";

export function CashVsBankChart({ stats }: { stats: LatestStats | null }) {
  const cash = stats?.cash_transactions ?? 0;
  const bank = stats?.bank_transactions ?? 0;
  const total = cash + bank;
  const note = total > 0 ? `${Math.round((cash / total) * 100)}% CASH` : "—";

  return (
    <DonutChart
      title="Cash vs Bank Transactions"
      centerLabel="Tender Tx"
      note={note}
      segments={[
        { label: "Cash Transactions", value: cash, color: "#34D399" },
        { label: "Bank Transactions", value: bank, color: "#22D4EE" },
      ]}
    />
  );
}