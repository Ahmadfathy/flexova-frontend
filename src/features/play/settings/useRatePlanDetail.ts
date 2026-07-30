import { useEffect, useState, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";
import { usePlayRatePlans } from "@/stores/playRatePlans";

/** Five-states signal for the rate-plan editor (`?mock=loading|error|offline`) when editing
 * an existing plan, mirroring `useBomDetail`. */
export function useRatePlanDetail(id: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const ratePlan = usePlayRatePlans((s) => s.ratePlans[id]);

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

  const notFound = !loading && !error && !ratePlan;

  return { ratePlan, notFound, loading, error, isOffline, reload: load };
}
