/**
 * FE_15 Time-based / Play — entity types, derived exactly from
 * src/lib/mock/fixtures/play.fixtures.json (no invented fields).
 */

export type SessionMode = "postpaid" | "prepaid";
export type SessionState = "active" | "paused" | "closing" | "paid" | "cancelled";
export type DeviceOccupancy = "station" | "ticket";
export type DeviceState = "free" | "busy" | "reserved" | "out_of_service" | "paused";
export type PlayMode = "single" | "double";
export type RateUnit = "minute" | "15m" | "30m" | "hour";
export type Rounding = "ceil" | "nearest" | "floor";
export type PrepaidCafeteriaBilling = "separate" | "combined";
export type PeakCrossingNotify = "silent" | "notify";

export interface RateWindow {
  days: string[];
  from: string;
  to: string;
}

export interface ServiceItem {
  id: string;
  name_ar: string;
  name_en: string;
  type: "service";
  tax_type: string;
  eta_code: string;
  _flag?: string;
}

export interface RateRule {
  id: string;
  price_per_unit: number;
  window: RateWindow | null;
  play_mode: PlayMode | null;
  priority: number;
}

export interface PrepaidBlock {
  id: string;
  name_ar: string;
  name_en: string;
  duration_min: number;
  price: number;
  validity_window: RateWindow | null;
}

export interface RatePlan {
  id: string;
  name_ar: string;
  name_en: string;
  unit: RateUnit;
  rounding: Rounding;
  min_units: number;
  rules: RateRule[];
  prepaid_blocks: PrepaidBlock[];
}

export interface DeviceType {
  id: string;
  name_ar: string;
  name_en: string;
  occupancy: DeviceOccupancy;
  rate_plan_id: string;
  service_item_id: string;
  icon: string;
  color: string;
  play_mode_tags: PlayMode[];
}

export interface Device {
  id: string;
  name: string;
  device_type_id: string;
  branch_id: string;
  state: DeviceState;
  notes: string;
}

export interface TimeSegment {
  id: string;
  device_id: string | null;
  start: string;
  stop: string | null;
  rule_id: string | null;
  price_per_unit: number;
  billable_units?: number;
  subtotal?: number;
  _note?: string;
}

export interface SessionCustomer {
  name: string;
  phone: string;
  /** Not a fixture field — threaded through from the picked CRM customer's own `trn` (§5.7
   * needs "B2B when the customer has a TRN"; CRM customers already carry one, Play's
   * walk-in-shaped customer just never had anywhere to keep it until now). */
  trn?: string;
}

export interface Session {
  id: string;
  mode: SessionMode;
  state: SessionState;
  device_id: string | null;
  device_type_id: string;
  customer: SessionCustomer | null;
  supervisor_id: string | null;
  play_mode: PlayMode | null;
  check_id: string;
  segments: TimeSegment[];
  block_id?: string;
  block_duration_min?: number;
  prepaid_receipt_id?: string;
  document_id?: string;
  eta_status?: string;
  cancel_reason?: string;
  reversal_doc_id?: string;
  _flag?: string;
}

export interface CafeteriaLine {
  product_id: string;
  name_ar: string;
  qty: number;
  unit_price: number;
  line_total: number;
  /** Not a fixture field — set once at add-time from `Product.has_bom`, mirroring F&B's own
   * `FnbCheckLine.eta_code_missing` convention (a flag carried from product to line, never
   * blocking, never re-derived afterward). BOM depletion itself isn't modeled for Play (no
   * ingredient-stock store here); this only marks the line as BOM-based for display. */
  has_bom?: boolean;
}

export interface Check {
  id: string;
  session_id: string;
  cafeteria_lines: CafeteriaLine[];
  closed?: boolean;
  _note?: string;
}

export interface Product {
  id: string;
  name_ar: string;
  name_en: string;
  price: number;
  has_bom: boolean;
  _flag?: string;
}

export interface Branch {
  id: string;
  name_ar: string;
  name_en: string;
  num_prefix: string;
}

export interface Shift {
  id: string;
  branch_id: string;
  terminal_id: string;
  state: string;
  opened_at: string;
  cashier_id: string;
}

export interface SectorSettings {
  prepaid_cafeteria_billing: PrepaidCafeteriaBilling;
  peak_crossing_notify: PeakCrossingNotify;
  prepaid_block_threshold_min: number;
  hr_commission_enabled: boolean;
}
