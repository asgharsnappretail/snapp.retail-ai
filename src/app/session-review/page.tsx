"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, Download, ArrowLeft, Play, Loader2,
  ChevronDown, Flag, Check, Users, Activity, Layers, Flame,
  ChevronLeft, ChevronRight, FileSpreadsheet, BarChart2, ListFilter
} from "lucide-react";

import { Topbar } from "@/components/dashboard/topbar";
import { BACKEND_ORIGIN, getSessionReview } from "@/lib/api";
import { clearSession, readSession, type Session } from "@/lib/session";

const DEFAULT_SLOTS = [
  "00:00 - 03:00", "03:00 - 06:00", "06:00 - 09:00", "09:00 - 12:00",
  "12:00 - 15:00", "15:00 - 18:00", "18:00 - 21:00", "21:00 - 00:00",
];

interface SessionSummary {
  total_scanned_transactions: number;
  total_unscanned_transactions: number;
  cash_transactions: number;
  bank_transactions: number;
  scanned_anomalies: number;
  flagged_transactions: number;
  total_customers: number;
  drawer_status: string;
  last_video_timestamp: string;
  kpi_row_count: number;
  total_sales: number;
}

interface TimelineEvent {
  type: string;
  field: string;
  label: string;
  video_timestamp: string;
  wall_offset_seconds: number;
  offset_seconds: number;
  from_value: number;
  to_value: number;
}

interface KpiRow {
  id: number;
  video_timestamp: string;
  total_scanned_transactions: number;
  total_unscanned_transactions: number;
  SCANNED_ANOMALIES?: number;
  SCANNED_ANAMOLIES?: number;
  cash_transactions: number;
  bank_transactions: number;
  total_customers: number;
  drawer_status: string;
}

interface SaleItem {
  saleTime: string;
  invoiceNumber: string;
  productName: string;
  GrossAmount: number;
}

function getEventBadgeStyle(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes("scanned") && !lower.includes("unscanned") && !lower.includes("anomaly") && !lower.includes("anamoly")) {
    return {
      badge: "border-emerald-300/40 bg-emerald-500/20 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.2)]",
      title: "text-emerald-200",
    };
  }
  if (lower.includes("unscanned") || lower.includes("anomaly") || lower.includes("anamoly")) {
    return {
      badge: "border-amber-300/40 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]",
      title: "text-amber-200",
    };
  }
  if (lower.includes("flagged") || lower.includes("red")) {
    return {
      badge: "border-red-300/40 bg-red-500/20 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.2)]",
      title: "text-red-200",
    };
  }
  return {
    badge: "border-cyan-300/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.2)]",
    title: "text-cyan-200",
  };
}

