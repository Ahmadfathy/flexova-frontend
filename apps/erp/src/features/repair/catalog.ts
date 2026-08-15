import rprFixtures from "@/lib/mock/fixtures/rpr.fixtures.json";
import crmFixtures from "@/lib/mock/fixtures/crm.fixtures.json";
import accountingFixtures from "@/lib/mock/fixtures/accounting.fixtures.json";
import type { Lang } from "@/stores/appearance";
import type { PillVariant } from "@/components/patterns/StatusPill";

// ── Entities (FE_12 §2) ──────────────────────────────────────────────

export type RprWoStatus =
  | "pending_diagnosis" | "pending_approval" | "in_progress" | "ready" | "delivered" | "rejected";

export type RprDeviceType = "mobile" | "computer" | "appliance" | "vehicle";

export type RprApprovalStatus = "pending" | "approved" | "rejected";
export type RprApprovalChannel = "whatsapp" | "phone" | "in_person";

export interface RprDevice {
  type: RprDeviceType;
  brand: string;
  model: string;
  serial: string | null;
  intake_condition: string;
  accessories: string[];
  photos: string[];
  customer_id: string;
  chassis?: string;
  plate?: string;
  odometer?: number;
  _flag?: "device_no_serial";
}

export interface RprDiagnosis {
  result: string;
  proposed_work: string;
}

export interface RprQuotePartLine {
  part_id: string;
  qty: number;
  price: number;
}

export interface RprQuoteLaborLine {
  service_id: string;
  technician_id: string;
  price: number;
}

export interface RprQuote {
  part_lines: RprQuotePartLine[];
  labor_lines: RprQuoteLaborLine[];
  total: number;
  approval_status: RprApprovalStatus;
  approval_channel: RprApprovalChannel;
  sent_at?: string;
  approved_at?: string;
  rejected_at?: string;
}

export interface RprPartLine {
  part_id: string | null;
  adhoc_name?: string;
  qty: number;
  price: number;
  deducted: boolean;
  cost_as_warranty?: boolean;
  _flag?: "parts_adhoc" | "no_eta_code" | "negative_stock";
}

export interface RprLaborLine {
  service_id: string;
  technician_id: string;
  price: number;
}

export interface RprDeposit {
  amount: number;
  treasury_id: string;
  taken_at: string;
}

export interface RprDiagnosisFee {
  amount: number;
  charged: boolean;
}

export interface RprWorkOrder {
  id: string;
  number: string;
  status: RprWoStatus;
  customer_id: string;
  technician_id: string;
  device: RprDevice;
  reported_faults: string;
  diagnosis: RprDiagnosis | null;
  quote: RprQuote | null;
  part_lines: RprPartLine[];
  labor_lines: RprLaborLine[];
  deposit: RprDeposit | null;
  warranty_days: number;
  original_wo_id: string | null;
  final_doc_id: string | null;
  intake_at: string;
  promise_at: string;
  ready_at: string | null;
  delivered_at: string | null;
  warranty_expires_at?: string;
  diagnosis_fee?: RprDiagnosisFee;
  notes: string;
  _flag?: "under_warranty";
}

export type RprFinalDocLineKind = "part" | "service";

export interface RprFinalDocumentLine {
  kind: RprFinalDocLineKind;
  name_ar: string;
  qty: number;
  price: number;
  eta_code: string | null;
  _flag?: "no_eta_code";
}

export interface RprTender {
  method: string;
  amount: number;
}

export interface RprJournalLine {
  account_ar: string;
  account_en: string;
  debit: number;
  credit: number;
}

export interface RprFinalDocument {
  id: string;
  wo_id: string;
  customer_id: string;
  type: "e_receipt" | "e_invoice";
  lines: RprFinalDocumentLine[];
  parts_total: number;
  service_total: number;
  deposit_applied: number;
  net_due: number;
  payment_status: "paid" | "partial" | "unpaid";
  eta_status: "accepted" | "flagged_missing_code" | "queued" | "rejected";
  tender: RprTender[];
  posted: boolean;
  issued_at: string;
  /** Added at Step 4 — optional so the pre-seeded fixture docs (doc_rpr_5005/5007,
   * which predate release-flow implementation) still satisfy the type. */
  commission?: RprCommission[];
  journal?: RprJournalLine[];
}

