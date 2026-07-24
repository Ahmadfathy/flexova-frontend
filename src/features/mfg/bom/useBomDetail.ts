import { useEffect, useState, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";
import { useMfgBomTemplates } from "@/stores/mfgBomTemplates";

/** Five-states signal for the BOM template editor (`?mock=loading|error|offline`) when
 * editing an existing template, mirroring `useMoDetail`/`useWorkOrderDetail`. */
export function useBomDetail(id: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const template = useMfgBomTemplates((s) => s.templates[id]);

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

  const notFound = !loading && !error && !template;

  return { template, notFound, loading, error, isOffline, reload: load };
}
