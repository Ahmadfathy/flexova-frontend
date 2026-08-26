/**
 * Mock permissions hook — returns can() that always grants all inventory actions.
 * Replace with a real store-backed implementation when the auth module is built.
 *
 * Permission strings are used ad hoc by feature code (not a registry in this
 * file — see the FE_08 admin catalog, `src/lib/mock/fixtures/permissions.fixtures.json`,
 * for modules that have opted into real role-gating). DD-1 introduced
 * `inventory.item.variants`. DD-2 (Batch/Expiry) adds:
 *   - `inventory.batch.manual_pick`    — see & use the manual batch picker on issue
 *   - `inventory.batch.issue_override` — issue an expired/hold batch (requires a reason)
 *   - `inventory.batch.hold`           — set/release a batch hold
 *   - `inventory.batch.quarantine`     — quarantine to wh_damaged + write-off
 * DD-3 (Costing) adds:
 *   - `inventory.cost.view`            — see unit cost, cost layers, valuation, margin (SoD-sensitive)
 *   - `inventory.cost.export`          — export the valuation report
 *   - `inventory.costing.overage_cost` — override the unit cost of a stocktake overage
 *   - `inventory.costing.method_edit`  — change per-item or tenant default costing method
 */
export function useCan() {
  return (_permission: string): boolean => true;
}
