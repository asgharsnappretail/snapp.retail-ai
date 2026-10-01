import { DonutChart } from "./donut-chart";
import type { LatestStats } from "@/types/api";

export function ScannedVsUnscannedChart({ stats }: { stats: LatestStats | null }) {
  const scanned = stats?.total_scanned_transactions ?? 0;
  const unscanned = stats?.total_unscanned_transactions ?? 0;
  const total = scanned + unscanned;
  const note = total > 0 ? `${((scanned / total) * 100).toFixed(1)}% SCANNED` : "—";

  return (
    <DonutChart
      title="Scanned vs Unscanned"
      centerLabel="Total Tx"
      note={note}
      segments={[
        { label: "Scanned Transactions", value: scanned, color: "#2DD4BE" },
        { label: "Unscanned Transactions", value: unscanned, color: "#FBBF24" },
      ]}
    />
  );
}