export default function SessionReviewPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [session, setSession] = useState<Session | null | "checking">("checking");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [sessionsList, setSessionsList] = useState<Array<{ session_id: string }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [eventFilter, setEventFilter] = useState<string>("All");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("All Invoices");

  /* Carousel Slide State (0: Flagged, 1: KPI Rows, 2: Sales Report, 3: Peak Summary) */
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [invoiceDropdownOpen, setInvoiceDropdownOpen] = useState(false);
  const [hoveredPeakSlot, setHoveredPeakSlot] = useState<number | null>(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;

    async function loadSessions() {
      try {
        setDetailData(null);
        const data = await getSessionReview(date);
        if (cancelled) return;
        
        const list = data.sessions || [];
        setSessionsList(list);
        if (list.length > 0) {
          setSelectedSessionId(list[0].session_id);
        } else {
          setSelectedSessionId("");
          setDetailData(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setDetailData(null);
      }
    }

    loadSessions();
    return () => { cancelled = true; };
  }, [date]);

  useEffect(() => {
    if (!date || !selectedSessionId) return;
    let cancelled = false;

    async function loadDetails() {
      setLoadingDetails(true);
      setDetailData(null);
      try {
        const data = await getSessionReview(date, selectedSessionId);
        if (cancelled) return;
        setDetailData(data);
      } catch (err) {
        console.error("Failed to load session review details:", err);
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    }

    loadDetails();
    return () => { cancelled = true; };
  }, [date, selectedSessionId]);

  useEffect(() => {
    if (videoRef.current && detailData?.recording?.url) {
      videoRef.current.load();
    }
  }, [detailData?.recording?.url]);

  function seekToOffset(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (session === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 border-t-white/40 bg-white/10 p-8 shadow-2xl backdrop-blur-2xl">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
          <span className="text-sm font-semibold text-white/80">Loading session review…</span>
        </div>
      </main>
    );
  }
  if (!session) return null;

  const summary: SessionSummary | null = detailData?.summary ?? null;
  const events: TimelineEvent[] = detailData?.events ?? [];
  const kpiRows: KpiRow[] = detailData?.kpi_rows ?? [];
  const salesReport: SaleItem[] = detailData?.sales_report ?? [];
  const dayPeak = detailData?.day_peak_summary ?? null;
  const recordingUrl = detailData?.recording?.url ? `${BACKEND_ORIGIN}${detailData.recording.url}` : null;
  const downloadUrl = detailData?.recording?.filename ? `${BACKEND_ORIGIN}/download-recording/${detailData.recording.filename}` : null;

  const filteredEvents = events.filter((ev) => {
    const lower = ev.type.toLowerCase();
    if (eventFilter === "All") return true;
    if (eventFilter === "Scanned") return lower.includes("scanned") && !lower.includes("unscanned");
    if (eventFilter === "Unscanned") return lower.includes("unscanned");
    if (eventFilter === "Scanned Anamoly" || eventFilter === "Anomalies") return lower.includes("anomaly") || lower.includes("anamoly");
    if (eventFilter === "Cash") return lower.includes("cash");
    if (eventFilter === "Bank") return lower.includes("bank");
    return true;
  });

  const invoicesList = Array.from(new Set(salesReport.map((s) => s.invoiceNumber)));
  const filteredSales = salesReport.filter((s) => {
    if (invoiceFilter === "All Invoices") return true;
    return s.invoiceNumber === invoiceFilter;
  });
  const totalGrossAmount = filteredSales.reduce((acc, curr) => acc + (curr.GrossAmount || 0), 0);

  const rawPeakSlots: any[] = dayPeak?.slots ?? [];
  const maxPeakCustomers = Math.max(1, ...rawPeakSlots.map((s: any) => s.customers ?? 0));

  /* Slides Configuration */
  const slides = [
    { id: 0, label: "Flagged Transactions", icon: Flag },
    { id: 1, label: "KPI Rows Log", icon: ListFilter },
    { id: 2, label: "Sales Report", icon: FileSpreadsheet },
    { id: 3, label: "Day Peak Summary", icon: BarChart2 },
  ];

  function prevSlide() {
    setActiveSlide((curr) => (curr === 0 ? slides.length - 1 : curr - 1));
  }

  function nextSlide() {
    setActiveSlide((curr) => (curr === slides.length - 1 ? 0 : curr + 1));
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 pb-16">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-[140px]" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[140px]" />
      </div>

      <div className="sticky top-0 z-[100] border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <Topbar
          username={session.username}
          live={false}
          hasStats={true}
          onRefresh={() => {}}
          onLogout={handleLogout}
        />
      </div>

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-6 pt-6">
        
        {/* Header Control Panel */}
        <div className="relative z-50 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-xl transition hover:bg-white/20 active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </button>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Session Review</h1>
              <p className="text-xs text-white/60 font-mono">Historical ended sessions only</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 border-t-white/30 bg-white/10 px-4 py-2 backdrop-blur-xl shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Date</span>
              <Calendar className="h-4 w-4 text-cyan-300" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-xs font-mono text-white outline-none cursor-pointer"
              />
            </div>

            {/* Session Dropdown */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Session</span>
                <button
                  type="button"
                  onClick={() => setSessionDropdownOpen((v) => !v)}
                  className="inline-flex h-9 items-center justify-between gap-3 min-w-[180px] rounded-2xl border border-white/20 border-t-white/40 bg-white/10 px-4 text-xs font-mono text-white backdrop-blur-xl transition hover:bg-white/20"
                >
                  <span>{selectedSessionId || "No Sessions"}</span>
                  <ChevronDown className="h-4 w-4 text-white/60" />
                </button>
              </div>

              {sessionDropdownOpen && (
                <div className="absolute right-0 top-11 z-[120] min-w-[200px] max-h-60 overflow-y-auto rounded-2xl border border-white/20 border-t-white/40 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                  {sessionsList.length === 0 ? (
                    <p className="px-3 py-2 font-mono text-xs text-white/50">No sessions available</p>
                  ) : (
                    sessionsList.map((s) => (
                      <button
                        key={s.session_id}
                        type="button"
                        onClick={() => {
                          setSelectedSessionId(s.session_id);
                          setSessionDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 font-mono text-xs text-left transition ${
                          selectedSessionId === s.session_id
                            ? "bg-cyan-500/20 text-cyan-200 font-bold"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span>{s.session_id}</span>
                        {selectedSessionId === s.session_id && <Check className="h-3.5 w-3.5 text-cyan-300" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Grid: Video Player & Timeline Panel */}
        <div className="relative z-40 grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/80">Recording</span>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500/80 to-blue-600/80 px-4 text-xs font-bold text-white shadow-lg backdrop-blur-xl transition hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4" /> Download Recording
                  </a>
                )}
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/20 bg-black shadow-inner">
                {loadingDetails ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/50">
                    <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
                    <span className="font-mono text-xs">Fetching session recording…</span>
                  </div>
                ) : recordingUrl ? (
                  <video
                    ref={videoRef}
                    controls
                    src={recordingUrl}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/50">
                    <span className="font-mono text-xs">No video recording available</span>
                  </div>
                )}
              </div>

              {/* Jump To Event Box */}
              <div className="relative z-50 mt-5 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
                <div className="flex flex-wrap gap-2">
                  {["All", "Scanned", "Unscanned", "Scanned Anamoly", "Cash", "Bank"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setEventFilter(f)}
                      className={`rounded-full px-3 py-1 font-mono text-[10.5px] font-bold transition backdrop-blur-md ${
                        eventFilter === f
                          ? "border border-cyan-300/50 bg-cyan-400/25 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                          : "border border-white/15 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="relative mt-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5">
                    ▷ Jump to event
                  </span>
                  <button
                    type="button"
                    onClick={() => setEventDropdownOpen((v) => !v)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-white/20 border-t-white/30 bg-white/10 px-4 text-xs font-mono text-white backdrop-blur-xl transition hover:bg-white/15"
                  >
                    <span className="text-white/80">Select an event…</span>
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  </button>

                  {eventDropdownOpen && (
                    <div className="absolute left-0 right-0 top-16 z-[120] max-h-60 overflow-y-auto rounded-2xl border border-white/20 border-t-white/40 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                      {filteredEvents.length === 0 ? (
                        <p className="px-3 py-2 font-mono text-xs text-white/50">No matching events</p>
                      ) : (
                        filteredEvents.map((ev, idx) => {
                          const badge = getEventBadgeStyle(ev.type);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                seekToOffset(ev.offset_seconds);
                                setEventDropdownOpen(false);
                              }}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 font-mono text-xs text-left transition hover:bg-white/10"
                            >
                              <span className={`font-bold ${badge.title}`}>{ev.label}</span>
                              <span className="text-[10px] text-white/50">{ev.video_timestamp} · video {Math.floor(ev.offset_seconds / 60)}:{(Math.floor(ev.offset_seconds) % 60).toString().padStart(2, "0")}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Telemetry Cards Matrix */}
              {summary && (
                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-3 text-center backdrop-blur-md">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Scanned</span>
                      <p className="mt-1 font-mono text-xl font-black text-emerald-300">{summary.total_scanned_transactions}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-3 text-center backdrop-blur-md">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Unscanned</span>
                      <p className="mt-1 font-mono text-xl font-black text-amber-300">{summary.total_unscanned_transactions}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-3 text-center backdrop-blur-md">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Cash</span>
                      <p className="mt-1 font-mono text-xl font-black text-cyan-300">{summary.cash_transactions}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-3 text-center backdrop-blur-md">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Bank</span>
                      <p className="mt-1 font-mono text-xl font-black text-cyan-300">{summary.bank_transactions}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-3 text-center backdrop-blur-md col-span-2 sm:col-span-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Flagged</span>
                      <p className="mt-1 font-mono text-xl font-black text-red-300">{summary.flagged_transactions}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur-md">
                      <div className="grid h-8 w-8 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-500/20 text-cyan-300">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Total Customers</span>
                        <p className="font-mono text-lg font-black text-white">{summary.total_customers}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur-md">
                      <div className="grid h-8 w-8 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-300">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Footfall</span>
                        <p className="font-mono text-lg font-black text-emerald-300">{summary.total_customers}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur-md">
                      <div className="grid h-8 w-8 place-items-center rounded-xl border border-purple-400/30 bg-purple-500/20 text-purple-300">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">KPI Telemetry Rows</span>
                        <p className="font-mono text-lg font-black text-purple-200">{summary.kpi_row_count}</p>
                      </div>
                    </div>

                    {/* Peak Hour Amber Box */}
                    <div className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/15 p-3 backdrop-blur-md shadow-[0_0_14px_rgba(251,191,36,0.18)]">
                      <div className="grid h-8 w-8 place-items-center rounded-xl border border-amber-400/50 bg-amber-500/25 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                        <Flame className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300/80">Peak Hour</span>
                        <p className="font-mono text-xs font-black text-amber-200 truncate">
                          {dayPeak?.peak?.label || "18:00 - 21:00"}
                        </p>
                        <p className="font-mono text-[9px] text-amber-100/70">
                          {dayPeak?.peak?.customers ?? 0} Customers
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Events Panel */}
          <div className="lg:col-span-5 flex flex-col h-full max-h-[660px]">
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-between flex-none">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/80">Timeline Events</span>
                <span className="font-mono text-xs text-white/50">{filteredEvents.length} events</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1.5 custom-scrollbar">
                {loadingDetails ? (
                  <div className="flex h-full items-center justify-center gap-2 py-16 text-white/50 font-mono text-xs">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                    <span>Loading timeline…</span>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <p className="py-16 text-center font-mono text-xs text-white/40">No matching events found</p>
                ) : (
                  filteredEvents.map((ev, i) => {
                    const badge = getEventBadgeStyle(ev.type);
                    return (
                      <div
                        key={i}
                        onClick={() => seekToOffset(ev.offset_seconds)}
                        className="group flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl transition cursor-pointer hover:border-white/40 hover:bg-white/15 shadow-sm"
                      >
                        <div className="space-y-1">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${badge.badge}`}>
                            {ev.type.replace("_", " ")}
                          </span>
                          <h4 className={`text-sm font-bold tracking-tight transition ${badge.title}`}>
                            {ev.label}
                          </h4>
                          <p className="font-mono text-[10px] text-white/50">
                            {ev.video_timestamp} · <span className="text-white/70">video {Math.floor(ev.offset_seconds / 60)}:{(Math.floor(ev.offset_seconds) % 60).toString().padStart(2, "0")}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-white/10 text-white/80 transition group-hover:border-cyan-300 group-hover:bg-cyan-500/25 group-hover:text-cyan-200"
                        >
                          <Play className="h-4 w-4 fill-current" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Glassmorphic Carousel Slider Section */}
        <div className="relative z-0 overflow-hidden rounded-3xl border border-white/20 border-t-white/40 border-l-white/40 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl">
          
          {/* Carousel Header & Slide Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
            
            {/* Slide Category Tabs */}
            <div className="flex flex-wrap gap-2">
              {slides.map((s) => {
                const Icon = s.icon;
                const isActive = activeSlide === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSlide(s.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition backdrop-blur-xl ${
                      isActive
                        ? "border border-cyan-300/50 bg-cyan-500/25 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.25)]"
                        : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-cyan-300" : "text-white/50"}`} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Left / Right Arrow Controls */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold text-white/50">
                Slide <span className="text-cyan-300">{activeSlide + 1}</span> of {slides.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevSlide}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:border-cyan-300 hover:bg-cyan-500/20 active:scale-95"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:border-cyan-300 hover:bg-cyan-500/20 active:scale-95"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Carousel Slide Views */}
          <div className="pt-6">
            
            {/* Slide 0: Flagged Transactions */}
            {activeSlide === 0 && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-red-300">Flagged Transactions</span>
                  <span className="font-mono text-xs text-white/50">{detailData?.flagged_transactions?.length ?? 0} flagged</span>
                </div>

                {!detailData?.flagged_transactions || detailData.flagged_transactions.length === 0 ? (
                  <p className="py-12 text-center font-mono text-xs text-white/40">No flagged transactions recorded in this session</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {detailData.flagged_transactions.map((ft: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => seekToOffset(ft.offset_seconds)}
                        className="flex items-center gap-3 rounded-2xl border border-red-400/40 bg-red-500/20 px-4 py-3 backdrop-blur-xl cursor-pointer transition hover:bg-red-500/30 shadow-[0_0_16px_rgba(239,68,68,0.2)]"
                      >
                        <Flag className="h-4 w-4 text-red-300" />
                        <div>
                          <p className="text-xs font-bold text-red-200">{ft.transaction_label || ft.label}</p>
                          <span className="font-mono text-[10px] text-red-300/80">{ft.video_timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Slide 1: KPI Rows Log Table */}
            {activeSlide === 1 && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/80">KPI Rows Log</span>
                  <span className="font-mono text-xs text-white/50">{kpiRows.length} rows</span>
                </div>

                <div className="overflow-x-auto max-h-[320px]">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md">
                      <tr className="border-b border-white/15 text-[10px] text-white/50 uppercase">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Scanned</th>
                        <th className="py-3 px-4">Unscanned</th>
                        <th className="py-3 px-4">Anomalies</th>
                        <th className="py-3 px-4">Cash</th>
                        <th className="py-3 px-4">Bank</th>
                        <th className="py-3 px-4">Customers</th>
                        <th className="py-3 px-4">Drawer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {kpiRows.map((row) => (
                        <tr key={row.id} className="hover:bg-white/5 transition">
                          <td className="py-3 px-4 text-white/90 font-medium">{row.video_timestamp}</td>
                          <td className="py-3 px-4 text-emerald-300 font-bold">{row.total_scanned_transactions}</td>
                          <td className="py-3 px-4 text-amber-300 font-bold">{row.total_unscanned_transactions}</td>
                          <td className="py-3 px-4 text-red-300 font-bold">{row.SCANNED_ANOMALIES ?? row.SCANNED_ANAMOLIES ?? 0}</td>
                          <td className="py-3 px-4 text-cyan-300">{row.cash_transactions}</td>
                          <td className="py-3 px-4 text-cyan-300">{row.bank_transactions}</td>
                          <td className="py-3 px-4 text-white/80">{row.total_customers}</td>
                          <td className="py-3 px-4 text-white/60 uppercase">{row.drawer_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Slide 2: POS Sales Report */}
            {activeSlide === 2 && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <div>
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/80">Sales Report</span>
                    <h3 className="text-base font-bold text-white mt-0.5">POS Items & Invoices</h3>
                  </div>
                  
                  {/* Glass Dropdown for Invoice Filter */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setInvoiceDropdownOpen((v) => !v)}
                      className="inline-flex h-9 items-center justify-between gap-3 min-w-[160px] rounded-xl border border-white/20 border-t-white/40 bg-white/10 px-3.5 text-xs font-mono text-white backdrop-blur-xl transition hover:bg-white/20"
                    >
                      <span>{invoiceFilter}</span>
                      <ChevronDown className="h-4 w-4 text-white/60" />
                    </button>

                    {invoiceDropdownOpen && (
                      <div className="absolute right-0 top-11 z-[100] min-w-[200px] rounded-2xl border border-white/20 border-t-white/40 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceFilter("All Invoices");
                            setInvoiceDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 font-mono text-xs text-left transition ${
                            invoiceFilter === "All Invoices" ? "bg-cyan-500/20 text-cyan-200 font-bold" : "text-white/80 hover:bg-white/10"
                          }`}
                        >
                          <span>All Invoices</span>
                        </button>
                        {invoicesList.map((inv) => (
                          <button
                            key={inv}
                            type="button"
                            onClick={() => {
                              setInvoiceFilter(inv);
                              setInvoiceDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 font-mono text-xs text-left transition ${
                              invoiceFilter === inv ? "bg-cyan-500/20 text-cyan-200 font-bold" : "text-white/80 hover:bg-white/10"
                            }`}
                          >
                            <span className="truncate">{inv}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Total Sales</span>
                    <p className="mt-1 font-mono text-2xl font-black text-cyan-300">{filteredSales.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Total Amount</span>
                    <p className="mt-1 font-mono text-2xl font-black text-emerald-300">PKR {totalGrossAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[260px]">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md">
                      <tr className="border-b border-white/15 text-[10px] text-white/50 uppercase">
                        <th className="py-3 px-4">Sale Time</th>
                        <th className="py-3 px-4">Invoice Number</th>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4 text-right">Gross Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredSales.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition">
                          <td className="py-3 px-4 text-white/70">{item.saleTime}</td>
                          <td className="py-3 px-4 text-cyan-300 font-bold">{item.invoiceNumber}</td>
                          <td className="py-3 px-4 text-white/90">{item.productName}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-300">PKR {item.GrossAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Slide 3: Day Peak Hours Chart */}
            {activeSlide === 3 && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/80">Day Peak Summary</span>
                  {dayPeak?.peak && (
                    <span className="rounded-full border border-amber-300/40 bg-amber-500/20 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur-xl shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                      PEAK {dayPeak.peak.label} · {dayPeak.peak.customers} customers
                    </span>
                  )}
                </div>

                <div className="flex h-48 items-stretch gap-2 sm:gap-3">
                  {DEFAULT_SLOTS.map((fallback, i) => {
                    const slot = rawPeakSlots.find((s: any) => s.slot_index === i || s.label === fallback);
                    const v = slot?.customers ?? 0;
                    const isPeak = dayPeak?.peak?.slot_index === i && v > 0;
                    const isHovered = hoveredPeakSlot === i;
                    const scale = Math.max(0.005, v / maxPeakCustomers);

                    const fill = isPeak
                      ? "bg-gradient-to-t from-amber-600 to-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
                      : "bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)]";

                    return (
                      <div
                        key={i}
                        className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                        onMouseEnter={() => setHoveredPeakSlot(i)}
                        onMouseLeave={() => setHoveredPeakSlot(null)}
                      >
                        {isHovered && (
                          <div className="pointer-events-none absolute -top-12 z-30 flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
                            <div className="whitespace-nowrap rounded-xl border border-white/30 border-t-white/50 bg-slate-900/90 px-3 py-1.5 text-center shadow-2xl backdrop-blur-xl">
                              <p className="font-mono text-[10px] font-bold text-cyan-200">{slot?.label ?? fallback}</p>
                              <p className="font-mono text-xs font-black text-white">{v} customers</p>
                            </div>
                            <div className="h-1.5 w-1.5 -translate-y-1 rotate-45 border-b border-r border-white/30 bg-slate-900/90" />
                          </div>
                        )}

                        <span className={`mb-1.5 font-mono text-[10px] font-black ${isPeak ? "text-amber-200" : "text-white/70"}`}>
                          {v > 0 ? v : ""}
                        </span>

                        <div className="relative w-full max-w-[80px] flex-1 border-b border-white/20">
                          <div
                            className={`absolute inset-0 origin-bottom rounded-t-xl transition-all duration-300 ${fill} ${
                              isHovered ? "brightness-125 scale-x-105" : ""
                            }`}
                            style={{ transform: `scaleY(${scale})` }}
                          />
                        </div>

                        <span className={`mt-2.5 w-full truncate text-center font-mono text-[9px] font-bold tracking-tight ${isPeak ? "text-amber-300" : "text-white/50"}`}>
                          {slot?.label ?? fallback}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  );
}