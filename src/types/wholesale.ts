/**
 * FE_13 Wholesale & Distribution — entity types, derived exactly from
 * src/lib/mock/fixtures/whl.fixtures.json (no invented fields).
 */

// ── Reference data (uoms, items, price list headers) ──────────────────

export interface Uom {
  id: string;
  name_ar: string;
  name_en: string;
  factor: number;
  is_base: boolean;
}

export interface WholesaleItem {
  id: string;
  name_ar: string;
  name_en: string;
  sku: string;
  base_uom: string;
  wholesale_uom: string;
  min_sale_qty: number;
  eta_code: string;
  tax_type_id: string;
  image: string;
  _flag?: "eta_code_missing";
}

export interface WholesalePriceListHeader {
  id: string;
  name_ar: string;
  name_en: string;
  is_default: boolean;
}

export interface WholesaleWarehouse {
  id: string;
  name_ar: string;
  name_en: string;
  type: "storage" | "van";
  branch_id: string;
  rep_id?: string;
  plate?: string;
}

// ── Price tiers ──────────────────────────────────────────────────────

export interface PriceTier {
  id: string;
  from_qty: number;
  to_qty: number | null;
  mode: "price" | "discount_pct";
  value: number;
}

export interface PriceListLine {
  price_list_id: string;
  item_id: string;
  base_price: number;
  tier_uom: string;
  tiers: PriceTier[];
  _validation_demo?: "gap" | "overlap";
}

// ── Customers (wholesale-scoped view — credit policy, route, reservations) ──

export type CreditPolicy = "warn" | "block" | "override";

export interface WholesaleCustomer {
  id: string;
  name_ar: string;
  name_en: string;
  type: "b2b" | string;
  trn: string;
  phone: string;
  address_ar: string;
  price_list_id: string;
  credit_limit: number;
  credit_policy: CreditPolicy;
  net_days: number;
  ar_balance: number;
  reserved: number;
  route_id: string;
  _flag?: "over_limit" | "trn_missing";
}

export interface AgingBucket {
  customer_id: string;
  current: number;
  d1_30: number;
  d31_60: number;
  d60_plus: number;
}

// ── Routes & visits ───────────────────────────────────────────────────

export interface RouteCustomerRef {
  customer_id: string;
  sequence: number;
}

export interface Route {
  id: string;
  name_ar: string;
  name_en: string;
  rep_id: string;
  branch_id: string;
  visit_days: string[];
  status: "active" | string;
  customers: RouteCustomerRef[];
}

export type VisitStatus = "scheduled" | "sold" | "no_order" | "closed" | "deferred";

export interface Visit {
  id: string;
  date: string;
  route_id: string;
  rep_id: string;
  customer_id: string;
  sequence: number;
  status: VisitStatus;
  doc_id: string | null;
  note: string;
  no_order_reason?: string;
}

// ── Van stock, loads & shifts ────────────────────────────────────────

export interface VanStockEntry {
  warehouse_id: string;
  item_id: string;
  qty_base: number;
  avg_cost: number;
}

export interface VanLoadLine {
  item_id: string;
  uom_id: string;
  qty_sent: number;
  qty_received: number;
  variance?: number;
}

export type VanLoadStatus = "sent" | "received" | "dispute";

export interface VanLoad {
  id: string;
  type: "load" | "return";
  number: string;
  date: string;
  rep_id: string;
  from_warehouse: string;
  to_warehouse: string;
  shift_id: string;
  status: VanLoadStatus;
  lines: VanLoadLine[];
  /** FE_13 §10 — how a dispute was resolved: adjusted the sent qty to match
   * what actually arrived, or accepted the variance (with a reason) as-is. */
  resolution?: { type: "adjust_sent" | "accept_variance"; reason: string; resolved_at: string };
  _flag?: "dispute_open";
}

export interface GoodsVariance {
  item_id: string;
  expected_base: number;
  counted_base: number;
  variance_base: number;
  reason: string;
}

export type VanShiftStatus = "open" | "closed" | "closed_with_variance";

export interface VanShift {
  id: string;
  type: "van";
  rep_id: string;
  warehouse_id: string;
  treasury_id: string;
  opened_at: string;
  closed_at: string | null;
  status: VanShiftStatus;
  opening_float: number;
  cash_sales: number;
  collections: number;
  expected_cash: number;
  declared_cash?: number;
  cash_variance?: number;
  goods_variance?: GoodsVariance[];
  commission_estimate?: number;
  settlement_status?: "pending_approval" | "approved" | string;
  pending_sync_count?: number;
  /** User id who closed/settled the shift — SoD (FE_13 §8): the variance
   * approver must be a different user. */
  settled_by?: string;
  /** User id who approved a variance settlement, once approved. */
  approved_by?: string;
}

