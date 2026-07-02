import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";
import type { InventoryFixture } from "./types";

const EMPTY: InventoryFixture = {
  _meta: {
    module: "inventory", version: "1.0", currency: "EGP",
    tenant: { id: "", name_ar: "", name_en: "", eta_enabled: false, price_includes_tax: false },
    mock_states: [],
  },
  tax_types: [], uoms: [], categories: [], warehouses: [], branches: [],
  price_lists: [], items: [], ledger: [], stocktakes: [], transfers: [],
  adjustments: [], low_stock: [], import_template_columns: [],
  import_sample_result: { valid: 0, errors: [] }, barcode_templates: [],
};

interface UseItemsResult {
  data: InventoryFixture | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  reload: () => void;
  /** Apply a local (mock-layer) mutation to the loaded data without refetching. */
  mutate: Dispatch<SetStateAction<InventoryFixture | null>>;
}

export function useItems(): UseItemsResult {
  const [data, setData]       = useState<InventoryFixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const fixture = await mockFetch<InventoryFixture>(
        () => loadFixture<InventoryFixture>("inventory"),
        EMPTY
      );
      setData(fixture);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg === "mock_offline") {
        setIsOffline(true);
        // Simulate reading from local cache (load fixture directly)
        try {
          const cached = await loadFixture<InventoryFixture>("inventory");
          setData(cached);
        } catch {
          setData(EMPTY);
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, isOffline, reload: load, mutate: setData };
}
