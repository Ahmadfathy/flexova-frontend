import type { ManufacturingOrder, MfgItem } from "@/types/mfg";

export interface LineAvailability {
  item_id: string;
  required: number;
  available: number;
  /** Curated (from the fixture's own `material_shortage`) or a hard required>available check. */
  short: boolean;
  note?: string;
}

/**
 * Per Order-BOM-line stock check (FE_14 §7.1/§7.2). Prefers the MO's own curated
 * `material_shortage` entry when one exists for that item — MO-0102's lacquer-paint
 * line is flagged there even though 4L available ≥ 2L required, because the fixture's
 * intent is "enough now but low" (an advisory nuance no generic formula should invent).
 * Every other line falls back to a plain required-vs-available check so a freshly
 * created draft/approved order still gets real shortage detection.
 */
export function resolveLineAvailability(mo: ManufacturingOrder, items: MfgItem[]): LineAvailability[] {
  const remaining = Math.max(mo.qty_ordered - mo.qty_received, 0);

  return mo.order_bom.map((line) => {
    const curated = mo.material_shortage?.find((s) => s.item_id === line.item_id);
    const item = items.find((i) => i.id === line.item_id);
    const liveAvailable = item?.balances.find((b) => b.warehouse_id === mo.wh_raw)?.qty ?? 0;

    const required = curated?.required ?? line.qty * remaining;
    const available = curated?.available ?? liveAvailable;

    return {
      item_id: line.item_id,
      required,
      available,
      short: !!curated || required > available,
      note: curated?.note,
    };
  });
}
