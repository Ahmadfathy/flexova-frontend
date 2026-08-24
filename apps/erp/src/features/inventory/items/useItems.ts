import { useCallback, useEffect, useReducer } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";
import type { InventoryFixture } from "./types";

const EMPTY: InventoryFixture = {
  _meta: {
    module: "inventory", version: "1.0", currency: "EGP",
    tenant: { id: "", name_ar: "", name_en: "", eta_enabled: false, price_includes_tax: false },
    mock_states: [],
  },
  tax_types: [], uoms: [], categories: [], warehouses: [], branches: [],
  price_lists: [], items: [], attributes: [], attribute_values: [], ledger: [], stocktakes: [], transfers: [],
  adjustments: [], low_stock: [], import_template_columns: [],
  import_sample_result: { valid: 0, errors: [] }, barcode_templates: [],
};

/**
 * DD-1 — module-level shared store, not per-component state.
 *
 * Reality: DD-1 is the first Inventory flow that creates data on one page
 * (QuickAddModal's has_variants toggle) and then navigates to a *different*
 * route (the new Item Editor) that expects to see it, and later navigates
 * back to the Items list expecting to see the save. Every consumer used to
 * call `loadFixture()` into its own local `useState`, so a mutation made in
 * one mounted component was invisible to any other — harmless while every
 * mutation (duplicate/suspend/delete) stayed within the one page that made
 * it, but silently discarded across a route change. Sharing the fixture at
 * module scope (subscribed via useSyncExternalStore-style listeners) fixes
 * that without changing the public useItems() API any screen already uses.
 */
let sharedData: InventoryFixture | null = null;
let sharedLoading = true;
let sharedError: string | null = null;
let sharedOffline = false;
let hasLoadedOnce = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function currentMockState(): string {
  return new URLSearchParams(window.location.search).get("mock") ?? "default";
}

async function load() {
  sharedLoading = true;
  sharedError = null;
  sharedOffline = false;
  notify();

  try {
    const fixture = await mockFetch<InventoryFixture>(() => loadFixture<InventoryFixture>("inventory"), EMPTY);
    sharedData = fixture;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg === "mock_offline") {
      sharedOffline = true;
      try {
        sharedData = await loadFixture<InventoryFixture>("inventory");
      } catch {
        sharedData = EMPTY;
      }
    } else {
      sharedError = msg;
    }
  } finally {
    sharedLoading = false;
    hasLoadedOnce = true;
    notify();
  }
}

interface UseItemsResult {
  data: InventoryFixture | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  reload: () => void;
  /** Apply a local (mock-layer) mutation to the loaded data without refetching. */
  mutate: (updater: InventoryFixture | ((prev: InventoryFixture | null) => InventoryFixture | null)) => void;
}

export function useItems(): UseItemsResult {
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    listeners.add(forceRender);
    // Re-fetch on mount only for a first-ever load or an explicit `?mock=`
    // simulation (loading/empty/error/offline) — those must always run so
    // per-page testing of the 5 mock states keeps working. A plain
    // navigation back to an already-loaded screen reuses the shared data
    // instead of overwriting it with the pristine fixture.
    if (!hasLoadedOnce || currentMockState() !== "default") {
      load();
    }
    return () => {
      listeners.delete(forceRender);
    };
  }, [forceRender]);

  const mutate = useCallback((updater: InventoryFixture | ((prev: InventoryFixture | null) => InventoryFixture | null)) => {
    sharedData = typeof updater === "function"
      ? (updater as (prev: InventoryFixture | null) => InventoryFixture | null)(sharedData)
      : updater;
    notify();
  }, []);

  const reload = useCallback(() => {
    hasLoadedOnce = false;
    load();
  }, []);

  return { data: sharedData, loading: sharedLoading, error: sharedError, isOffline: sharedOffline, reload, mutate };
}
