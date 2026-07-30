import { useEffect, useState, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";

/** Five-states signal for the sector-settings screen (`?mock=loading|error|offline`) — a
 * single-record settings form, so only loading/error/offline apply (no empty/no-results,
 * mirroring how `BomEditorPage`'s single-entity screen skips those too). */
export function useSectorSettingsScreen() {
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
