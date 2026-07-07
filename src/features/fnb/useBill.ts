import { useState, useEffect, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";

/**
 * Five-states signal for the Bill screen (`?mock=loading|empty|error|offline`),
 * mirroring `useFloorPlan`/`useKds` — the check itself is read live from
 * `useFnbOrder`, this hook only decides which of the five states wraps it.
 */
export function useBill() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      await mockFetch(async () => "ok" as const, "ok" as const);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg === "mock_offline") setIsOffline(true);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { loading, error, isOffline, reload: load };
}
