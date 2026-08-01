/**
 * FE_16 Project-Based Services — types mirror `projects.fixtures.json` field
 * names exactly (source of truth). Enums per spec §3 (state systems).
 */

export type ProjectStatus = "draft" | "active" | "on_hold" | "closed" | "archived" | "cancelled";
export type BillingModel = "fixed" | "tm" | "retainer" | "mixed";
export type MilestoneBillingType = "fixed" | "tm" | "retainer";
export type MilestoneState = "draft" | "in_progress" | "approved" | "invoiced";
export type TimeEntrySource = "timer" | "manual";
export type TimeEntryState = "draft" | "submitted" | "approved" | "rejected";
export type RateSource = "project" | "role" | "employee" | null;
export type InvoiceBillingSource = "milestone" | "tm" | "retainer";
export type InvoiceLineSource = "milestone" | "time" | "expense" | "retainer_draw";
export type InvoiceStatus = "draft" | "posted" | "cancelled";
export type ClientType = "b2b" | "b2c";

export interface ProjectClient {
  id: string;
  name_ar: string;
  name_en: string;
  type: ClientType;
  trn: string | null;
}

export interface ProjectEmployee {
  id: string;
  name_ar: string;
  name_en: string;
  role: string;
  cost_rate: number;
  default_bill_rate: number;
}

export interface RoleRate {
  role: string;
  bill_rate: number;
}

export interface Treasury {
  id: string;
  name_ar: string;
  name_en: string;
  type: string;
}

export interface TeamMember {
  employee_id: string;
  project_role: string;
}

export interface ProjectActualsView {
  hours_actual: number;
  cost_actual: number;
  revenue_invoiced?: number;
  revenue_drawn?: number;
  margin_est: number;
}

export interface Project {
  id: string;
  code: string;
  title_ar: string;
  title_en: string;
  type_label: string;
  client_id: string;
  status: ProjectStatus;
  billing_model: BillingModel;
  scope_ar: string;
  team: TeamMember[];
  budget_estimated: number | null;
  hours_estimated: number | null;
  start_date: string;
  target_end: string | null;
  actual_end: string | null;
  project_bill_rate?: number | null;
  retainer_id?: string;
  /** Ledger-derived — illustrative pre-computed view for the mock layer only. */
  actuals_view: ProjectActualsView;
  milestones_optional?: boolean;
}

export interface Milestone {
  id: string;
  project_id: string;
  sequence: number;
  name_ar: string;
  name_en: string;
  billing_type: MilestoneBillingType;
  fixed_amount: number | null;
  hours_estimated: number | null;
  target_date: string | null;
  state: MilestoneState;
  notes?: string;
  /** Set when "request approval" is actioned (defaults to the project's lead employee) — drives the SoD approver≠requester check. */
  requested_by?: string;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  milestone_id: string | null;
  employee_id: string;
  date: string;
  source: TimeEntrySource;
  start_ts: string | null;
  stop_ts: string | null;
  manual_minutes: number | null;
  description_ar: string;
  billable: boolean;
  state: TimeEntryState;
  rate_resolved: number | null;
  rate_source: RateSource;
  invoiced: boolean;
  invoice_id: string | null;
  /** Set when `reject` is actioned (spec §8.3/§8.7 — reject requires a reason). */
  reject_reason?: string | null;
  _flag?: string;
  _note?: string;
}

export interface Expense {
  id: string;
  project_id: string;
  milestone_id: string | null;
  description_ar: string;
  amount: number;
  billable: boolean;
  markup: number;
  invoiced: boolean;
  invoice_id: string | null;
  stock_item_id?: string | null;
}

export interface RetainerDraw {
  date: string;
  amount: number;
  ref: string;
  against_entries?: string[];
}

export interface Retainer {
  id: string;
  client_id: string;
  project_id: string;
  opening_amount: number;
  balance: number;
  low_threshold: number;
  draws: RetainerDraw[];
}

export interface InvoiceLine {
  source: InvoiceLineSource;
  source_id: string;
  description_ar: string;
  amount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  grand_total: number;
}

export interface ProjectInvoice {
  id: string;
  number: string;
  project_id: string;
  client_id: string;
  date: string;
  billing_source: InvoiceBillingSource;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  totals: InvoiceTotals;
}

export interface Appointment {
  id: string;
  project_id: string;
  client_id: string;
  title_ar: string;
  start_ts: string;
  end_ts: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  milestone_id: string | null;
  name_ar: string;
  category_ar: string;
  uploaded_by: string;
  date: string;
}
