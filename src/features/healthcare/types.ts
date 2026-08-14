/**
 * FE_18 Healthcare — display model (spec §2). Mirrors the fixture shapes 1:1;
 * `Provider` is inherited from Brief 3 (ServiceProvider on commission) — modelled
 * here only as the read shape Healthcare consumes, not redefined/owned.
 */

export type BoardStatus =
  | "booked" | "checked-in" | "in-visit" | "completed" | "no-show" | "cancelled";

/** Row-level offline indicator (spec §3.4/§10) — local write not yet round-tripped. */
export type SyncStatus = "synced" | "local" | "syncing";

export interface HcOwner {
  id: string;
  relationship: "self" | "owner" | "parent";
  name_ar: string;
  name_en?: string;
  phone: string | null;
}

export interface HcPatient {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  phone: string | null;
  dob: string | null;
  sex: "male" | "female" | null;
  blood_type: string | null;
  allergies: string[];
  chronic: string[];
  owner_id: string;
  insurance: { payer_id: string; plan_id: string } | null;
  specialty_ext: Record<string, unknown>;
  last_visit: string | null;
  status: string;
}

/** Brief 3 ServiceProvider (read-only here) — `role: "doctor"` carries commission. */
export interface HcProvider {
  id: string;
  name_ar: string;
  name_en: string;
  role: "doctor" | "lab_tech";
  specialty?: string;
  commission_pct?: number;
}

export interface HcPayer {
  id: string;
  name_ar: string;
  name_en: string;
  contract_status: "active" | "suspended";
  contact: string;
  covered_patients: number;
  ar_on_payer: number;
}

export interface HcPlan {
  id: string;
  payer_id: string;
  name_ar: string;
  coverage_pct: number;
  cap_type: "annual" | "per_visit";
  cap_amount: number;
  co_pay_type: "fixed" | "pct";
  co_pay_value: number;
  exclusions: string[];
}

export interface HcCatalogItem {
  id: string;
  name_ar: string;
  type: "consult" | "lab" | "radiology" | "procedure";
  price: number;
  default_provider: string;
  active: boolean;
}

export interface HcEncounter {
  id: string;
  patient_id: string;
  provider_id: string;
  appointment_id: string;
  date: string;
  type: "consult" | "follow-up" | "procedure";
  complaint: string | null;
  /** PHI */
  diagnosis: string | null;
  /** PHI */
  clinical_note: string | null;
  status: "open" | "completed";
  orders: string[];
  invoice_id: string | null;
}

export interface HcOrder {
  id: string;
  encounter_id: string;
  type: "prescription" | "lab" | "radiology" | "procedure";
  catalog_id?: string;
  name_ar: string;
  status: "pending" | "in_progress" | "ready" | "delivered" | "issued";
  requested_at?: string;
  result_id?: string | null;
  items?: { drug: string; dose: string; duration: string; instructions?: string }[];
  /** Set only on manually-added orders (no catalog match, spec §4.5 no-results "أضف يدوي") — catalog-sourced orders price from `catalog_id` instead. */
  price?: number;
}

export interface HcResult {
  id: string;
  order_id: string;
  /** PHI */
  value: string;
  attachment?: string;
  note?: string;
  status: "pending" | "in_progress" | "ready" | "delivered";
  ready_at: string;
}

export interface HcInvoice {
  id: string;
  encounter_id: string;
  patient_id: string;
  total: number;
  insured: boolean;
  plan_id: string | null;
  patient_portion: number;
  insurer_portion: number;
  split_note: string;
  eta_route: "b2c_receipt" | "b2b";
  collected: boolean;
}

/** Raw fixture row (`today_board[]`) — before the local sync override is layered on. */
export interface TodayBoardFixtureRow {
  appointment_id: string;
  time: string;
  patient_id: string;
  provider_id: string;
  status: BoardStatus;
  patient_portion: number | null;
  collected: boolean;
  is_new?: boolean;
}

export interface TodayBoardRow extends TodayBoardFixtureRow {
  sync: SyncStatus;
  /** Set by Encounter's Finish visit (spec §4.4) so Today Board's collect action
   * can look the invoice up directly instead of re-deriving it from the patient. */
  invoice_id?: string;
}

/** Immutable PHI access-log entry (spec §11 — who/whom/when). */
export interface HealthcareAccessLogEntry {
  id: string;
  actor: string;
  patient_id: string;
  surface: string;
  action: "read" | "write";
  at: string;
}
