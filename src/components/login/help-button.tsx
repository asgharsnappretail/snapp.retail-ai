"use client";

import { useEffect, useRef, useState } from "react";
import { Cctv, HelpCircle, KeyRound, Server, X } from "lucide-react";

const ITEMS = [
  { icon: KeyRound, text: "Operator accounts are issued by your store administrator." },
  {
    icon: Server,
    text: (
      <>
        This terminal connects to
        <span className="text-brand-orange">snapp</span>
        <span className="text-brand-red">retail</span>
        — All rights are reserved.
      </>
    ),
  },
  { icon: Cctv, text: "For camera or POS pairing issues, contact the surveillance support desk." },
];

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[300px] rounded-xl border border-white/15 bg-[#062029]/90 p-4 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
              Operator Help
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help"
              className="grid h-6 w-6 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="space-y-2.5">
            {ITEMS.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-white/75">
                  <Icon className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-300/80" />
                  <span>{text}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Help"
        title="Help"
        className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white/85 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    </div>
  );
}