// ── Sales orders & delivery notes ────────────────────────────────────

export type SalesOrderStatus =
  | "draft" | "approved" | "picking" | "partial" | "delivered" | "invoiced" | "cancelled";

export interface SalesOrderLine {
  item_id: string;
  qty: number;
  uom_id: string;
  unit_price: number;
  tier_id: string | null;
  discount: number;
  tax_type_id: string;
  line_total: number;
  _flag?: "tier_gap";
}

export interface SalesOrderTotals {
  subtotal: number;
  discount: number;
  taxable_base: number;
  tax: number;
  grand_total: number;
}

export interface SalesOrder {
  id: string;
  number: string;
  date: string;
  customer_id: string;
  warehouse_id: string;
  delivery_date: string;
  rep_id: string;
  route_id: string;
  price_list_id: string;
  status: SalesOrderStatus;
  credit_reservation_id: string | null;
  invoice_id?: string;
  cancel_reason?: string;
  lines: SalesOrderLine[];
  totals: SalesOrderTotals;
  delivered_pct: number;
}

export interface DeliveryNoteLine {
  item_id: string;
  uom_id: string;
  qty_ordered: number;
  qty_delivered_before: number;
  qty_picked: number;
  qty_remaining: number;
}

export type DeliveryNoteStatus = "draft" | "delivered";

export interface DeliveryNote {
  id: string;
  number: string;
  order_id: string;
  date: string;
  warehouse_id: string;
  status: DeliveryNoteStatus;
  receiver_name: string;
  note?: string;
  /** Set once a note has been included in an invoice (FE_13 §6) — prevents
   * double-invoicing the same delivered qty. */
  invoice_id?: string | null;
  lines: DeliveryNoteLine[];
}

// ── Credit reservations ──────────────────────────────────────────────

export interface CreditReservation {
  id: string;
  customer_id: string;
  order_id: string;
  amount: number;
  status: "reserved" | string;
  created_at: string;
}

// ── Collections ──────────────────────────────────────────────────────

export interface CollectionAllocation {
  invoice_id: string;
  amount: number;
}

export interface Collection {
  id: string;
  number: string;
  date: string;
  customer_id: string;
  rep_id: string;
  shift_id: string;
  amount: number;
  payment_method: string;
  allocations: CollectionAllocation[];
  unallocated: number;
  _flag?: "on_account";
}

// ── Offline sync queue ───────────────────────────────────────────────

export type SyncOpKind = "sale" | "collection" | "visit_update" | "return";
export type SyncOpStatus = "synced" | "pending" | "rejected";

export interface SyncOpPriceLine {
  item_id: string;
  uom_id: string;
  qty: number;
  price: number;
}

export interface SyncOp {
  id: string;
  /** Per-shift, terminal-style numbering (FE_13 §15 — "reused from FE_09"),
   * e.g. `sh_van_301-OP-4`. Distinct from `client_uuid`, which is the
   * idempotency key; this is just a human-readable sequence. */
  number: string;
  op: SyncOpKind;
  shift_id: string;
  client_uuid: string;
  created_at: string;
  status: SyncOpStatus;
  reason_ar?: string;
  reason_en?: string;
  /** Conflict-policy snapshots (FE_13 §15) — price list at bundle-load time,
   * re-validated against the *current* price list on sync. Only "sale" ops
   * carry one; a mismatch rejects the op with a plain-Arabic reason. */
  customer_id?: string;
  price_snapshot?: SyncOpPriceLine[];
  /** Available credit at commit time, for sale ops that used a credit tender. */
  credit_snapshot?: number;
}

// ── Reps ───────────────────────────────────────────────────────────────

export interface Rep {
  id: string;
  name_ar: string;
  name_en: string;
  van_id: string;
  commission_scheme_id: string;
}

// ── Audit ────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  action: string;
  entity: string;
  detail_ar: string;
  detail_en: string;
}

// ── No-order reasons (visit close reasons) ─────────────────────────────

export interface NoOrderReason {
  id: string;
  name_ar: string;
  name_en: string;
}
