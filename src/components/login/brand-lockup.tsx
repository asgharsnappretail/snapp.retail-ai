import Image from "next/image";

export function BrandLockup() {
  return (
    <div className="flex items-center justify-center gap-3.5">
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/30 border-t-white/50 bg-white/15 shadow-sm backdrop-blur-md">
        <Image
          src="/pso-logo.png"
          alt="PSO"
          width={96}
          height={96}
          priority
          className="h-full w-full object-contain"
        />
      </span>
      <div className="text-[26px] font-black leading-none tracking-tight">
        <span className="text-brand-orange">Snapp</span>
        <span className="text-brand-red">Retail</span>
      </div>
    </div>
  );
}