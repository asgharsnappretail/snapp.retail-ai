"use client";

import {
  useEffect, useRef, useState,
  type MouseEvent as ReactMouseEvent, type ReactNode,
} from "react";
import {
  Loader2, MapPinned, Pencil, Play, RefreshCw, Save, Trash2, Undo2, X,
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
  loading:     { label: "Loading",    cls: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  connecting:  { label: "Connecting", cls: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  error:       { label: "Error",      cls: "border-red-400/40 bg-red-400/10 text-red-300" },
  preview:     { label: "Ready",      cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
  drawing:     { label: "Drawing",    cls: "border-sky-400/40 bg-sky-400/10 text-sky-300" },
  confirmed:   { label: "Zone Set",   cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
};

/* ---------- geometry helpers — mirror the backend's validation rules ---------- */
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
  if (pts.length > 32) return "Maximum 32 points";
  let pos = 0, neg = 0;
  for (let i = 0; i < pts.length; i++) {
    const c = cross(pts[i], pts[(i + 1) % pts.length], pts[(i + 2) % pts.length]);
    if (c > 0) pos++;
    else if (c < 0) neg++;
  }
  if (pos > 0 && neg > 0) return "Polygon must be convex (no notches)";
  if (shoelaceArea(pts) < 50) return "Zone area too small (min 50 px²)";
  return null;
}

/* ---------- buttons ---------- */
function GhostBtn({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/60 px-4 text-[12.5px] font-semibold text-slate-200 transition hover:bg-slate-700/60 disabled:pointer-events-none disabled:opacity-40"
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
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-600 to-blue-600 px-5 text-[12.5px] font-bold text-white shadow-[0_0_24px_rgba(34,211,238,0.25)] transition hover:from-cyan-500 hover:to-blue-500 hover:shadow-[0_0_32px_rgba(34,211,238,0.4)] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
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

  /* fetch the snapshot on open — 503 = camera warming up → retry up to 3× @3s */
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

  /* ESC: cancel drawing first, otherwise dismiss */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (phase === "drawing") cancelDrawing();
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase, onClose]);

  /* client → natural pixels. The SVG uses preserveAspectRatio="xMidYMid meet"
     over viewBox 0 0 width height — identical letterboxing to the img's
     object-contain — so this inverse mapping is exact at any size/DPI. */
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
    setPhase("confirmed"); // snapshot polygon is already active — no API call
  }

  async function handleSave() {
    if (!snap) return;
    const problem = validatePolygon(points);
    if (problem) { setFormError(problem); return; }
    setSaving(true);
    setFormError(null);
    try {
      const res = await saveZone(points);
      // re-render from the server-cleaned polygon
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
        onStarted({ session_id: "" }); // already running — attach to the live view
      } else {
        setFormError(err instanceof Error ? err.message : "Failed to start surveillance");
        setStarting(false);
      }
    }
  }

  if (!open) return null;

  const pill = PHASE_PILL[phase];
  const k = snap ? snap.width / 900 : 1; // scales dots/labels with the frame
  const ptsAttr = (pts: Pt[]) => pts.map((p) => `${p[0]},${p[1]}`).join(" ");
  const drawProblem = phase === "drawing" ? validatePolygon(points) : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scanner zone setup"
        className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-2xl backdrop-blur-xl"
      >
        {/* ---------- header ---------- */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-700/50 px-5 py-4">
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-sky-400/80">Zone Setup</span>
            <h2 className="mt-1 text-[17px] font-bold tracking-tight text-white">Scanner Zone Setup</h2>
            <p className="mt-1.5 font-mono text-[9.5px] tracking-wide text-slate-400">
              Snapshot → choose / draw → save → start surveillance
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 pt-1">
            <span className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] ${pill.cls}`}>
              {(phase === "loading" || phase === "connecting") && <Loader2 className="h-3 w-3 animate-spin" />}
              {pill.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700/50 bg-slate-800/60 text-slate-400 transition hover:bg-slate-700/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ---------- body ---------- */}
        <div className="p-5">
          {phase === "loading" || phase === "connecting" ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-slate-700/50 bg-black/60">
              <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
              <p className="text-[12.5px] font-medium text-slate-300">
                {phase === "loading" ? "Fetching camera snapshot…" : "Connecting to camera…"}
              </p>
              <p className="font-mono text-[10px] text-slate-500">
                {phase === "connecting"
                  ? `retry ${retryAttempt}/3 · pre-warming RTSP feed`
                  : "GET /scanner-zone/snapshot"}
              </p>
            </div>
          ) : phase === "error" ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-xl border border-red-400/30 bg-black/60">
              <p className="max-w-md px-6 text-center text-[12.5px] font-medium text-red-300">{loadError}</p>
              <PrimaryBtn onClick={() => setReloadKey((n) => n + 1)}>
                <RefreshCw className="h-4 w-4" /> Retry
              </PrimaryBtn>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-black">
              <div
                className="relative w-full select-none"
                style={{ aspectRatio: snap ? `${snap.width} / ${snap.height}` : "16 / 9" }}
              >
                {/* the API always returns a normal-brightness frame — dimming is pure CSS */}
                <img
                  src={snap?.image}
                  alt="Camera snapshot"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
                  style={{ opacity: phase === "drawing" ? 1 : 0.45 }}
                />

                {/* overlay: viewBox = NATURAL resolution → all coordinates are natural px,
                     non-scaling strokes stay visually constant, resizing is free */}
                <svg
                  ref={svgRef}
                  viewBox={snap ? `0 0 ${snap.width} ${snap.height}` : undefined}
                  preserveAspectRatio="xMidYMid meet"
                  className={`absolute inset-0 h-full w-full ${phase === "drawing" ? "cursor-crosshair" : "pointer-events-none"}`}
                  onClick={handleSvgClick}
                  onMouseMove={handleSvgMove}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* active / saved zone (preview + confirmed) */}
                  {phase !== "drawing" && zone && zone.length >= 3 && (
                    <g style={{ filter: "drop-shadow(0 0 10px rgba(56,189,248,0.35))" }}>
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
                            cx={p[0]} cy={p[1]} r={5 * k}
                            fill="#082f49" stroke="#38bdf8" strokeWidth={2 * k}
                            style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,0.8))" }}
                          />
                          <text
                            x={p[0]} y={p[1] + 3.4 * k} textAnchor="middle"
                            fontSize={9 * k} fontWeight={700} fill="#7dd3fc"
                            style={{ fontFamily: "var(--font-plex-mono), monospace" }}
                          >
                            {i + 1}
                          </text>
                        </g>
                      ))}
                    </g>
                  )}

                  {/* drawing layer */}
                  {phase === "drawing" && (
                    <g>
                      {points.length >= 3 && (
                        <polygon
                          points={ptsAttr(points)}
                          fill="rgba(56, 189, 248, 0.15)"
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
                          stroke="rgba(125, 211, 252, 0.8)"
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray={`${6 * k} ${5 * k}`}
                        />
                      )}
                      {points.map((p, i) => (
                        <g key={i} style={{ pointerEvents: "none" }}>
                          <circle
                            cx={p[0]} cy={p[1]} r={5.5 * k}
                            fill="#0ea5e9" stroke="#e0f2fe" strokeWidth={1.6 * k}
                            style={{ filter: "drop-shadow(0 0 7px rgba(56,189,248,0.9))" }}
                          />
                          <text
                            x={p[0] + 10 * k} y={p[1] - 9 * k}
                            fontSize={9.5 * k} fontWeight={600} fill="#e0f2fe"
                            stroke="#020617" strokeWidth={2.6 * k} paintOrder="stroke"
                            style={{ fontFamily: "var(--font-plex-mono), monospace" }}
                          >
                            [{p[0]}, {p[1]}]
                          </text>
                        </g>
                      ))}
                      {hover && (
                        <circle
                          cx={hover[0]} cy={hover[1]} r={2.6 * k}
                          fill="#e0f2fe" opacity={0.9}
                          style={{ pointerEvents: "none" }}
                        />
                      )}
                    </g>
                  )}
                </svg>

                {/* frame HUD */}
                <span className="pointer-events-none absolute left-3 top-2.5 font-mono text-[9.5px] tracking-wide text-white/70 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                  SNAPSHOT{snap?.captured_at ? ` · ${snap.captured_at}` : ""}
                </span>
                <span className="pointer-events-none absolute bottom-2.5 right-3 font-mono text-[9.5px] tracking-wide text-white/60 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                  CAM {snap?.store_id ?? "—"}{snap ? ` · ${snap.width}×${snap.height}` : ""}
                </span>
              </div>
            </div>
          )}

          {/* saved-zone banner */}
          {(phase === "preview" || phase === "confirmed") && zone && updatedAt && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[11.5px] font-medium text-sky-300">
              <MapPinned className="h-3.5 w-3.5 flex-none" />
              <span>
                {phase === "confirmed" ? "Zone saved" : "Saved zone found"}
                <span className="text-slate-400"> (updated {updatedAt})</span>
              </span>
              <span className="ml-auto font-mono text-[9.5px] text-slate-500">{zone.length} vertices</span>
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="mt-3 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[11.5px] font-medium text-red-300"
            >
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-red-400" />
              {formError}
            </div>
          )}
        </div>

        {/* ---------- footer ---------- */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/50 bg-slate-950/40 px-5 py-4">
          <span className="mr-auto hidden min-w-0 truncate font-mono text-[10px] text-slate-500 sm:block">
            {phase === "drawing"
              ? `${points.length} pts · ${drawProblem ? drawProblem.toLowerCase() : "shape valid"}`
              : snap
                ? `store ${snap.store_id} · frame ${snap.width}×${snap.height}${zone ? ` · zone ${zone.length} vertices` : ""}`
                : ""}
          </span>

          {(phase === "loading" || phase === "connecting") && (
            <GhostBtn onClick={onClose}>Close</GhostBtn>
          )}

          {phase === "error" && (
            <>
              <GhostBtn onClick={onClose}>Close</GhostBtn>
              <PrimaryBtn onClick={() => setReloadKey((n) => n + 1)}>
                <RefreshCw className="h-4 w-4" /> Retry
              </PrimaryBtn>
            </>
          )}

          {phase === "preview" && (
            <>
              <GhostBtn onClick={onClose}>
                <X className="h-4 w-4" /> Close
              </GhostBtn>
              <GhostBtn onClick={handleUsePrevious} disabled={!snap?.has_saved_zone}>
                <MapPinned className="h-4 w-4" /> Use Previous Zone
              </GhostBtn>
              <PrimaryBtn onClick={startDrawing}>
                <Pencil className="h-4 w-4" /> Draw New Zone
              </PrimaryBtn>
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
              <GhostBtn onClick={cancelDrawing}>Cancel</GhostBtn>
              <PrimaryBtn onClick={handleSave} disabled={saving || !!drawProblem}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save Zone"}
              </PrimaryBtn>
            </>
          )}

          {phase === "confirmed" && (
            <>
              <GhostBtn onClick={onClose}>
                <X className="h-4 w-4" /> Close
              </GhostBtn>
              <GhostBtn onClick={startDrawing}>
                <Pencil className="h-4 w-4" /> Redraw Zone
              </GhostBtn>
              <PrimaryBtn onClick={handleStart} disabled={starting}>
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {starting ? "Starting…" : "Move to AI Surveillance"}
              </PrimaryBtn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}