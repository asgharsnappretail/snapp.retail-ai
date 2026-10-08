import { Cctv } from "lucide-react";

export function StatsEmptyState() {
  return (
    <section className="grid place-items-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-16 backdrop-blur-xl">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-teal-300/80">
          <Cctv className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-[16px] font-bold text-white">Surveillance session has not started yet </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">
          KPI telemetry, transaction breakdowns and peak-hour analytics arm the moment
          AI surveillance starts. Use the{" "}
          <span className="font-semibold text-brand-orange">Start AI Surveillance</span>{" "}
          button on the feed panel above.
        </p>
      </div>
    </section>
  );
}