/** Warranty is not a standalone fixture record — it's derived from a WorkOrder's own
 * warranty_days / warranty_expires_at / original_wo_id fields (period starts at delivery). */
export interface RprWarranty {
  days: number;
  expiresAt: string | null;
  originalWoId: string | null;
}

export function warrantyOf(wo: RprWorkOrder): RprWarranty {
  return {
    days: wo.warranty_days,
    expiresAt: wo.warranty_expires_at ?? null,
    originalWoId: wo.original_wo_id,
  };
}

// ── Reference data ───────────────────────────────────────────────────

export interface RprTechnician {
  id: string;
  name_ar: string;
  name_en: string;
  commission_rule_id: string;
  hr_employee_id: string;
}

export interface RprCommissionRule {
  id: string;
  name_ar: string;
  name_en: string;
  basis: "labor";
  type: "percent";
  value: number;
  source: string;
}

export interface RprPart {
  id: string;
  sku: string;
  name_ar: string;
  name_en: string;
  price: number;
  cost: number;
  stock: number;
  eta_code: string | null;
  is_stock: boolean;
  _flag?: "no_eta_code";
}

export interface RprLaborService {
  id: string;
  name_ar: string;
  name_en: string;
  price: number;
}

export interface RprSettings {
  diagnosis_fee: { enabled: boolean; amount: number };
  default_warranty_days: number;
  wo_numbering: { prefix: string; next: number };
  whatsapp_templates: { approval_request: string; ready_notice: string };
}

export const TECHNICIANS = rprFixtures.technicians as RprTechnician[];
export const COMMISSION_RULES = rprFixtures.commission_rules as RprCommissionRule[];
export const PARTS = rprFixtures.parts as RprPart[];
export const LABOR_SERVICES = rprFixtures.labor_services as RprLaborService[];
export const WORK_ORDERS = rprFixtures.work_orders as RprWorkOrder[];
export const FINAL_DOCUMENTS = rprFixtures.final_documents as RprFinalDocument[];
export const SETTINGS = rprFixtures.settings as RprSettings;

export function findTechnician(id: string | null | undefined): RprTechnician | undefined {
  return TECHNICIANS.find((t) => t.id === id);
}

export function findPart(id: string | null | undefined): RprPart | undefined {
  return PARTS.find((p) => p.id === id);
}

export function findLaborService(id: string | null | undefined): RprLaborService | undefined {
  return LABOR_SERVICES.find((s) => s.id === id);
}

export function findWorkOrder(id: string | null | undefined): RprWorkOrder | undefined {
  return WORK_ORDERS.find((w) => w.id === id);
}

export function technicianName(technician: RprTechnician | undefined, lang: Lang): string {
  if (!technician) return "";
  return lang === "ar" ? technician.name_ar : technician.name_en;
}

export function partName(part: RprPart | undefined, lang: Lang): string {
  if (!part) return "";
  return lang === "ar" ? part.name_ar : part.name_en;
}

export function laborServiceName(service: RprLaborService | undefined, lang: Lang): string {
  if (!service) return "";
  return lang === "ar" ? service.name_ar : service.name_en;
}

// ── Cross-module reference data (imported directly, local narrow shape —
// same convention as svc/catalog.ts's own CrmCustomer) ────────────────

export interface RprCustomer {
  id: string;
  type: "company" | "individual";
  name_ar: string;
  name_en: string;
  phone: string | null;
  /** Added at Step 4 for ETA B2B/B2C routing at release (mirrors svc/catalog.ts's own
   * CrmCustomer, which already kept `trn` — repair's Step 1-3 narrow shape had dropped it). */
  trn: string | null;
}

