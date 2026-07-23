/**
 * FE_13 §15 — the van offline layer: one shared IndexedDB database with three
 * object stores (`bundle`, `queue`, `meta`), plus the pure conflict-policy
 * functions the sync queue store re-validates against.
 *
 * Supersedes the old `lib/wholesale/offlineBundle.ts` (bundle/meta only) —
 * consolidated here so the queue can share the exact same DB connection
 * instead of opening its own (which is what caused the multi-store bug this
 * module already fixed once: two independent `indexedDB.open()` calls for the
 * same DB name race two upgrades, and only the first caller's store survives).
 */
import { get, set, del, type UseStore } from "idb-keyval";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import {
  getVisits, getVanStock, getItems, getPriceListLines, getCustomers,
} from "@/lib/mock/wholesale";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";
import type {
  Visit, VanStockEntry, WholesaleItem, PriceListLine, WholesaleCustomer, SyncOpPriceLine,
} from "@/types/wholesale";

const DB_NAME = "flexova-van";
const STORE_NAMES = ["bundle", "queue", "meta"] as const;
type VanIdbStore = (typeof STORE_NAMES)[number];

/**
 * idb-keyval's own `createStore(dbName, storeName)` opens its own `indexedDB.open`
 * request per call — calling it more than once for the same `dbName` races
 * independent upgrades, so only whichever call creates the DB first gets its
 * object store; the rest silently never exist ("object store not found" on
 * first use). All three stores are created together in one `onupgradeneeded`.
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
function storeFor(name: VanIdbStore): UseStore {
  return (txMode, callback) => getDb().then((db) => callback(db.transaction(name, txMode).objectStore(name)));
}
const bundleStore = storeFor("bundle");
const queueStore = storeFor("queue");
const metaStore = storeFor("meta");

// ── Bundle (FE_13 §2.5 — offline prefetch at shift open) ─────────────────

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

// ── Queue persistence (FE_13 §15 — IndexedDB, not localStorage) ──────────

/** A zustand `persist` storage adapter backed by the `queue` IndexedDB store.
 * idb-keyval stores structured-cloneable values directly, so this implements
 * the raw `PersistStorage` interface rather than going through
 * `createJSONStorage` (no JSON string round-trip needed). */
export function vanQueueStorage<S>(): PersistStorage<S> {
  return {
    getItem: async (name) => {
      const value = await get(name, queueStore);
      return (value as StorageValue<S> | undefined) ?? null;
    },
    setItem: async (name, value) => { await set(name, value, queueStore); },
    removeItem: async (name) => { await del(name, queueStore); },
  };
}

/** Per-shift, terminal-style numbering (FE_13 §15 — "reused from FE_09"'s own
 * `${terminal.number_prefix}-${seq}` ticket numbers), e.g. `sh_van_301-OP-4`. */
export function nextOpNumber(existingForShift: { number: string }[], shiftId: string): string {
  const max = existingForShift.reduce((m, e) => {
    const match = /-OP-(\d+)$/.exec(e.number);
    const n = match ? parseInt(match[1], 10) : 0;
    return Math.max(m, n);
  }, 0);
  return `${shiftId}-OP-${max + 1}`;
}

// ── Conflict policy (FE_13 §15) ───────────────────────────────────────────
// Van stock itself is authoritative on the van (the rep owns it) — a sale is
// never rejected for a stock reason. Only price and credit snapshots, taken
// at bundle-load time, are re-validated against current data on sync.

export interface RevalidationResult {
  ok: boolean;
  reasonAr?: string;
  reasonEn?: string;
}

/** Re-checks a sale's snapshotted line prices against what `resolvePrice`
 * would return right now for the same item/qty/uom/customer. */
export function revalidatePriceSnapshot(
  snapshot: SyncOpPriceLine[] | undefined,
  currentPriceOf: (line: SyncOpPriceLine) => number,
): RevalidationResult {
  if (!snapshot || snapshot.length === 0) return { ok: true };
  for (const line of snapshot) {
    const current = currentPriceOf(line);
    if (Math.abs(current - line.price) > 0.005) {
      return {
        ok: false,
        reasonAr: `تغيّر سعر صنف في الفاتورة منذ تحميل الوردية (كان ${line.price}، أصبح ${current}) — راجع الفاتورة وأعد المزامنة`,
        reasonEn: `An item's price changed since the shift's data was loaded (was ${line.price}, now ${current}) — review the sale and retry`,
      };
    }
  }
  return { ok: true };
}

/** Re-checks a sale's snapshotted available-credit figure (captured at
 * commit time) against the customer's current available credit. */
export function revalidateCreditSnapshot(
  snapshot: number | undefined,
  currentAvailable: number,
): RevalidationResult {
  if (snapshot == null) return { ok: true };
  if (currentAvailable < 0) {
    return {
      ok: false,
      reasonAr: "تجاوز العميل حد الائتمان منذ آخر تحميل — راجع البيع الآجل مع العميل",
      reasonEn: "The customer exceeded their credit limit since the last load — review the credit sale with them",
    };
  }
  return { ok: true };
}
