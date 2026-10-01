import Image from "next/image";

export function BrandLockup() {
  return (
    <div className="flex items-center justify-center gap-3.5">
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 ring-1 ring-white/20">
        <Image
          src="/pso-logo.png"
          alt="PSO"
          width={96}
          height={96}
          priority
          className="h-full w-full object-contain"
        />
      </span>
      <div className="text-[24px] font-extrabold leading-none tracking-tight">
        <span className="text-brand-orange">Snapp</span>
        <span className="text-brand-red">Retail</span>
      </div>
    </div>
  );
}