export interface RprTreasury {
  id: string;
  name_ar: string;
  name_en: string;
  type: string;
}

export const CUSTOMERS = crmFixtures.customers as RprCustomer[];
export const TREASURIES = accountingFixtures.treasuries as RprTreasury[];

export function findCustomer(id: string | null | undefined): RprCustomer | undefined {
  return CUSTOMERS.find((c) => c.id === id);
}

export function customerName(customer: RprCustomer | undefined, lang: Lang): string {
  if (!customer) return "";
  return lang === "ar" ? customer.name_ar : customer.name_en;
}

export function findTreasury(id: string | null | undefined): RprTreasury | undefined {
  return TREASURIES.find((tr) => tr.id === id);
}

export function treasuryName(treasury: RprTreasury | undefined, lang: Lang): string {
  if (!treasury) return "";
  return lang === "ar" ? treasury.name_ar : treasury.name_en;
}

// ── Board helpers ───────────────────────────────────────────────────

/** Kanban columns, in lifecycle order (FE_12 §3.1 — "rejected" is a terminal
 * side-branch, not part of the living-entity column flow; it still shows in list view). */
export const BOARD_STATUSES: RprWoStatus[] = [
  "pending_diagnosis", "pending_approval", "in_progress", "ready", "delivered",
];

export const ALL_STATUSES: RprWoStatus[] = [...BOARD_STATUSES, "rejected"];

const STATUS_PILL: Record<RprWoStatus, PillVariant> = {
  pending_diagnosis: "pending",
  pending_approval: "credit",
  in_progress: "in-progress",
  ready: "active",
  delivered: "approved",
  rejected: "rejected",
};

export function statusPillVariant(status: RprWoStatus): PillVariant {
  return STATUS_PILL[status] ?? "default";
}

/** Overdue = still open (not delivered/rejected) and past its promise date. */
export function isOverdue(wo: RprWorkOrder): boolean {
  if (wo.status === "delivered" || wo.status === "rejected") return false;
  const today = new Date().toISOString().slice(0, 10);
  return wo.promise_at < today;
}

export function deviceLabel(device: RprDevice): string {
  return [device.brand, device.model].filter(Boolean).join(" ");
}

// ── Detail-screen helpers (Step 3) ────────────────────────────────────

export function computeQuoteTotal(partLines: RprQuotePartLine[], laborLines: RprQuoteLaborLine[]): number {
  const partsTotal = partLines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const laborTotal = laborLines.reduce((sum, l) => sum + l.price, 0);
  return partsTotal + laborTotal;
}

/** No live HR compute function exists anywhere in this codebase (confirmed — svc/commission.ts
 * built its own local version for the same reason) — mirrors that shape for repair technicians. */
export interface RprCommission {
  technician_id: string;
  base: number;
  pct: number;
  amount: number;
  on: "collected";
}

