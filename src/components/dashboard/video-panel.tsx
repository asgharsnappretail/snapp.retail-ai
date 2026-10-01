"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, Download, Loader2, Power, Radio, RefreshCw, RotateCcw, Square,
} from "lucide-react";

import { ScannerZoneModal } from "./scanner-zone-modal";
import { useWhep, type WhepStatus } from "@/hooks/use-whep";
import { BACKEND_ORIGIN, stopStream } from "@/lib/api";
import type { LatestStats } from "@/types/api";

/** MJPEG surveillance stream — fetched directly by the browser.
 *  A plain <img> renders multipart/x-mixed-replace natively and needs no CORS. */
const VIDEO_FEED_URL = `${BACKEND_ORIGIN}/video-feed`;

const WHEP_PILL: Record<WhepStatus, { label: string; cls: string }> = {
  connecting: { label: "Connecting", cls: "pill-amber" },
  live: { label: "Whep Live", cls: "pill-live" },
  reconnecting: { label: "Reconnecting", cls: "pill-amber" },
  offline: { label: "Offline", cls: "pill-red" },
};

interface VideoPanelProps {
  stats: LatestStats | null;
  onStarted?: () => void;
}

export function VideoPanel({ stats, onStarted }: VideoPanelProps) {
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

  /** Ownership: true when WE started this session through the modal.
   *  Then only the Stop button / Back to Raw Feed may exit — a slow or stale
   *  /latest-stats reading can never flip the panel back on its own. */
  const startedLocallyRef = useRef(false);
  const enteredAtRef = useRef(0);

  const whep = WHEP_PILL[status];
  const sessionId = session?.session_id || stats?.session_id;

  /* Auto-attach (page refreshed mid-session / started elsewhere): jump to the
     AI feed. Auto-detach applies ONLY to attached sessions, after a 10s grace. */
  useEffect(() => {
    if (stats?.is_streaming && !surveillance && !ended) {
      enteredAtRef.current = Date.now();
      startedLocallyRef.current = false; // attached, not started here
      setSurveillance(true);
      setSession(null); // session id comes from /latest-stats
    } else if (
      !startedLocallyRef.current &&
      stats &&
      !stats.is_streaming &&
      surveillance &&
      !ended &&
      !stopping &&
      Date.now() - enteredAtRef.current > 10_000
    ) {
      setSurveillance(false); // attached session ended elsewhere
      setSession(null);
    }
  }, [stats, surveillance, ended, stopping]);

  /* First-frame gate: from the moment we enter surveillance (or reconnect),
     show the "Starting…" overlay until the MJPEG delivers its first frame. */
  useEffect(() => {
    if (!surveillance || ended) return;
    setFeedReady(false);
    const t = setTimeout(() => setFeedReady(true), 8_000); // safety fallback
    return () => clearTimeout(t);
  }, [surveillance, ended, feedNonce]);

  /* MJPEG watchdog: on stream error, reconnect with a fresh nonce after 2s. */
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
      // session may already have been stopped elsewhere — the recording exists
      setEnded({ download_url: recordingUrl(session?.recording_filename) });
    } finally {
      setStopping(false);
      setConfirmStop(false);
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
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_32px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      {/* head */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Radio className="h-4 w-4 text-teal-300" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/55">
            {surveillance ? "AI Surveillance Live" : "Live Raw Footage"}
          </span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-white/45">
            CAM 01
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {surveillance ? (
            <>
              <span className="hidden font-mono text-[10.5px] text-teal-300 sm:block">
                SESSION {sessionId || "—"}
              </span>
              <span className="pill pill-live">
                <i className="pdot" />
                Live
              </span>
              <button
                type="button"
                onClick={reconnectFeed}
                title="Reconnect live feed"
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmStop(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-4 text-[12.5px] font-bold text-red-300 transition hover:bg-red-500/20"
              >
                <Square className="h-4 w-4" />
                Stop Surveillance
              </button>
            </>
          ) : (
            <>
              <span className={`pill ${whep.cls}`}>
                {status !== "live" && <Loader2 className="h-3 w-3 animate-spin" />}
                {whep.label}
              </span>
              <button
                type="button"
                onClick={() => setZoneOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-orange px-5 text-[13px] font-bold text-[#221005] shadow-[0_10px_28px_-10px_rgba(245,130,32,0.55)] transition hover:bg-brand-orange-soft active:scale-[0.98]"
              >
                <Power className="h-4 w-4" />
                Start AI Surveillance
              </button>
            </>
          )}
        </div>
      </div>

      {/* frame */}
      <div className="relative aspect-video w-full bg-[#02090e]">
        {surveillance ? (
          ended ? (
            /* feed unmounted → browser closes the MJPEG connection →
               the backend's preview_viewers counter decrements */
            <div className="h-full w-full bg-[#02090e]" />
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

        {/* HUD */}
        <div className="pointer-events-none absolute inset-0">
          <i className="absolute left-2.5 top-2.5 h-4 w-4 border-l-2 border-t-2 border-teal-300/40" />
          <i className="absolute right-2.5 top-2.5 h-4 w-4 border-r-2 border-t-2 border-teal-300/40" />
          <i className="absolute bottom-2.5 left-2.5 h-4 w-4 border-b-2 border-l-2 border-teal-300/40" />
          <i className="absolute bottom-2.5 right-2.5 h-4 w-4 border-b-2 border-r-2 border-teal-300/40" />
          <span className="absolute left-5 top-3 font-mono text-[10px] font-semibold tracking-wider text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            CAM 01 · {surveillance ? "AI FEED" : "RAW FEED"}
          </span>
          <span className="absolute right-5 top-3 font-mono text-[10px] font-semibold tracking-wider text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            {surveillance ? (
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-[7px] w-[7px] animate-pulse rounded-full bg-red-500" />
                REC
              </span>
            ) : stats?.is_streaming ? (
              "AI ACTIVE"
            ) : (
              "MONITOR"
            )}
          </span>
          <span className="absolute bottom-3.5 left-5 font-mono text-[10px] text-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            {stats?.video_timestamp ?? ""}
          </span>
          <span className="absolute bottom-3.5 right-5 font-mono text-[10px] text-white/50 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            {surveillance ? "MJPEG · /video-feed" : "WebRTC · WHEP"}
          </span>
        </div>

        {/* going-live overlay — visible until the first MJPEG frame arrives */}
        {surveillance && !ended && !feedReady && !feedError && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#02090e]/85">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-teal-300" />
              <p className="text-[13.5px] font-semibold text-white/90">
                {feedNonce > 0
                  ? "Reconnecting to AI feed…"
                  : startedLocallyRef.current
                    ? "Starting AI Surveillance…"
                    : "Connecting to AI feed…"}
              </p>
              <p className="font-mono text-[10px] tracking-wide text-white/40">
                arming detection pipeline · first frames can take a few seconds
              </p>
              {sessionId && (
                <span className="font-mono text-[10px] tracking-wide text-teal-300/80">
                  SESSION {sessionId}
                </span>
              )}
            </div>
          </div>
        )}

        {/* MJPEG interrupted — auto-reconnecting */}
        {surveillance && feedError && !ended && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#02090e]/75 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-red-300" />
              <p className="text-[12.5px] font-medium text-white/75">
                Live stream interrupted — reconnecting…
              </p>
              <p className="font-mono text-[10px] tracking-wide text-white/35">GET /video-feed · retry in 2s</p>
            </div>
          </div>
        )}

        {/* WHEP connecting overlay — raw mode only */}
        {!surveillance && status !== "live" && (
          <div className="absolute inset-0 grid place-items-center bg-[#02090e]/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-teal-300" />
              <p className="text-[12.5px] font-medium text-white/75">
                {status === "offline" ? "Stream offline — retrying" : "Establishing WebRTC connection…"}
              </p>
              <p className="font-mono text-[10px] tracking-wide text-white/35">cam/whep · auto-reconnect</p>
            </div>
          </div>
        )}

        {/* confirm stop */}
        {surveillance && confirmStop && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-xl border border-white/10 bg-[#0A1622]/95 p-6 text-center shadow-2xl">
              <p className="text-[14px] font-semibold text-white">Stop surveillance and finalize the recording?</p>
              <p className="mt-1.5 font-mono text-[10px] text-white/40">SESSION {sessionId || "—"} · POST /stop-stream</p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmStop(false)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 text-[12.5px] font-semibold text-white/80 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={stopping}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/15 px-4 text-[12.5px] font-bold text-red-300 transition hover:bg-red-500/25"
                >
                  {stopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                  {stopping ? "Stopping…" : "Stop Now"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* session ended — recording download */}
        {ended && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/75 backdrop-blur-sm">
            <div className="w-[min(420px,90%)] rounded-xl border border-white/10 bg-[#0A1622]/95 p-6 text-center shadow-2xl">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[15px] font-semibold text-white">Session Ended</p>
              <p className="mt-1 font-mono text-[10px] text-white/40">SESSION {sessionId || "—"}</p>
              {ended.download_url ? (
                <a
                  href={ended.download_url}
                  download
                  className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-600 to-blue-600 px-4 text-[12.5px] font-bold text-white transition hover:from-cyan-500 hover:to-blue-500"
                >
                  <Download className="h-4 w-4" /> Download Recording
                </a>
              ) : (
                <p className="mt-4 text-[11.5px] text-white/45">No recording link was returned by the server.</p>
              )}
              <button
                type="button"
                onClick={backToRaw}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 text-[12.5px] font-semibold text-white/80 transition hover:bg-white/10"
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
          startedLocallyRef.current = true; // we own this session — polls can't override it
          enteredAtRef.current = Date.now();
          setSession(s);
          setSurveillance(true);
          setEnded(null);
          setZoneOpen(false);
          onStarted?.(); // immediate stats refresh (+ warm-up rechecks from the dashboard)
        }}
      />
    </section>
  );
}