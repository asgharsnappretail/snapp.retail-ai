"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WhepStatus = "connecting" | "live" | "reconnecting" | "offline";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const GATHER_TIMEOUT_MS = 2000;

function waitForIce(pc: RTCPeerConnection, timeoutMs = GATHER_TIMEOUT_MS) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const onChange = () => { if (pc.iceGatheringState === "complete") done(); };
    const t = setTimeout(done, timeoutMs);
    function done() {
      clearTimeout(t);
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

/**
 * WHEP player: POSTs an SDP offer to /whep (proxied to the ngrok /cam/whep
 * endpoint), applies the answer, and attaches the incoming track to a
 * <video> element. Reconnects with backoff when the connection drops.
 */
export function useWhep() {
  const [status, setStatus] = useState<WhepStatus>("connecting");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let pc: RTCPeerConnection | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const scheduleRetry = (delay: number) => {
      if (!alive) return;
      attempts += 1;
      if (timer) clearTimeout(timer);
      setStatus("reconnecting");
      timer = setTimeout(connect, delay);
    };

    async function connect() {
      if (!alive) return;
      if (pc) { try { pc.close(); } catch {} pc = null; }

      try {
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" }
          ]
        });
      } catch {
        setStatus("offline");
        return;
      }
      const conn = pc;

      conn.addTransceiver("video", { direction: "recvonly" });
      conn.addTransceiver("audio", { direction: "recvonly" });

      conn.ontrack = (e) => {
        if (!alive) return;
        streamRef.current = e.streams[0] ?? new MediaStream([e.track]);
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      };

      conn.onconnectionstatechange = () => {
        if (!alive) return;
        const st = conn.connectionState;
        if (st === "connected") {
          attempts = 0;
          setStatus("live");
        } else if (st === "failed" || st === "disconnected" || st === "closed") {
          scheduleRetry(Math.min(10_000, 3_000 + attempts * 2_000));
        }
      };

      try {
        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);
        await waitForIce(conn); // bound the gather so the offer carries full candidates

        const res = await fetch("/whep", {
          method: "POST",
          headers: { 
            "Content-Type": "application/sdp",
            "ngrok-skip-browser-warning": "true",
          },
          body: conn.localDescription?.sdp ?? "",
        });
        if (!res.ok) throw new Error(`WHEP ${res.status}`);
        const answer = await res.text();
        if (!alive) return;
        await conn.setRemoteDescription({ type: "answer", sdp: answer });
      } catch {
        scheduleRetry(Math.min(10_000, 3_000 + attempts * 2_000));
      }
    }

    connect();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (pc) { try { pc.close(); } catch {} }
    };
  }, []);

  return { status, attachVideo };
}