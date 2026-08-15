import { useState, useEffect, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";

/** Five-states signal for the device-types list (`?mock=loading|empty|error|no_results|offline`),
 * mirroring `useBomList` — device types are read live from `usePlayDeviceTypes`, this hook only
 * decides which wrapper-state to render around that live data. */
export function useDeviceTypesList() {
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
