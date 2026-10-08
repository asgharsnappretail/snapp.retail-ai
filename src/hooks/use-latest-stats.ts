"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLatestStats } from "@/lib/api";
import type { LatestStats } from "@/types/api";

/** Polling interval: 60 seconds */
const POLL_MS = 60_000;

export function useLiveStats() {
  const [stats, setStats] = useState<LatestStats | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const inFlightRef = useRef(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Core API call runner
  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // Stamp sync start time immediately for accurate nextIn countdown
    const fetchStartTime = new Date();

    try {
      const data = await getLatestStats();
      setStats(data);
      setError(null);
      setLastSync(fetchStartTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Polling Effect — uses recursive timeout to guarantee exact 60s gaps between hits
  useEffect(() => {
    if (!live) return;

    let isSubscribed = true;

    const scheduleNextPoll = () => {
      timeoutIdRef.current = setTimeout(async () => {
        if (!isSubscribed) return;
        await refreshRef.current();
        if (isSubscribed) {
          scheduleNextPoll();
        }
      }, POLL_MS);
    };

    // First hit immediately upon starting
    void refreshRef.current().then(() => {
      if (isSubscribed) scheduleNextPoll();
    });

    return () => {
      isSubscribed = false;
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [live]);

  // Countdown ticker for nextIn calculation
  useEffect(() => {
    if (!live) return;
    const ticker = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(ticker);
  }, [live]);

  const start = useCallback(() => {
    setLive(true);
  }, []);

  const stop = useCallback(() => {
    setLive(false);
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
  }, []);

  const nextIn =
    live && lastSync
      ? Math.max(0, Math.ceil((lastSync.getTime() + POLL_MS - now) / 1_000))
      : null;

  return {
    stats,
    live,
    error,
    lastSync,
    nextIn,
    refresh,
    start,
    stop,
  };
}