import type { ManufacturingOrder, MfgItem, MaterialIssueLine, MoStatus, MfgOverhead } from "@/types/mfg";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** FE_14 §3 — `overhead = fixed | materials × pct | rate × hours`. */
export function computeOverheadAmount(method: MfgOverhead["method"], value: number, materials: number, totalHours: number): number {
  if (method === "fixed") return value;
  if (method === "percent_materials") return round2(materials * (value / 100));
  if (method === "rate_hours") return round2(value * totalHours);
  return 0;
}

export interface ReceiptPreview {
  /** New backflush lines this receipt would create — empty when issue_mode=manual
   * (material for manual orders is already issued ahead of time via the stage modal). */
  issueLines: MaterialIssueLine[];
  issueCost: number;
  laborTotal: number;
  overheadAmount: number;
  materialsAfter: number;
  totalAfter: number;
  unitCostAfter: number;
  /** This receipt's own Dr Inventory-Finished / Cr WIP value — qty_good × the new order-average unit cost. */
  receiptAmount: number;
  newQtyReceived: number;
  newStatus: MoStatus;
}

/**
 * Pure preview of what a finished-receipt of `qtyGood` units would do to an MO's
 * cost_summary — used by both the modal (preview, before confirm) and the store
 * action (to actually commit), so the preview can never drift from what gets booked.
 */
export function computeReceiptPreview(mo: ManufacturingOrder, items: MfgItem[], qtyGood: number): ReceiptPreview {
  const issueLines: MaterialIssueLine[] = mo.issue_mode === "backflush"
    ? mo.order_bom.map((line) => {
        const item = items.find((i) => i.id === line.item_id);
        return { item_id: line.item_id, qty: round2(line.qty * qtyGood), from_wh: mo.wh_raw, unit_cost: item?.avg_cost ?? 0 };
      })
    : [];

  const issueCost = round2(issueLines.reduce((sum, l) => sum + l.qty * l.unit_cost, 0));
  const materialsAfter = round2(mo.cost_summary.materials + issueCost);
  const laborTotal = mo.cost_summary.labor;
  const totalHours = mo.labor_entries.reduce((sum, l) => sum + l.hours, 0);
  const overheadAmount = computeOverheadAmount(mo.overhead.method, mo.overhead.value, materialsAfter, totalHours);
  const totalAfter = round2(materialsAfter + laborTotal + overheadAmount);
  const newQtyReceived = mo.qty_received + qtyGood;
  const unitCostAfter = newQtyReceived > 0 ? round2(totalAfter / newQtyReceived) : 0;
  const receiptAmount = round2(qtyGood * unitCostAfter);
  const newStatus: MoStatus = newQtyReceived >= mo.qty_ordered ? "done" : "partial";

  return { issueLines, issueCost, laborTotal, overheadAmount, materialsAfter, totalAfter, unitCostAfter, receiptAmount, newQtyReceived, newStatus };
}

export interface JournalLinePreview {
  event: "material_issue" | "labor" | "overhead" | "finished_receipt";
  lines: { account: string; dr: number; cr: number }[];
}

/** Shape matches `mfg.fixtures.json`'s `journal_preview` exactly (FE_14 §3/§7.5). */
export function buildJournalPreview(preview: ReceiptPreview): JournalLinePreview[] {
  const entries: JournalLinePreview[] = [];
  if (preview.issueCost > 0) {
    entries.push({ event: "material_issue", lines: [
      { account: "WIP", dr: preview.issueCost, cr: 0 },
      { account: "Inventory-Raw", dr: 0, cr: preview.issueCost },
    ] });
  }
  if (preview.laborTotal > 0) {
    entries.push({ event: "labor", lines: [
      { account: "WIP", dr: preview.laborTotal, cr: 0 },
      { account: "Wages-Payable", dr: 0, cr: preview.laborTotal },
    ] });
  }
  if (preview.overheadAmount > 0) {
    entries.push({ event: "overhead", lines: [
      { account: "WIP", dr: preview.overheadAmount, cr: 0 },
      { account: "Overhead-Applied", dr: 0, cr: preview.overheadAmount },
    ] });
  }
  entries.push({ event: "finished_receipt", lines: [
    { account: "Inventory-Finished", dr: preview.receiptAmount, cr: 0 },
    { account: "WIP", dr: 0, cr: preview.receiptAmount },
  ] });
  return entries;
}
