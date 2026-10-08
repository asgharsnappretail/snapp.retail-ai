"use client";

import {
  useEffect, useRef, useState,
  type MouseEvent as ReactMouseEvent, type ReactNode,
} from "react";
import {
  Info, Loader2, MapPinned, Pencil, Play, RefreshCw, Save, Trash2, Undo2, X,
} from "lucide-react";

import { ApiError, getZoneSnapshot, saveZone, startStream } from "@/lib/api";
import type { ZonePolygon, ZoneSnapshot } from "@/types/api";

type Pt = [number, number];
type Phase = "loading" | "connecting" | "error" | "preview" | "drawing" | "confirmed";

interface ScannerZoneModalProps {
  open: boolean;
  onClose: () => void;
  onStarted: (session: { session_id: string; recording_filename?: string }) => void;
}

const PHASE_PILL: Record<Phase, { label: string; cls: string }> = {
  loading:    { label: "LOADING",    cls: "border-amber-300/40 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]" },
  connecting: { label: "CONNECTING", cls: "border-amber-300/40 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]" },
  error:      { label: "ERROR",      cls: "border-red-300/40 bg-red-500/20 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.2)]" },
  preview:    { label: "READY",      cls: "border-emerald-300/40 bg-emerald-400/20 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.2)]" },
  drawing:    { label: "DRAWING",    cls: "border-sky-300/40 bg-sky-400/20 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.25)]" },
  confirmed:  { label: "READY",      cls: "border-emerald-300/40 bg-emerald-400/20 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.2)]" },
};

/* ---------- geometry helpers — mirror backend validation ---------- */
function cross(o: Pt, a: Pt, b: Pt): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
function shoelaceArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}
function validatePolygon(pts: Pt[]): string | null {
  if (pts.length < 3) return "At least 3 points required";
  if (pts.length > 32) return "Maximum 32 points allowed";
  let pos = 0, neg = 0;
  for (let i = 0; i < pts.length; i++) {
    const c = cross(pts[i], pts[(i + 1) % pts.length], pts[(i + 2) % pts.length]);
    if (c > 0) pos++;
    else if (c < 0) neg++;
  }
  if (pos > 0 && neg > 0) return "Polygon must be convex (no inward notches)";
  if (shoelaceArea(pts) < 50) return "Zone area too small (minimum 50 px²)";
  return null;
}

