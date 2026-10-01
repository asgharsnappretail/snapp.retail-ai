"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Cctv } from "lucide-react";

import { BrandLockup } from "./brand-lockup";
import { HelpButton } from "./help-button";
import { LoginForm } from "./login-form";
import { SurveillanceBackdrop } from "./surveillance-backdrop";
import { readSession, saveSession } from "@/lib/session";

export function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (readSession()) router.replace("/dashboard");
  }, [router]);

  useEffect(() => () => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
  }, []);

  const handleSuccess = useCallback(
    (username: string) => {
      saveSession(username);
      router.push("/dashboard");
    },
    [router]
  );

  const handleError = useCallback((message: string) => {
    setError(message);
    setShaking(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShaking(false), 650);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#03141B] px-4 py-10">
      <SurveillanceBackdrop />

      {/* GLASS PANEL — frosted translucent fill, heavy backdrop blur + saturation (refraction),
          thin distinct white stroke, inner top edge highlight */}
      <div
        className={`card-enter relative z-10 w-full max-w-[420px] rounded-2xl border border-white/50 bg-white/[0.07] px-9 pb-7 pt-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_32px_80px_-24px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-brightness-90 backdrop-saturate-150 ${
          shaking ? "shake" : ""
        }`}
      >
        {/* specular glint + frosted micro-grain — sit under the content */}
        <div aria-hidden className="glass-glint pointer-events-none absolute inset-0 rounded-2xl" />
        <div aria-hidden className="backdrop-noise pointer-events-none absolute inset-0 rounded-2xl opacity-[0.05]" />

        <div className="relative z-10">
          <div className="flex flex-col items-center text-center">
            <BrandLockup />
            <h1 className="mt-6 text-[27px] font-bold leading-tight tracking-tight text-white">
              AI Surveillance System
            </h1>
            <p className="mt-1.5 text-[13px] font-medium">
              <span className="font-semibold text-brand-orange">Snapp</span>
              <span className="font-semibold text-brand-red">Retail</span>
              <span className="mx-1.5 text-white/30">×</span>
              <span className="text-white/70">PSO</span>
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-300"
            >
              <AlertCircle className="h-4 w-4 flex-none" />
              <span>{error}</span>
            </div>
          )}

          <LoginForm onSuccess={handleSuccess} onError={handleError} onActivity={clearError} />

          {/* <div className="mt-6 border-t border-white/10 pt-4">
            <p className="flex items-center justify-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/40">
              <Cctv className="h-3.5 w-3.5" />
              <span>
                Powered by{" "}
                <span className="text-brand-orange">Snapp</span>
                <span className="text-brand-red">Retail</span>{" "}
                AI Surveillance Technology
              </span>
            </p>
          </div> */}
        </div>
      </div>

      <HelpButton />
    </main>
  );
}