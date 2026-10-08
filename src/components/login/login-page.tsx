"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <SurveillanceBackdrop />

      {/* Modern iOS Glassmorphic Card Container */}
      <div
        className={`relative z-10 w-full max-w-[420px] rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 px-9 pb-8 pt-10 shadow-[0_16px_48px_0_rgba(0,0,0,0.37)] backdrop-blur-2xl transition-transform duration-300 ${
          shaking ? "shake" : ""
        }`}
      >
        {/* Specular glint overlay */}
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-60" />

        <div className="relative z-10">
          <div className="flex flex-col items-center text-center">
            <BrandLockup />
            <h1 className="mt-6 text-2xl font-black tracking-tight text-white drop-shadow-sm">
              AI Surveillance System
            </h1>
            <p className="mt-1.5 text-xs font-semibold tracking-wide">
              <span className="text-brand-orange">Snapp</span>
              <span className="text-brand-red">Retail</span>
              <span className="mx-2 text-white/30">×</span>
              <span className="text-white/80">PSO</span>
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-center gap-2.5 rounded-2xl border border-red-400/30 bg-red-500/20 px-4 py-3 text-xs font-medium text-red-200 backdrop-blur-xl shadow-lg"
            >
              <AlertCircle className="h-4 w-4 flex-none text-red-300" />
              <span>{error}</span>
            </div>
          )}

          <LoginForm onSuccess={handleSuccess} onError={handleError} onActivity={clearError} />
        </div>
      </div>

      <HelpButton />
    </main>
  );
}