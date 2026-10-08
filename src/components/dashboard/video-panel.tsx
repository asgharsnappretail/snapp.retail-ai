"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, Download, Loader2, Power, Radio, RefreshCw, RotateCcw, Square,
} from "lucide-react";

import { ScannerZoneModal } from "./scanner-zone-modal";
import { useWhep, type WhepStatus } from "@/hooks/use-whep";
import { BACKEND_ORIGIN, stopStream } from "@/lib/api";
import type { LatestStats } from "@/types/api";

/** MJPEG surveillance stream — fetched directly by the browser. */
const VIDEO_FEED_URL = `${BACKEND_ORIGIN}/video-feed`;

const WHEP_PILL: Record<WhepStatus, { label: string; cls: string }> = {
  connecting: { label: "Connecting", cls: "border-amber-300/40 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]" },
  live: { label: "WHEP Live", cls: "border-emerald-300/40 bg-emerald-400/20 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.2)]" },
  reconnecting: { label: "Reconnecting", cls: "border-amber-300/40 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]" },
  offline: { label: "Offline", cls: "border-red-300/40 bg-red-500/20 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.2)]" },
};

interface VideoPanelProps {
  stats: LatestStats | null;
  onStarted?: () => void;
  onStopped?: () => void;
}

export function VideoPanel({ stats, onStarted, onStopped }: VideoPanelProps) {
  const { status, attachVideo } = useWhep();
  const [zoneOpen, setZoneOpen] = useState(false);
  const [surveillance, setSurveillance] = useState(false);
  const [session, setSession] = useState<{ session_id: string; recording_filename?: string } | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [ended, setEnded] = useState<{ download_url: string | null } | null>(null);
  const [feedNonce, setFeedNonce] = useState(0);
  const [feedError, setFeedError] = useState(false);
  const [feedReady, setFeedReady] = useState(false);

  const startedLocallyRef = useRef(false);
  const enteredAtRef = useRef(0);

  const whep = WHEP_PILL[status];
  const sessionId = session?.session_id || stats?.session_id;

  /* Auto-attach / Detach logic */
  useEffect(() => {
    if (stats?.is_streaming && !surveillance && !ended) {
      enteredAtRef.current = Date.now();
      startedLocallyRef.current = false;
      setSurveillance(true);
      setSession(null);
    } else if (
      !startedLocallyRef.current &&
      stats &&
      !stats.is_streaming &&
      surveillance &&
      !ended &&
      !stopping &&
      Date.now() - enteredAtRef.current > 10_000
    ) {
      setSurveillance(false);
      setSession(null);
      onStopped?.();
    }
  }, [stats, surveillance, ended, stopping, onStopped]);

  /* First-frame gate fallback */
  useEffect(() => {
    if (!surveillance || ended) return;
    setFeedReady(false);
    const t = setTimeout(() => setFeedReady(true), 8_000);
    return () => clearTimeout(t);
  }, [surveillance, ended, feedNonce]);

  /* MJPEG watchdog */
  useEffect(() => {
    if (!feedError) return;
    const t = setTimeout(() => {
      setFeedNonce((n) => n + 1);
      setFeedError(false);
    }, 2_000);
    return () => clearTimeout(t);
  }, [feedError]);

  function recordingUrl(filename?: string) {
    return filename ? `${BACKEND_ORIGIN}/download-recording/${filename}` : null;
  }

  async function handleStop() {
    setStopping(true);
    try {
      const res = await stopStream();
      setEnded({
        download_url: res?.download_url
          ? `${BACKEND_ORIGIN}${res.download_url}`
          : recordingUrl(session?.recording_filename),
      });
    } catch {
      setEnded({ download_url: recordingUrl(session?.recording_filename) });
    } finally {
      setStopping(false);
      setConfirmStop(false);
      onStopped?.();
    }
  }

  function backToRaw() {
    setEnded(null);
    setSession(null);
    setSurveillance(false);
    setFeedError(false);
    setFeedReady(false);
    startedLocallyRef.current = false;
  }

  function reconnectFeed() {
    setFeedNonce((n) => n + 1);
    setFeedError(false);
    onStopped?.();
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 shadow-[0_16px_48px_0_rgba(0,0,0,0.37)] backdrop-blur-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-6 py-4">
        <div className="flex items-center gap-3">
          <Radio className="h-4 w-4 text-cyan-300 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
            {surveillance ? "AI Surveillance Live" : "Live Raw Footage"}
          </span>
          <span className="rounded-full border border-white/20 border-t-white/30 bg-white/10 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-cyan-200/90 backdrop-blur-md">
            CAM 01
          </span>
        </div>

        <div className="flex items-center gap-3">
          {surveillance ? (
            <>
              <span className="hidden font-mono text-[11px] text-cyan-300/90 sm:block">
                SESSION {sessionId || "—"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200 backdrop-blur-xl shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
              <button
                type="button"
                onClick={reconnectFeed}
                title="Reconnect live feed"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 border-t-white/40 bg-white/10 text-white/80 backdrop-blur-xl transition hover:bg-white/20 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmStop(true)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/20 px-4 text-xs font-bold text-red-200 backdrop-blur-xl shadow-[0_0_20px_rgba(239,68,68,0.25)] transition hover:bg-red-500/30 hover:shadow-[0_0_28px_rgba(239,68,68,0.4)]"
              >
                <Square className="h-3.5 w-3.5" />
                Stop Surveillance
              </button>
            </>
          ) : (
            <>
              <span className={`inline-flex items-center gap-1.5 rounded-full border border-t-white/30 border-l-white/30 backdrop-blur-xl px-3 py-1 text-[10px] font-bold tracking-wider ${whep.cls}`}>
                {status !== "live" && <Loader2 className="h-3 w-3 animate-spin" />}
                {whep.label}
              </span>
              <button
                type="button"
                onClick={() => setZoneOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-300/50 border-t-cyan-200/70 bg-gradient-to-r from-cyan-500/90 via-sky-500/90 to-blue-600/90 px-5 text-xs font-bold text-white shadow-[0_8px_32px_0_rgba(14,165,233,0.35)] backdrop-blur-xl transition hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_12px_40px_0_rgba(14,165,233,0.5)] active:scale-[0.98]"
              >
                <Power className="h-4 w-4" />
                Start AI Surveillance
              </button>
            </>
          )}
        </div>
      </div>

      {/* Frame Container */}
      <div className="relative aspect-video w-full bg-black/60">
        {surveillance ? (
          ended ? (
            <div className="h-full w-full bg-black/80" />
          ) : (
            <img
              key={feedNonce}
              src={`${VIDEO_FEED_URL}?nonce=${feedNonce}`}
              alt="AI surveillance live stream"
              onLoad={() => setFeedReady(true)}
              onError={() => setFeedError(true)}
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <video ref={attachVideo} muted autoPlay playsInline className="h-full w-full object-cover" />
        )}

        {/* HUD Overlay */}
        <div className="pointer-events-none absolute inset-0">
          <i className="absolute left-3 top-3 h-4 w-4 border-l-2 border-t-2 border-cyan-300/50" />
          <i className="absolute right-3 top-3 h-4 w-4 border-r-2 border-t-2 border-cyan-300/50" />
          <i className="absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-cyan-300/50" />
          <i className="absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2 border-cyan-300/50" />
          <span className="absolute left-6 top-3.5 font-mono text-[10px] font-semibold tracking-wider text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            CAM 01 · {surveillance ? "AI FEED" : "RAW FEED"}
          </span>
          <span className="absolute right-6 top-3.5 font-mono text-[10px] font-semibold tracking-wider text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {surveillance ? (
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                REC
              </span>
            ) : stats?.is_streaming ? (
              "AI ACTIVE"
            ) : (
              "MONITOR"
            )}
          </span>
          <span className="absolute bottom-4 left-6 font-mono text-[10px] text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {stats?.video_timestamp ?? ""}
          </span>
          <span className="absolute bottom-4 right-6 font-mono text-[10px] text-white/60 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {surveillance ? "MJPEG · /video-feed" : "WebRTC · WHEP"}
          </span>
        </div>

        {/* Going-live Glass Overlay */}
        {surveillance && !ended && !feedReady && !feedError && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/60 backdrop-blur-md">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
              <p className="text-sm font-semibold text-white">
                {feedNonce > 0
                  ? "Reconnecting to AI feed…"
                  : startedLocallyRef.current
                    ? "Starting AI Surveillance…"
                    : "Connecting to AI feed…"}
              </p>
              <p className="font-mono text-xs text-white/60">
                arming detection pipeline · first frames can take a few seconds
              </p>
              {sessionId && (
                <span className="font-mono text-xs text-cyan-300">
                  SESSION {sessionId}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Reconnecting Glass Overlay */}
        {surveillance && feedError && !ended && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/70 backdrop-blur-md">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-red-300" />
              <p className="text-sm font-medium text-white/90">
                Live stream interrupted — reconnecting…
              </p>
              <p className="font-mono text-xs text-white/50">GET /video-feed · retry in 2s</p>
            </div>
          </div>
        )}

        {/* WHEP Connecting Glass Overlay */}
        {!surveillance && status !== "live" && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/60 backdrop-blur-md">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
              <p className="text-sm font-medium text-white/90">
                {status === "offline" ? "Stream offline — retrying" : "Establishing WebRTC connection…"}
              </p>
              <p className="font-mono text-xs text-white/50">cam/whep · auto-reconnect</p>
            </div>
          </div>
        )}

        {/* Confirm Stop Glass Modal */}
        {surveillance && confirmStop && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/60 backdrop-blur-lg">
            <div className="rounded-2xl border border-white/20 border-t-white/30 bg-white/10 p-6 text-center shadow-[0_16px_48px_0_rgba(0,0,0,0.4)] backdrop-blur-2xl">
              <p className="text-sm font-semibold text-white">Stop surveillance and finalize the recording?</p>
              <p className="mt-1 font-mono text-xs text-white/60">SESSION {sessionId || "—"} · POST /stop-stream</p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmStop(false)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white/90 backdrop-blur-xl transition hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={stopping}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/20 px-4 text-xs font-bold text-red-200 backdrop-blur-xl shadow-lg transition hover:bg-red-500/30"
                >
                  {stopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                  {stopping ? "Stopping…" : "Stop Now"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Ended Glass Overlay */}
        {ended && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/70 backdrop-blur-lg">
            <div className="w-[min(420px,90%)] rounded-2xl border border-white/20 border-t-white/30 bg-white/10 p-6 text-center shadow-[0_16px_48px_0_rgba(0,0,0,0.4)] backdrop-blur-2xl">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-emerald-300/40 bg-emerald-400/20 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <p className="mt-3 text-base font-semibold text-white">Session Ended</p>
              <p className="mt-1 font-mono text-xs text-white/60">SESSION {sessionId || "—"}</p>
              {ended.download_url ? (
                <a
                  href={ended.download_url}
                  download
                  className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-gradient-to-r from-cyan-500/90 via-sky-500/90 to-blue-600/90 px-4 text-xs font-bold text-white shadow-[0_8px_32px_0_rgba(14,165,233,0.35)] backdrop-blur-xl transition hover:from-cyan-400 hover:to-blue-500"
                >
                  <Download className="h-4 w-4" /> Download Recording
                </a>
              ) : (
                <p className="mt-4 text-xs text-white/60">No recording link was returned by the server.</p>
              )}
              <button
                type="button"
                onClick={backToRaw}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white/90 backdrop-blur-xl transition hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" /> Back to Raw Feed
              </button>
            </div>
          </div>
        )}
      </div>

      <ScannerZoneModal
        open={zoneOpen}
        onClose={() => setZoneOpen(false)}
        onStarted={(s) => {
          startedLocallyRef.current = true;
          enteredAtRef.current = Date.now();
          setSession(s);
          setSurveillance(true);
          setEnded(null);
          setZoneOpen(false);
          onStarted?.();
        }}
      />
    </section>
  );
}