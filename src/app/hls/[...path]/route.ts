// src/app/hls/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

// Never cache playlists/segments; LL-HLS blocking reloads can hold a request open.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Public ngrok URL fronting MediaMTX HLS — only the origin is used.
// Resolution order: STREAM_URL -> NEXT_PUBLIC_STREAM_URL -> WHEP_URL.
function streamOrigin(): string | null {
  const raw = (
    process.env.STREAM_URL ||
    process.env.NEXT_PUBLIC_STREAM_URL ||
    process.env.WHEP_URL ||
    ""
  ).trim();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
  const origin = streamOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: "HLS proxy: no stream URL configured. Set NEXT_PUBLIC_STREAM_URL in .env.local." },
      { status: 500 }
    );
  }

  // Rebuild a safe upstream path: /hls/cam/index.m3u8 -> /cam/index.m3u8
  const segments = (params?.path ?? []).filter(
    (s) => s && s !== "." && s !== ".." && !s.includes("/")
  );
  if (segments.length === 0) {
    return NextResponse.json({ error: "HLS proxy: missing path" }, { status: 400 });
  }

  // Forward all query params (incl. LL-HLS _HLS_msn/_HLS_part) except our legacy skip param.
  const sp = new URLSearchParams(req.nextUrl.search);
  sp.delete("ngrok-skip-browser-warning");
  const qs = sp.toString();
  const upstream = `${origin}/${segments.map(encodeURIComponent).join("/")}${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(upstream, {
      cache: "no-store",
      headers: { "ngrok-skip-browser-warning": "true", Accept: "*/*" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `HLS proxy: upstream responded ${res.status}`, upstream },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") ?? "application/vnd.apple.mpegurl");
    headers.set("Cache-Control", res.headers.get("Cache-Control") ?? "no-store");
    headers.set("Access-Control-Allow-Origin", "*");

    // Stream playlist text / fMP4 segments straight through.
    return new NextResponse(res.body, { status: 200, headers });
  } catch (err) {
    return NextResponse.json(
      {
        error: "HLS proxy: could not reach the stream",
        upstream,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}