// ── Release-screen helpers (Step 4) ───────────────────────────────────

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Builds the frozen final-document lines from a WO's execution part/labor lines —
 * called once at delivery; the document is immutable afterward (golden rule #4).
 * `name_ar`-only per the existing `RprFinalDocumentLine`/fixture shape (final documents in
 * this dataset are always Arabic, like every other seeded `doc_rpr_*` record — a receipt/
 * e-invoice legal-document convention, not a bilingual UI screen). */
export function buildFinalDocLines(wo: RprWorkOrder): RprFinalDocumentLine[] {
  const partLines: RprFinalDocumentLine[] = wo.part_lines.map((l) => {
    const part = findPart(l.part_id);
    return {
      kind: "part",
      name_ar: l.part_id ? (part?.name_ar ?? l.adhoc_name ?? "") : (l.adhoc_name ?? ""),
      qty: l.qty,
      price: l.price,
      eta_code: part?.eta_code ?? null,
      _flag: l._flag === "no_eta_code" ? "no_eta_code" : undefined,
    };
  });
  const laborLines: RprFinalDocumentLine[] = wo.labor_lines.map((l) => {
    const service = findLaborService(l.service_id);
    return {
      kind: "service",
      name_ar: service?.name_ar ?? "",
      qty: 1,
      price: l.price,
      eta_code: "SVC-REPAIR",
    };
  });
  return [...partLines, ...laborLines];
}

/** Standard-journal preview for the release "auto-posting" step (FE_04 golden rule #6) —
 * no real ledger/journal store exists anywhere in this codebase to post to (confirmed via
 * reuse survey: JournalEntryCreateModal is a manual form, no module calls it on sale/settle),
 * so this is a locally-computed, genuinely-balanced preview shown to the user, not a persisted
 * ledger entry. Revenue/cash/deposit group balances at (parts+service); COGS/inventory group
 * balances independently at partsCost — Σdebit=Σcredit by construction. */
export function computeReleaseJournal(opts: {
  partsTotal: number;
  serviceTotal: number;
  partsCost: number;
  depositApplied: number;
  netDue: number;
}): { lines: RprJournalLine[]; balanced: boolean } {
  const { partsTotal, serviceTotal, partsCost, depositApplied, netDue } = opts;
  const lines: RprJournalLine[] = [];
  if (netDue > 0) lines.push({ account_ar: "الصندوق / الخزينة", account_en: "Cash / Treasury", debit: round2(netDue), credit: 0 });
  if (depositApplied > 0) lines.push({ account_ar: "التزام عربون العملاء", account_en: "Customer deposits liability", debit: round2(depositApplied), credit: 0 });
  if (partsTotal > 0) lines.push({ account_ar: "إيراد قطع الغيار", account_en: "Parts revenue", debit: 0, credit: round2(partsTotal) });
  if (serviceTotal > 0) lines.push({ account_ar: "إيراد الخدمة", account_en: "Service revenue", debit: 0, credit: round2(serviceTotal) });
  if (partsCost > 0) {
    lines.push({ account_ar: "تكلفة قطع الغيار المباعة", account_en: "Parts COGS", debit: round2(partsCost), credit: 0 });
    lines.push({ account_ar: "مخزون قطع الغيار", account_en: "Parts inventory", debit: 0, credit: round2(partsCost) });
  }
  const totalDr = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCr = round2(lines.reduce((s, l) => s + l.credit, 0));
  return { lines, balanced: Math.abs(totalDr - totalCr) < 0.01 };
}

// ── Fiscal period gate (Step 4 — net-new for repair; no other module in this
// codebase reads/blocks on period status, confirmed via reuse survey) ───────

export interface RprFiscalPeriod {
  id: string;
  month: number;
  year: number;
  status: "open" | "closed";
}

export const FISCAL_PERIODS = accountingFixtures.fiscal_periods as RprFiscalPeriod[];

/** No fixture period exists for the current month in this demo dataset, so this is normally
 * false — exposed for the release dialog's `?mock=closed_period` test hook (mirrors svc's own
 * `?mock=eta_reject` convention) to demo the block without needing to fake the system clock. */
export function isPeriodClosed(dateStr: string): boolean {
  const d = new Date(dateStr);
  const period = FISCAL_PERIODS.find((p) => p.year === d.getFullYear() && p.month === d.getMonth() + 1);
  return period?.status === "closed";
}

export function openPeriodLabel(): string | null {
  const open = FISCAL_PERIODS.filter((p) => p.status === "open").sort((a, b) => (a.year - b.year) || (a.month - b.month))[0];
  return open ? `${String(open.month).padStart(2, "0")}/${open.year}` : null;
}

/** Under-warranty WO can be created from a delivered WO while today falls within its
 * warranty window (period starts at delivery per FE_12 §9). */
export function isWarrantyClaimable(wo: RprWorkOrder): boolean {
  if (wo.status !== "delivered" || !wo.warranty_expires_at) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today <= wo.warranty_expires_at;
}
