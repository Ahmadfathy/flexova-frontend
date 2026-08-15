import { useState, useEffect, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";

/**
 * Five-states signal for the board (`?mock=loading|empty|error|offline`).
 * Work orders are read live from `useRprWorkOrders` (a persisted store, not
 * fetched) — this hook only decides which wrapper-state to render around
 * that live data, mirroring `useFloorPlan`/`useCalendar`.
 */
export function useRepairBoard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [forcedEmpty, setForcedEmpty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);
    setForcedEmpty(false);

    try {
      const result = await mockFetch(async () => "ok" as const, "empty" as const);
      if (result === "empty") setForcedEmpty(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg === "mock_offline") setIsOffline(true);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { loading, error, isOffline, forcedEmpty, reload: load };
}
