"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLatestStats } from "@/lib/api";
import type { LatestStats } from "@/types/api";

export function useLatestStats(intervalMs = 60_000) {
  const [stats, setStats] = useState<LatestStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);

  /* One request in flight at a time. A tick that fires while a request is
     pending is coalesced into a single follow-up — a slow backend can never
     accumulate a request queue (which previously stacked requests until they
     all timed out client-side and never reached the backend). */
  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;
    try {
      const s = await getLatestStats();
      setStats(s);
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      // keep the last good data on screen; flag the failure
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void refresh();
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);

  const nextIn = lastSync
    ? Math.max(0, Math.ceil((lastSync.getTime() + intervalMs - now) / 1_000))
    : null;

  return { stats, error, lastSync, nextIn, refresh };
}