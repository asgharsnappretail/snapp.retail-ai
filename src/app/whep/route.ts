export const dynamic = "force-dynamic";

const DEFAULT_WHEP_URL = "http://fritter-uncolored-stability.ngrok-free.dev/cam/whep";

/**
 * Proxies the WHEP SDP exchange: browser → this route → ngrok /cam/whep.
 * Keeps the browser on one origin (no CORS) and bypasses the ngrok
 * free-tier interstitial for non-server requests.
 */
export async function POST(req: Request) {
  const target = process.env.WHEP_URL ?? DEFAULT_WHEP_URL;
  const offer = await req.text();

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        "ngrok-skip-browser-warning": "true",
      },
      body: offer,
      cache: "no-store",
    });

    const answer = await upstream.text();
    if (!upstream.ok) {
      return new Response(answer, {
        status: upstream.status,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response(answer, {
      status: 200,
      headers: { "Content-Type": "application/sdp" },
    });
  } catch {
    return new Response("WHEP endpoint unreachable", { status: 502 });
  }
}