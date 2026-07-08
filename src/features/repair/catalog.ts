import rprFixtures from "@/lib/mock/fixtures/rpr.fixtures.json";
import type { Lang } from "@/stores/appearance";

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
  _flag?: "parts_adhoc" | "no_eta_code";
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
