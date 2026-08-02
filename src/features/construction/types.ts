/**
 * FE_17 Construction — types mirror `construction.fixtures.json` field names
 * exactly (source of truth). Construction is a facet on the FE_16 project
 * (`Project.mode === "construction"`) — the Project entity itself, its Team,
 * Documents and Appointments stay owned by FE_16; everything below is
 * Construction-owned and new.
 *
 * `ConstructionPhase` is deliberately NOT the same entity as FE_16's
 * `Milestone` — Milestone is a billing-approval unit (draft/in_progress/
 * approved/invoiced, fixed_amount, hours_estimated); a construction Phase is
 * a physical BOQ-grouping container with a completion_pct. Reusing Milestone
 * for this would conflate two unrelated state machines, so Phase is its own
 * lightweight construction-scoped entity instead.
 */

export type ClaimStatus = "draft" | "submitted" | "approved" | "invoiced" | "collected";
export type VoStatus = "draft" | "submitted" | "approved" | "rejected";
export type VoLineType = "add_item" | "modify_qty" | "modify_price";
export type ReleaseStage = "initial_handover" | "warranty_end" | "other";
export type EtaStatus = "accepted" | "rejected" | "pending" | null;
export type AdvanceRecoveryMethod = "fixed_pct" | "proportional";
export type CostVarianceFlag = "over" | "under" | "partial" | "on_track";

export interface ConstructionPhase {
  id: string;
  name_ar: string;
  name_en: string;
  order: number;
  /** Physical progress, 0-100. */
  completion_pct: number;
}

export interface ConstructionTeamMember {
  name_ar: string;
  role_ar: string;
}

/** Construction-only fields layered on top of the FE_16 `Project` record with the same `id`. */
export interface ConstructionProject {
  id: string;
  mode: "construction";
  name_ar: string;
  name_en: string;
  customer_id: string;
  customer_name_ar: string;
  customer_name_en: string;
  status: string;
  start_date: string;
  cost_center_id: string;
  team: ConstructionTeamMember[];
  boq_version: number;
  contract_value_original: number;
  contract_value_current: number;
  overall_completion_pct: number;
}

export interface BoqItem {
  id: string;
  phase_ref: string;
  section_header_ar?: string;
  code: string;
  description_ar: string;
  unit_ar: string;
  estimated_qty: number;
  /** Sell price to client. */
  unit_price: number;
  /** = estimated_qty × unit_price. */
  value: number;
  /** Our cost — never shown to the client. */
  estimated_unit_cost: number;
  estimated_cost: number;
  expected_margin: number;
  cumulative_executed_qty: number;
  _subcontracted?: string;
  _added_by_vo?: string;
}

export interface CostBudgetBreakdown {
  materials: number;
  labor: number;
  subcontract: number;
  other: number;
}

export interface CostBudgetEntry {
  phase_ref: string;
  estimated_cost: number;
  breakdown?: CostBudgetBreakdown;
}

export interface ReleaseTemplate {
  initial_handover_pct: number;
  warranty_end_pct: number;
  warranty_months: number;
}

export interface ContractTerms {
  retention_rate: number;
  retention_cap: number | null;
  retention_cap_basis_ar?: string;
  release_template: ReleaseTemplate;
  advance_amount: number;
  advance_recovery_method: AdvanceRecoveryMethod;
  advance_recovery_pct: number;
  advance_received_receipt_ref?: string;
  vat_rate: number;
  locked: boolean;
  locked_reason_ar?: string;
}

export interface VoLine {
  type: VoLineType;
  target_boq_item?: string;
  detail_ar: string;
}

export interface VariationOrder {
  id: string;
  number: string;
  date: string;
  status: VoStatus;
  reason_ar: string;
  ext_ref?: string;
  lines: VoLine[];
  contract_value_impact: number;
  contract_value_before: number;
  contract_value_after: number;
}

export interface AdvancePayment {
  amount: number;
  recovery_method: AdvanceRecoveryMethod;
  recovery_pct: number;
  recovered_to_date: number;
  outstanding: number;
  _note_ar?: string;
}

