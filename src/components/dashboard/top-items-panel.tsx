import type { LatestStats } from "@/types/api";

const ITEMS = [
  { key: "pepsi", label: "Pepsi" },
  { key: "redbull", label: "Red Bull" },
  { key: "juice", label: "Juice" },
  { key: "prime", label: "Prime" },
] as const;

export function TopItemsPanel({ stats }: { stats: LatestStats | null }) {
  const values = ITEMS.map((i) => (stats?.[i.key] as number | undefined) ?? 0);
  const max = Math.max(1, ...values);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
          Top Items Sold
        </span>
        <span className="font-mono text-[11px] font-bold text-brand-orange">
          {stats ? stats.top_items_sold.toLocaleString() : "—"}
        </span>
      </div>

      <div className="space-y-3">
        {ITEMS.map((item, i) => (
          <div key={item.key} className="flex items-center gap-3">
            <span className="w-16 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">
              {item.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-brand-orange/80 transition-all duration-700"
                style={{ width: `${(values[i] / max) * 100}%` }}
              />
            </div>
            <span className="w-7 text-right font-mono text-[11px] font-bold text-white/70">{values[i]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}