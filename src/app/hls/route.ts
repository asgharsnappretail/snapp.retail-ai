export const dynamic = "force-dynamic";

/** ngrok root (no trailing slash). Rotate this when the tunnel restarts. */
const HLS_BASE = process.env.HLS_BASE_URL ?? "https://fritter-uncolored-stability.ngrok-free.dev";

/**
 * Same-origin HLS proxy: browser → /hls/... → this route → ngrok/MediaMTX.
 * The skip header is added server-side, so there is no CORS preflight and
 * no ngrok interstitial. Playlists get their absolute-path URIs rewritten
 * so segment fetches also come back through the proxy.
 */
export async function GET(req: Request, ctx: { params: { path: string[] } }) {
  const { path } = ctx.params;
  const url = new URL(req.url);
  const target = `${HLS_BASE}/${path.join("/")}${url.search}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const upstream = await fetch(target, {
      headers: {
        "ngrok-skip-browser-warning": "true",
        Accept: "*/*",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return new Response(`Upstream ${upstream.status}`, { status: upstream.status });
    }

    const isPlaylist = path.join("/").endsWith(".m3u8");
    if (isPlaylist) {
      let body = await upstream.text();
      // absolute-path URIs → route them back through the proxy
      body = body.replace(/^(?!#)(\/[^\s]+)$/gm, "/hls$1");
      body = body.replace(/URI="\/([^"]*)"/g, 'URI="/hls/$1"');
      // relative filenames resolve against /hls/cam/... automatically
      return new Response(body, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
        },
      });
    }

    // segments (.ts / .mp4) — stream the bytes straight through
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "video/mp2t",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("HLS upstream unreachable", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}