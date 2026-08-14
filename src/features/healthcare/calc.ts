import type { HcPlan } from "./types";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface SplitResult {
  insured: boolean;
  patient_portion: number;
  insurer_portion: number;
  split_note_ar: string;
  split_note_en: string;
}

/**
 * Invoice split (spec §4.3 tab4 / §8.2 — the plan values "feed the encounter
 * split engine"). Co-pay is subtracted from the total first, then the plan's
 * coverage_pct applies to what's left — this is the exact order the fixture's
 * own worked examples use (inv_h5001: 480 total, 50 co-pay, 80% of the
 * remaining 430 → patient 136 / insurer 344; inv_h5002 matches the same
 * order), not "% of total, then subtract co-pay".
 *
 * v1 simplification (spec §0/§8.1 — "pricing-only, no claims lifecycle"):
 * `cap_type:"per_visit"` is enforced; `cap_type:"annual"` is not, because
 * enforcing it needs a running per-patient ledger across visits that doesn't
 * exist yet, and `exclusions[]` aren't line-matched against catalog items —
 * both are real gaps, not silent ones, and are natural follow-ups once
 * insurance (Prompt 6) and multi-visit history exist.
 */
export function computeInsuranceSplit(total: number, plan: HcPlan | undefined): SplitResult {
  if (!plan || total <= 0) {
    return {
      insured: false,
      patient_portion: round2(total),
      insurer_portion: 0,
      split_note_ar: "بدون تأمين",
      split_note_en: "No insurance",
    };
  }

  const coPay = plan.co_pay_type === "fixed" ? plan.co_pay_value : round2((total * plan.co_pay_value) / 100);
  const base = Math.max(0, total - coPay);
  let insurer = round2((base * plan.coverage_pct) / 100);
  if (plan.cap_type === "per_visit") insurer = Math.min(insurer, plan.cap_amount);
  const patient = round2(total - insurer);
  const coPayLabel = plan.co_pay_type === "fixed" ? `${coPay}ج` : `${plan.co_pay_value}%`;

  return {
    insured: true,
    patient_portion: patient,
    insurer_portion: insurer,
    split_note_ar: `${plan.name_ar} ${plan.coverage_pct}% بعد تحمّل ${coPayLabel}`,
    split_note_en: `${plan.name_ar} ${plan.coverage_pct}% coverage after ${coPayLabel} co-pay`,
  };
}

/** dob → whole-years age, or null when unknown (walk-ins, unset DOB). */
export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
