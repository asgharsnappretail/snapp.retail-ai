import type {
    LatestStats, LoginRequest, LoginResponse, SaveZoneResponse,
    StartStreamResponse, StopStreamResponse, ZonePolygon, ZoneSnapshot,
  } from "@/types/api";
  
  /** All fetch calls go through the Next.js rewrite proxy (see next.config.mjs). */
  const API_BASE = "/backend";
  
  /** Human-readable origin — also used for the MJPEG <img> (plain img tags need no CORS). */
  export const BACKEND_ORIGIN = "https://monitoring.snappretail.io";
  
  export class ApiError extends Error {
    constructor(
      message: string,
      public readonly kind: "invalid" | "network" | "timeout" = "invalid",
      public readonly status?: number
    ) {
      super(message);
      this.name = "ApiError";
    }
  }
  
  async function parseError(res: Response, fallback: string): Promise<never> {
    const body = await res.json().catch(() => null);
    const msg = body?.detail ?? body?.message ?? `${fallback} (${res.status})`;
    throw new ApiError(String(msg), res.status >= 500 ? "network" : "invalid", res.status);
  }
  
  async function timedFetch(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
  
  function wrapNetwork(err: unknown, message: string): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof DOMException && err.name === "AbortError") return new ApiError(message, "timeout");
    return new ApiError("Cannot reach the SNAPP monitoring server", "network");
  }
  
  export async function login(payload: LoginRequest): Promise<LoginResponse> {
    try {
      const res = await timedFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, 12_000);
      if (!res.ok) await parseError(res, "Login failed");
      const data = await res.json().catch(() => null);
      if (!data || typeof data.status !== "string") throw new ApiError("Unexpected response from server", "network");
      return data as LoginResponse;
    } catch (err) {
      throw wrapNetwork(err, "Login request timed out");
    }
  }
  
  export async function getLatestStats(): Promise<LatestStats> {
    try {
      const res = await timedFetch("/latest-stats", { cache: "no-store" }, 15_000);
      if (!res.ok) await parseError(res, "Stats request failed");
      const data = await res.json().catch(() => null);
      if (!data || typeof data.video_timestamp !== "string") {
        throw new ApiError("Unexpected /latest-stats payload", "network");
      }
      return data as LatestStats;
    } catch (err) {
      throw wrapNetwork(err, "Stats request timed out");
    }
  }
  
  export async function getZoneSnapshot(): Promise<ZoneSnapshot> {
    try {
      // generous timeout — this call pre-warms the RTSP camera and can be slow on first hit
      const res = await timedFetch("/scanner-zone/snapshot", { cache: "no-store" }, 20_000);
      if (res.status === 503) throw new ApiError("Camera is still connecting", "network", 503);
      if (!res.ok) await parseError(res, "Snapshot request failed");
      const data = await res.json().catch(() => null);
      if (!data || typeof data.image !== "string" || !data.width || !data.height) {
        throw new ApiError("Unexpected snapshot payload", "network");
      }
      return data as ZoneSnapshot;
    } catch (err) {
      throw wrapNetwork(err, "Snapshot request timed out");
    }
  }
  
  export async function saveZone(polygon: ZonePolygon): Promise<SaveZoneResponse> {
    const res = await timedFetch("/scanner-zone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polygon }),
    }, 12_000);
    // 400 → detail shown verbatim by the caller · 409 session running · 422 malformed
    if (!res.ok) await parseError(res, "Save zone failed");
    return (await res.json()) as SaveZoneResponse;
  }
  
  export async function startStream(): Promise<StartStreamResponse> {
    const res = await timedFetch("/start-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }, 15_000);
    if (!res.ok) await parseError(res, "Start stream failed"); // caller handles 409 (attach)
    return (await res.json()) as StartStreamResponse;
  }
  
  export async function stopStream(): Promise<StopStreamResponse> {
    const res = await timedFetch("/stop-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }, 15_000);
    if (!res.ok) await parseError(res, "Stop stream failed");
    return (await res.json()) as StopStreamResponse;
  }

  