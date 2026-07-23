import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCollections } from "@/lib/mock/wholesale";
import type { Collection } from "@/types/wholesale";

interface WholesaleCollectionsState {
  collections: Collection[];
  addCollection: (c: Collection) => void;
}

/**
 * Collections with per-invoice allocation (FE_13 §3.4) — seeded from the fixture's
 * own history (incl. `col_7700`, deliberately left `unallocated: 1000`/`_flag:
 * "on_account"` as a demo of the same on-account confirm path this store's writes
 * go through). An invoice's live "outstanding" is this store's own allocations
 * subtracted from FE_02's static `balance` — see `getOutstandingForInvoice`.
 */
export const useWholesaleCollections = create<WholesaleCollectionsState>()(
  persist(
    (set) => ({
      collections: getCollections(),
      addCollection: (c) => set((s) => ({ collections: [c, ...s.collections] })),
    }),
    { name: "flexova.wholesale.collections" },
  ),
);

export function nextCollectionNumber(collections: Collection[]): string {
  const max = collections.reduce((m, c) => {
    const n = parseInt(c.number.replace(/\D/g, ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 7700);
  return `WH-COL-${max + 1}`;
}

/** Sum of every collection's allocations against one invoice — used to derive a
 * live outstanding balance from FE_02's static `sales.fixtures.json` figure
 * without needing a writable invoices store (none exists in this codebase). */
export function getAllocatedTotal(collections: Collection[], invoiceId: string): number {
  return collections.reduce((sum, c) => {
    const alloc = c.allocations.find((a) => a.invoice_id === invoiceId);
    return sum + (alloc?.amount ?? 0);
  }, 0);
}
