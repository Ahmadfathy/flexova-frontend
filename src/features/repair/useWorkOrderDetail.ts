import { useEffect, useState, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";
import { useRprWorkOrders } from "@/stores/rprWorkOrders";

/** Five-states signal for the Work Order detail (`?mock=loading|error|offline`), mirroring
 * `useServiceTicket` — the WO itself lives in `useRprWorkOrders`, this hook only decides
 * which state wraps it. */
export function useWorkOrderDetail(woId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const workOrder = useRprWorkOrders((s) => s.workOrders[woId]);

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

  const notFound = !loading && !error && !workOrder;

  return { workOrder, notFound, loading, error, isOffline, reload: load };
}
