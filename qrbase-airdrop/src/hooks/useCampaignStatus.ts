"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { CampaignStatusResponse } from "@/types";

// Poll interval for the campaign status endpoint. This endpoint is the single
// biggest driver of Prisma Accelerate operations (one request per open claim
// page), so we keep the cadence conservative and pause entirely when the tab is
// hidden. Combined with the server-side 15s Redis response cache, concurrent
// viewers of the same campaign collapse onto very few actual Prisma queries.
const POLL_INTERVAL_MS = 30000;

export function useCampaignStatus(campaignId: string) {
  const [status, setStatus] = useState<CampaignStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/status`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;

    const start = () => {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => {
        if (!cancelled) fetchStatus();
      }, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // Initial fetch + start polling only while the tab is visible.
    fetchStatus();
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      start();
    }

    const onVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        fetchStatus(); // refresh immediately on return
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
