"use client";

import { useState } from "react";

// CCTV checkout still — stays sharp behind the glass panel; the panel blurs it.
// Swap the URL for any cashier / surveillance frame you prefer.
const CCTV_STILL_URL =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1920&q=80";

export function SurveillanceBackdrop() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div aria-hidden className="fixed inset-0 overflow-hidden">
      {/* deep blue-green base (offline fallback) */}
      <div className="backdrop-base absolute inset-0" />

      {!imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={CCTV_STILL_URL}
          alt=""
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-55 saturate-[0.85]"
        />
      )}

      {/* Dark overlay layer to bring down brightness */}
      <div className="absolute inset-0 bg-[#03141B]/60" />

      {/* light cinematic grade — scene remains visible & sharp */}
      <div className="backdrop-tint absolute inset-0" />
      <div className="backdrop-scanlines absolute inset-0" />
      <div className="backdrop-noise absolute inset-0 opacity-[0.04]" />
      <div className="backdrop-vignette absolute inset-0" />
    </div>
  );
}