export interface ReleaseEvent {
  amount: number;
  stage: ReleaseStage;
  date: string;
  reason_ar?: string;
  voucher_ref?: string;
}

export interface Retention {
  rate: number;
  cap: number | null;
  accumulated_retained: number;
  released: number;
  outstanding: number;
  at_cap: boolean;
  _note_ar?: string;
  release_events: ReleaseEvent[];
}

export interface ClaimLine {
  boq_item_ref: string;
  prev_qty: number;
  cumulative_qty: number;
  cumulative_pct: number;
  cumulative_value: number;
  prev_value: number;
  current_value: number;
}

export interface ClaimDeduction {
  memo_ar: string;
  amount: number;
}

export interface ProgressClaim {
  id: string;
  number: string;
  project_ref: string;
  period_ar: string;
  date: string;
  status: ClaimStatus;
  previous_claim_ref: string | null;
  tax_invoice_ref?: string | null;
  eta_status?: EtaStatus;
  lines: ClaimLine[];
  gross_current: number;
  retention_this: number;
  advance_recovery_this: number;
  deductions: ClaimDeduction[];
  net_before_vat: number;
  vat: number;
  net_payable: number;
  _checks_ar?: Record<string, string>;
}

export interface SubBoqItem {
  id: string;
  description_ar: string;
  unit_ar: string;
  estimated_qty: number;
  unit_price: number;
  value: number;
  cumulative_executed_qty: number;
}

export interface SubTerms {
  retention_rate: number;
  retention_cap: number | null;
  advance_amount: number;
  advance_recovery_pct: number;
}

export interface SubRetention {
  accumulated_retained: number;
  released: number;
  outstanding: number;
}

export interface SubClaimLine {
  sub_boq_ref: string;
  prev_qty: number;
  cumulative_qty: number;
  cumulative_pct: number;
  cumulative_value: number;
  prev_value: number;
  current_value: number;
}

export interface SubProgressClaim {
  id: string;
  number: string;
  date: string;
  status: ClaimStatus;
  output_ar: string;
  payment_voucher_ref?: string;
  eta_input_vat: boolean;
  lines: SubClaimLine[];
  gross_current: number;
  retention_this: number;
  advance_recovery_this: number;
  deductions: ClaimDeduction[];
  net_before_vat: number;
  vat: number;
  net_payable: number;
  _note_ar?: string;
}

export interface Subcontract {
  id: string;
  subcontractor_supplier_ref: string;
  subcontractor_name_ar: string;
  linked_boq_item: string;
  status: string;
  sub_boq: SubBoqItem[];
  sub_contract_value: number;
  sub_terms: SubTerms;
  sub_retention: SubRetention;
  sub_claims: SubProgressClaim[];
}

export interface CostActualBreakdown {
  materials: number;
  labor: number;
  subcontract: number;
  other: number;
}

export interface PhaseCostActual {
  phase_ref: string;
  estimated_cost: number;
  actual_cost: number;
  variance: number | null;
  variance_pct: number | null;
  completion_pct: number;
  flag: CostVarianceFlag;
  breakdown: CostActualBreakdown;
}

export interface CostActuals {
  as_of: string;
  by_phase: PhaseCostActual[];
  project_totals: {
    estimated_cost_total: number;
    actual_cost_to_date: number;
    breakdown: CostActualBreakdown;
  };
}

export interface ApproximateForecast {
  projected_final_cost: number;
  projected_final_profit: number;
  projected_margin_pct: number;
  label_ar: string;
}

export interface Profitability {
  revenue_billed: number;
  actual_cost_to_date: number;
  actual_profit_to_date: number;
  actual_margin_pct: number;
  estimated_profit_total: number;
  estimated_margin_pct: number;
  approximate_forecast: ApproximateForecast;
  progress_vs_spend_ar?: string;
}

export interface EtaQueueEntry {
  claim_ref: string;
  invoice_ref: string;
  type: string;
  status: string;
  vat_base: number;
  vat: number;
}
