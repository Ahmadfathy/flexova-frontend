/**
 * FE_13 §6 — live warehouse stock check for the picking screen.
 * Cross-reads Inventory.fixtures.json's ledger (shared item/warehouse ids with
 * whl.fixtures.json, e.g. it_rice @ wh_main) — the source of truth for "real"
 * stock, distinct from wholesale's own soft/informational reservations.
 */
import inventoryFixtures from "@/lib/mock/fixtures/Inventory.fixtures.json";

interface LedgerEntry {
  item_id: string;
  warehouse_id: string;
  date: string;
  running_balance: number;
}

/**
 * Latest known balance (base unit) for an item at a warehouse, from the
 * inventory ledger. `null` when no ledger entry exists — most wholesale items
 * only have movement history for `it_rice` @ `wh_main` in this fixture set,
 * so "unknown" is common; callers should not flag danger tone on unknown stock.
 */
function getLedgerBalanceBase(itemId: string, warehouseId: string): number | null {
  const entries = (inventoryFixtures.ledger as LedgerEntry[])
    .filter((e) => e.item_id === itemId && e.warehouse_id === warehouseId)
    .sort((a, b) => a.date.localeCompare(b.date));
  return entries.length ? entries[entries.length - 1].running_balance : null;
}

/**
 * Available stock (base unit), net of this-session's recorded stock-issue
 * movements (`issuedBase`) — never negative-clamped so a shortfall is visible.
 */
export function getAvailableStockBase(itemId: string, warehouseId: string, issuedBase: number): number | null {
  const balance = getLedgerBalanceBase(itemId, warehouseId);
  if (balance == null) return null;
  return balance - issuedBase;
}
