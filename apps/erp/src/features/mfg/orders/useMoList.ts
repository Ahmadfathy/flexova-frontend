import { useState, useEffect, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";

/**
 * Five-states signal for the MO list (`?mock=loading|empty|error|no_results|offline`).
 * MOs are read live from `useMfgOrders` (a persisted store, not fetched) — this hook
 * only decides which wrapper-state to render around that live data, mirroring
 * `useRepairBoard`/`useMfgDashboard`. `no_results` is derived by the page itself from
 * search/filters yielding zero rows, not from this hook.
 */
export function useMoList() {
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
