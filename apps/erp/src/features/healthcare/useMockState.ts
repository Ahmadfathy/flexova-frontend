import { useState, useEffect, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";

/**
 * Shared five-states signal (`?mock=loading|empty|error|offline`) for Healthcare
 * screens whose data is read live from a store/fixture (not fetched) — mirrors
 * FE_16/FE_17's `useMockState`. `no_results` is always derived by the page itself.
 */
export function useMockState() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [forcedEmpty, setForcedEmpty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setIsOffline(false);
    setForcedEmpty(false);

    try {
      const result = await mockFetch(async () => "ok" as const, "empty" as const);
      if (result === "empty") setForcedEmpty(true);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "mock_offline") setIsOffline(true);
      else setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { loading, error, isOffline, forcedEmpty, reload: load };
}
