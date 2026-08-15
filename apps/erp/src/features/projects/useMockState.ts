import { useState, useEffect, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";

/**
 * Shared five-states signal (`?mock=loading|empty|error|no_results|offline`) for any
 * FE_16 screen whose underlying data is read live from a store/fixture (not fetched) —
 * this hook only decides which wrapper-state to render, mirroring `useMoList`/
 * `useProjectsList`. `no_results` is always derived by the page itself.
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
