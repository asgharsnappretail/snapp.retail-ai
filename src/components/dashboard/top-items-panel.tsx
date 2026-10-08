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
    <section className="rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 p-6 shadow-[0_16px_48px_0_rgba(0,0,0,0.25)] backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">
          Top Items Sold
        </span>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-black text-brand-orange shadow-sm backdrop-blur-md">
          {stats ? stats.top_items_sold.toLocaleString() : "—"}
        </span>
      </div>

      <div className="space-y-4">
        {ITEMS.map((item, i) => (
          <div key={item.key} className="flex items-center gap-3">
            <span className="w-16 text-[10px] font-bold uppercase tracking-[0.1em] text-white/60">
              {item.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full border border-white/15 bg-white/10 backdrop-blur-sm p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 shadow-[0_0_12px_rgba(245,130,32,0.5)] transition-all duration-700"
                style={{ width: `${(values[i] / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right font-mono text-xs font-bold text-white/90">
              {values[i]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}