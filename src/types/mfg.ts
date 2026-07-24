/**
 * FE_14 Manufacturing — entity types, derived exactly from
 * src/lib/mock/fixtures/mfg.fixtures.json (no invented fields).
 */

export interface MfgWarehouse {
  id: string;
  name_ar: string;
  name_en: string;
  type: "storage" | "wip";
  logical?: boolean;
}

export interface MfgBalance {
  warehouse_id: string;
  qty: number;
}

export interface MfgItem {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  item_type: "manufactured" | "stocked" | "service";
  base_uom: string;
  tax_type_id?: string;
  eta_code?: string | null;
  incomplete?: boolean;
  avg_cost: number;
  last_purchase_price?: number;
  balances: MfgBalance[];
}

export interface MfgScrapReason {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface MfgOverhead {
  method: "percent_materials" | "fixed" | "rate_hours";
  value: number;
  computed?: number;
}

export interface BomComponent {
  item_id: string;
  qty: number;
  uom: string;
  expected_scrap_pct: number;
  _edited?: boolean;
}

export interface BomTemplate {
  id: string;
  output_item_id: string;
  name_ar: string;
  name_en: string;
  ref_qty: number;
  status: "active" | "archived";
  overhead_default: MfgOverhead;
  components: BomComponent[];
  stages_template: string[];
}

export interface MoStage {
  id: string;
  name_ar: string;
  order: number;
  assignee_id: string | null;
  status: "pending" | "in_progress" | "done";
  started_at: string | null;
  ended_at: string | null;
}

export interface MaterialIssueLine {
  item_id: string;
  qty: number;
  from_wh: string;
  unit_cost: number;
}

export interface MaterialIssue {
  id: string;
  type: "backflush" | "manual";
  receipt_id?: string;
  lines: MaterialIssueLine[];
}

export interface LaborEntry {
  id: string;
  employee_id: string | null;
  stage_id: string;
  hours: number;
  cost: number;
}

export interface ScrapEntry {
  id: string;
  stage_id: string;
  item_id: string;
  qty: number;
  reason_id: string;
  note?: string;
}

export interface FinishedReceipt {
  id: string;
  qty_good: number;
  to_wh: string;
  unit_cost: number;
  date: string;
}

export interface CostSummary {
  materials: number;
  labor: number;
  overhead: number;
  scrap_effect: number;
  total: number;
  received: number;
  unit_cost: number;
}

export interface MaterialShortage {
  item_id: string;
  required: number;
  available: number;
  note?: string;
}

export type MoStatus = "draft" | "approved" | "in_progress" | "partial" | "done" | "cancelled";

export interface ManufacturingOrder {
  id: string;
  number: string;
  output_item_id: string;
  qty_ordered: number;
  qty_received: number;
  source_template_id: string | null;
  customer_order_id: string | null;
  wh_raw: string;
  wh_wip: string;
  wh_finished: string;
  issue_mode: "backflush" | "manual";
  status: MoStatus;
  _case?: string;
  _note?: string;
  order_bom: BomComponent[];
  stages: MoStage[];
  material_issues: MaterialIssue[];
  labor_entries: LaborEntry[];
  overhead: MfgOverhead;
  scrap: ScrapEntry[];
  finished_receipts: FinishedReceipt[];
  cost_summary: CostSummary;
  material_shortage?: MaterialShortage[];
  /** Free-text note (FE_14 §7.1) — not in the v1 fixture, set/edited from the Overview tab. */
  notes?: string;
}

export interface MfgDashboardAlert {
  type: string;
  mo: string;
  text_ar: string;
  text_en: string;
}

export interface MfgDashboard {
  kpis: {
    orders_in_progress: number;
    orders_awaiting_start: number;
    wip_value: number;
    scrap_value_month: number;
    orders_overdue: number;
  };
  alerts: MfgDashboardAlert[];
}

export interface JournalLine {
  account: string;
  dr: number;
  cr: number;
}

export interface JournalPreviewEntry {
  event: string;
  mo: string;
  lines: JournalLine[];
}
