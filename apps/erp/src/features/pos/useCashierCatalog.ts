import { useState, useEffect, useCallback } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";

export interface PosVariant {
  sku: string;
  size: string;
  color_ar: string;
  color_en: string;
  barcode: string;
  price: number;
  stock: number;
}

export interface PosItem {
  item_id: string;
  name_ar: string;
  name_en: string;
  barcode?: string | null;
  price?: number;
  price_per_kg?: number;
  tax_type_id: string;
  eta_code: string;
  uom_id: string;
  stock?: number;
  stock_kg?: number;
  sold_by: "unit" | "weight";
  category: string;
  is_model?: boolean;
  variants?: PosVariant[];
}

interface PosFixture {
  pos_items: PosItem[];
}

interface UseCashierCatalogResult {
  items: PosItem[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  reload: () => void;
}

export function useCashierCatalog(): UseCashierCatalogResult {
  const [items, setItems] = useState<PosItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const fixture = await mockFetch<PosFixture>(
        () => loadFixture<PosFixture>("pos"),
        { pos_items: [] }
      );
      setItems(fixture.pos_items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg === "mock_offline") {
        setIsOffline(true);
        try {
          const cached = await loadFixture<PosFixture>("pos");
          setItems(cached.pos_items);
        } catch {
          setItems([]);
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, isOffline, reload: load };
}
