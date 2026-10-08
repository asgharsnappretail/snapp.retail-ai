import { Cctv } from "lucide-react";

export function StatsEmptyState() {
  return (
    <section className="grid place-items-center rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 px-6 py-16 shadow-[0_16px_48px_0_rgba(0,0,0,0.25)] backdrop-blur-2xl">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-white/30 border-t-white/50 bg-white/15 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.25)] backdrop-blur-xl">
          <Cctv className="h-7 w-7" />
        </span>
        <h2 className="mt-6 text-lg font-bold tracking-tight text-white drop-shadow-sm">
          Surveillance session has not started yet
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-white/70">
          KPI telemetry, transaction breakdowns, and peak-hour analytics arm the moment
          AI surveillance starts. Use the{" "}
          <span className="font-bold text-brand-orange">Start AI Surveillance</span>{" "}
          button on the feed panel above.
        </p>
      </div>
    </section>
  );
}