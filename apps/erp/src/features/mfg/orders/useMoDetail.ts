import { useEffect, useState, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";
import { useMfgOrders } from "@/stores/mfgOrders";

/** Five-states signal for the MO detail (`?mock=loading|error|offline`), mirroring
 * `useWorkOrderDetail` — the MO itself lives in `useMfgOrders`, this hook only decides
 * which state wraps it. */
export function useMoDetail(id: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const order = useMfgOrders((s) => s.orders[id]);

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

  const notFound = !loading && !error && !order;

  return { order, notFound, loading, error, isOffline, reload: load };
}