/* ---------- Glassmorphic Buttons ---------- */
function GhostBtn({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 px-4 text-xs font-semibold text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] backdrop-blur-xl transition hover:bg-white/20 hover:border-white/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-300/50 border-t-cyan-200/70 bg-gradient-to-r from-cyan-500/80 via-sky-500/80 to-blue-600/80 px-5 text-xs font-bold text-white shadow-[0_8px_32px_0_rgba(14,165,233,0.35)] backdrop-blur-xl transition hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_12px_40px_0_rgba(14,165,233,0.5)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

export function ScannerZoneModal({ open, onClose, onStarted }: ScannerZoneModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [snap, setSnap] = useState<ZoneSnapshot | null>(null);
  const [zone, setZone] = useState<ZonePolygon | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [hover, setHover] = useState<Pt | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const svgRef = useRef<SVGSVGElement | null>(null);

  /* Fetch snapshot on open with retry mechanism */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    setPhase("loading");
    setSnap(null); setZone(null); setUpdatedAt(null);
    setPoints([]); setHover(null);
    setFormError(null); setLoadError(null);
    setSaving(false); setStarting(false); setRetryAttempt(0);

    const attempt = async () => {
      setPhase(attempts === 0 ? "loading" : "connecting");
      try {
        const s = await getZoneSnapshot();
        if (cancelled) return;
        setSnap(s);
        setZone(s.polygon && s.polygon.length >= 3 ? s.polygon : null);
        setUpdatedAt(s.updated_at ?? null);
        setPhase("preview");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 503 && attempts < 3) {
          attempts += 1;
          setRetryAttempt(attempts);
          timer = setTimeout(attempt, 3000);
        } else {
          setLoadError(err instanceof Error ? err.message : "Failed to load snapshot");
          setPhase("error");
        }
      }
    };

    attempt();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [open, reloadKey]);

  /* Keyboard ESC handling */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (phase === "drawing") cancelDrawing();
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onClose]);

  /* Map click coordinates to natural snapshot pixel resolution */
  function toNatural(e: ReactMouseEvent<SVGSVGElement>): Pt {
    const svg = svgRef.current;
    if (!svg || !snap) return [0, 0];
    const r = svg.getBoundingClientRect();
    const s = Math.min(r.width / snap.width, r.height / snap.height);
    const ox = (r.width - snap.width * s) / 2;
    const oy = (r.height - snap.height * s) / 2;
    const x = Math.round((e.clientX - r.left - ox) / s);
    const y = Math.round((e.clientY - r.top - oy) / s);
    return [Math.max(0, Math.min(snap.width, x)), Math.max(0, Math.min(snap.height, y))];
  }

  function handleSvgClick(e: ReactMouseEvent<SVGSVGElement>) {
    if (phase !== "drawing" || !snap) return;
    if (points.length >= 32) { setFormError("Maximum 32 points reached"); return; }
    setPoints((p) => [...p, toNatural(e)]);
    setFormError(null);
  }

  function handleSvgMove(e: ReactMouseEvent<SVGSVGElement>) {
    if (phase !== "drawing") return;
    setHover(toNatural(e));
  }

  function startDrawing() {
    setPoints([]); setHover(null); setFormError(null);
    setPhase("drawing");
  }

  function cancelDrawing() {
    setPoints([]); setHover(null); setFormError(null);
    setPhase("preview");
  }

  function handleUsePrevious() {
    if (!snap?.polygon || snap.polygon.length < 3) return;
    setZone(snap.polygon);
    setUpdatedAt(snap.updated_at ?? null);
    setFormError(null);
    setPhase("confirmed");
  }

  async function handleSave() {
    if (!snap) return;
    const problem = validatePolygon(points);
    if (problem) { setFormError(problem); return; }
    setSaving(true);
    setFormError(null);
    try {
      const res = await saveZone(points);
      setZone(res.polygon && res.polygon.length >= 3 ? res.polygon : points);
      setUpdatedAt(res.updated_at ?? null);
      setPoints([]);
      setHover(null);
      setPhase("confirmed");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save zone");
    } finally {
      setSaving(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    setFormError(null);
    try {
      const res = await startStream();
      onStarted({ session_id: res.session_id, recording_filename: res.recording_filename });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        onStarted({ session_id: "" });
      } else {
        setFormError(err instanceof Error ? err.message : "Failed to start surveillance");
        setStarting(false);
      }
    }
  }

  if (!open) return null;

  const pill = PHASE_PILL[phase];
  const k = snap ? snap.width / 900 : 1;
  const ptsAttr = (pts: Pt[]) => pts.map((p) => `${p[0]},${p[1]}`).join(" ");
  const drawProblem = phase === "drawing" ? validatePolygon(points) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-md">
      {/* iOS Glassmorphism Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scanner zone setup"
        className="my-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 shadow-[0_16px_48px_0_rgba(0,0,0,0.37)] backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/15 px-6 py-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-200/80">ZONE SETUP</span>
            <h2 className="mt-0.5 text-xl font-bold tracking-tight text-white drop-shadow-sm">Scanner Zone Setup</h2>
            <p className="mt-1 font-mono text-[11px] text-white/70">
              Snapshot → choose / draw → save → start surveillance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border border-t-white/30 border-l-white/30 backdrop-blur-xl px-3 py-1 text-[10px] font-bold tracking-wider ${pill.cls}`}>
              {(phase === "loading" || phase === "connecting") && <Loader2 className="h-3 w-3 animate-spin" />}
              {pill.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 text-white/80 backdrop-blur-xl transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {phase === "loading" || phase === "connecting" ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
              <p className="text-sm font-medium text-white">
                {phase === "loading" ? "Fetching camera snapshot…" : "Connecting to camera…"}
              </p>
              <p className="font-mono text-xs text-white/60">
                {phase === "connecting"
                  ? `retry ${retryAttempt}/3 · pre-warming RTSP feed`
                  : "GET /scanner-zone/snapshot"}
              </p>
            </div>
          ) : phase === "error" ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl border border-red-400/20 bg-red-500/10 backdrop-blur-xl">
              <p className="max-w-md px-6 text-center text-sm font-medium text-red-200">{loadError}</p>
              <PrimaryBtn onClick={() => setReloadKey((n) => n + 1)}>
                <RefreshCw className="h-4 w-4" /> Retry Connection
              </PrimaryBtn>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-white/20 border-t-white/30 border-l-white/30 bg-black/40 shadow-2xl backdrop-blur-md">
              <div
                className="relative w-full select-none"
                style={{ aspectRatio: snap ? `${snap.width} / ${snap.height}` : "16 / 9" }}
              >
                {/* Frame Image */}
                <img
                  src={snap?.image}
                  alt="Camera snapshot"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
                  style={{ opacity: phase === "drawing" ? 1 : 0.7 }}
                />

                {/* SVG Drawing Canvas Layer */}
                <svg
                  ref={svgRef}
                  viewBox={snap ? `0 0 ${snap.width} ${snap.height}` : undefined}
                  preserveAspectRatio="xMidYMid meet"
                  className={`absolute inset-0 h-full w-full ${phase === "drawing" ? "cursor-crosshair" : "pointer-events-none"}`}
                  onClick={handleSvgClick}
                  onMouseMove={handleSvgMove}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* Active or Saved Polygon Layer */}
                  {phase !== "drawing" && zone && zone.length >= 3 && (
                    <g style={{ filter: "drop-shadow(0 0 16px rgba(56,189,248,0.6))" }}>
                      <polygon
                        points={ptsAttr(zone)}
                        fill="rgba(56, 189, 248, 0.25)"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                      />
                      {zone.map((p, i) => (
                        <g key={i} style={{ pointerEvents: "none" }}>
                          <circle
                            cx={p[0]} cy={p[1]} r={6 * k}
                            fill="#0c4a6e" stroke="#38bdf8" strokeWidth={2 * k}
                            style={{ filter: "drop-shadow(0 0 10px rgba(56,189,248,1))" }}
                          />
                          {/* Glass Node Tag */}
                          <rect
                            x={p[0] + 8 * k}
                            y={p[1] - 18 * k}
                            width={56 * k}
                            height={16 * k}
                            rx={4 * k}
                            fill="rgba(15, 23, 42, 0.75)"
                            stroke="rgba(255, 255, 255, 0.3)"
                            strokeWidth={1 * k}
                          />
                          <text
                            x={p[0] + 36 * k}
                            y={p[1] - 6 * k}
                            textAnchor="middle"
                            fontSize={8 * k}
                            fontWeight={600}
                            fill="#7dd3fc"
                            style={{ fontFamily: "var(--font-plex-mono), monospace" }}
                          >
                            [{p[0]}, {p[1]}]
                          </text>
                        </g>
                      ))}
                    </g>
                  )}

                  {/* Active Point Plotting Layer */}
                  {phase === "drawing" && (
                    <g>
                      {points.length >= 3 && (
                        <polygon
                          points={ptsAttr(points)}
                          fill="rgba(56, 189, 248, 0.2)"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                      {points.length >= 1 && hover && (
                        <line
                          x1={points[points.length - 1][0]}
                          y1={points[points.length - 1][1]}
                          x2={hover[0]} y2={hover[1]}
                          stroke="rgba(125, 211, 252, 0.85)"
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray={`${6 * k} ${5 * k}`}
                        />
                      )}
                      {points.map((p, i) => (
                        <g key={i} style={{ pointerEvents: "none" }}>
                          <circle
                            cx={p[0]} cy={p[1]} r={6 * k}
                            fill="#0ea5e9" stroke="#ffffff" strokeWidth={2 * k}
                            style={{ filter: "drop-shadow(0 0 12px rgba(56,189,248,1))" }}
                          />
                          {/*
                          <rect
                            x={p[0] + 8 * k}
                            y={p[1] - 18 * k}
                            width={56 * k}
                            height={16 * k}
                            rx={4 * k}
                            fill="rgba(15, 23, 42, 0.85)"
                            stroke="rgba(255, 255, 255, 0.4)"
                            strokeWidth={1 * k}
                          />
                          <text
                            x={p[0] + 36 * k}
                            y={p[1] - 6 * k}
                            textAnchor="middle"
                            fontSize={8 * k}
                            fontWeight={600}
                            fill="#e0f2fe"
                            style={{ fontFamily: "var(--font-plex-mono), monospace" }}
                          >
                            [{p[0]}, {p[1]}]
                          </text>
                          */}
                        </g>
                      ))}
                      {hover && (
                        <circle
                          cx={hover[0]} cy={hover[1]} r={3 * k}
                          fill="#e0f2fe" opacity={0.9}
                          style={{ pointerEvents: "none" }}
                        />
                      )}
                    </g>
                  )}
                </svg>

                {/* HUD Overlay Labels */}
                <span className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] tracking-wider text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  01-10-2026 Thu 15:01:56
                </span>
                <span className="pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] font-semibold tracking-wider text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  Camera 01
                </span>

                {/* Floating Frosted Glass Banner for Saved Zone */}
                {(phase === "preview" || phase === "confirmed") && zone && updatedAt && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/25 border-t-white/40 border-l-white/40 bg-white/10 px-5 py-2 text-xs font-medium text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] backdrop-blur-xl">
                    Saved zone found <span className="text-white/70">(updated {updatedAt})</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Helper Banner */}
          <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[11px] text-white/70">
            <Info className="h-4 w-4 text-cyan-300" />
            <span>Scale keypoints from frame size (dots and polygon will be at correct spots)</span>
          </div>

          {formError && (
            <div
              role="alert"
              className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/20 px-4 py-2.5 text-xs font-medium text-red-200 backdrop-blur-xl shadow-lg"
            >
              <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
              {formError}
            </div>
          )}
        </div>

        {/* Glass Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/15 bg-white/5 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {(phase === "preview" || phase === "confirmed") && (
              <>
                <GhostBtn onClick={handleUsePrevious} disabled={!snap?.has_saved_zone}>
                  Use Previous Zone
                </GhostBtn>
                <GhostBtn onClick={startDrawing}>
                  Draw New Zone
                </GhostBtn>
              </>
            )}

            {phase === "drawing" && (
              <>
                <GhostBtn onClick={() => setPoints((p) => p.slice(0, -1))} disabled={points.length === 0}>
                  <Undo2 className="h-4 w-4" /> Undo
                </GhostBtn>
                <GhostBtn onClick={() => setPoints([])} disabled={points.length === 0}>
                  <Trash2 className="h-4 w-4" /> Clear
                </GhostBtn>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <GhostBtn onClick={phase === "drawing" ? cancelDrawing : onClose}>
              Close
            </GhostBtn>

            {phase === "drawing" && (
              <PrimaryBtn onClick={handleSave} disabled={saving || !!drawProblem}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save Zone"}
              </PrimaryBtn>
            )}

            {phase === "confirmed" && (
              <PrimaryBtn onClick={handleStart} disabled={starting}>
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {starting ? "Starting…" : "Start Surveillance"}
              </PrimaryBtn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}