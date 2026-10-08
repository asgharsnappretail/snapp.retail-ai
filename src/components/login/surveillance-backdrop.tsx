"use client";

import { useState } from "react";

const CCTV_STILL_URL =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1920&q=80";

export function SurveillanceBackdrop() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div aria-hidden className="fixed inset-0 overflow-hidden">
      {/* Dark Slate Base Fallback */}
      <div className="absolute inset-0 bg-slate-950" />

      {!imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={CCTV_STILL_URL}
          alt=""
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-50 saturate-[0.85]"
        />
      )}

      {/* Dark Ambient Overlay Layer */}
      <div className="absolute inset-0 bg-slate-950/65" />

      {/* Subtle Glowing Background Light Blobs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-cyan-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[140px]" />
    </div>
  );
}