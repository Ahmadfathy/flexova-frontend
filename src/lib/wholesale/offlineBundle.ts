/**
 * FE_13 §2.5/§15 — van offline prefetch bundle.
 * IndexedDB (idb-keyval) with three stores: bundle, queue, meta. `queue` itself
 * lives in `stores/wholesaleSyncQueue.ts` (in-memory + localStorage, mirroring
 * the rest of this module's mock stores) — this file owns `bundle`/`meta` only.
 */
import { get, set, type UseStore } from "idb-keyval";
import {
  getVisits, getVanStock, getItems, getPriceListLines, getCustomers,
} from "@/lib/mock/wholesale";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";
import type {
  Visit, VanStockEntry, WholesaleItem, PriceListLine, WholesaleCustomer,
} from "@/types/wholesale";

const DB_NAME = "flexova-van";
const STORE_NAMES = ["bundle", "meta"] as const;

/**
 * idb-keyval's own `createStore(dbName, storeName)` opens its own `indexedDB.open`
 * request per call — calling it twice for the same `dbName` races two independent
 * upgrades, so only whichever call creates the DB first gets its object store; the
 * second store silently never exists ("object store not found" on first use).
 * Both stores are created together in one `onupgradeneeded` here instead.
 */
let dbPromise: Promise<IDBDatabase> | null = null;
function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        for (const name of STORE_NAMES) {
          if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
function storeFor(name: (typeof STORE_NAMES)[number]): UseStore {
  return (txMode, callback) => getDb().then((db) => callback(db.transaction(name, txMode).objectStore(name)));
}
const bundleStore = storeFor("bundle");
const metaStore = storeFor("meta");

export interface VanBundle {
  visits: Visit[];
  van_stock: VanStockEntry[];
  items: WholesaleItem[];
  price_list_lines: PriceListLine[];
  customers: WholesaleCustomer[];
  payment_methods: typeof posFixtures.tender_types;
}

export const BUNDLE_STEPS = [
  { key: "visits", labelKey: "step_visits" },
  { key: "van_stock", labelKey: "step_van_stock" },
  { key: "items", labelKey: "step_items" },
  { key: "price_list_lines", labelKey: "step_price_lists" },
  { key: "customers", labelKey: "step_customers" },
  { key: "payment_methods", labelKey: "step_payment_methods" },
] as const;

export type BundleStepKey = (typeof BUNDLE_STEPS)[number]["key"];

/** Pulls one bundle step's data from the local fixtures/stores (synchronous —
 * there is no real network call here, only the simulated per-step delay the
 * caller adds for the progress modal). */
export function fetchBundleStepData(key: BundleStepKey, ctx: { repId: string; vanWarehouseId: string; date: string }) {
  switch (key) {
    case "visits":
      return getVisits().filter((v) => v.rep_id === ctx.repId && v.date === ctx.date);
    case "van_stock":
      return getVanStock().filter((s) => s.warehouse_id === ctx.vanWarehouseId);
    case "items":
      return getItems();
    case "price_list_lines":
      return getPriceListLines();
    case "customers":
      return getCustomers();
    case "payment_methods":
      return posFixtures.tender_types;
  }
}

export async function saveBundle(bundle: VanBundle): Promise<void> {
  await set("bundle", bundle, bundleStore);
  await set("saved_at", new Date().toISOString(), metaStore);
}

export async function loadBundle(): Promise<VanBundle | undefined> {
  return get("bundle", bundleStore);
}

export async function getBundleSavedAt(): Promise<string | undefined> {
  return get("saved_at", metaStore);
}

/** Rough on-disk size estimate (UTF-8 bytes of the JSON payload). */
export function estimateBundleSizeBytes(bundle: VanBundle): number {
  return new TextEncoder().encode(JSON.stringify(bundle)).length;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
