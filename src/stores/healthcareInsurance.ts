import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPayers, getPlans } from "@/lib/mock/healthcare";
import type { HcPayer, HcPlan } from "@/features/healthcare/types";

/**
 * Payers & Plans (spec §8) — single source of truth from here on, seeded from
 * the fixture. The encounter split engine (Prompt 2) and every payer/plan
 * select (Patients add/edit, Patient 360) read live off this store, not the
 * static fixture accessors, so an admin-added payer/plan is usable immediately
 * — same convention as encounters/orders/invoices/patients in Prompts 2-5.
 */

let localSeq = 0;
function nextLocalId(prefix: string): string {
  localSeq += 1;
  return `${prefix}_local_${localSeq}`;
}

function seedPayers(): Record<string, HcPayer> {
  return Object.fromEntries(getPayers().map((p) => [p.id, p]));
}
function seedPlans(): Record<string, HcPlan> {
  return Object.fromEntries(getPlans().map((p) => [p.id, p]));
}

export interface NewPayerInput {
  name_ar: string;
  contact: string;
}

export interface NewPlanInput {
  name_ar: string;
  coverage_pct: number;
  cap_type: "annual" | "per_visit";
  cap_amount: number;
  co_pay_type: "fixed" | "pct";
  co_pay_value: number;
  exclusions: string[];
}

interface InsuranceState {
  payers: Record<string, HcPayer>;
  plans: Record<string, HcPlan>;

  addPayer: (input: NewPayerInput) => HcPayer;
  updatePayer: (id: string, patch: Partial<HcPayer>) => void;
  toggleContractStatus: (id: string) => void;

  addPlan: (payerId: string, input: NewPlanInput) => HcPlan;
  updatePlan: (id: string, patch: Partial<HcPlan>) => void;
}

export const useHealthcareInsurance = create<InsuranceState>()(
  persist(
    (set) => ({
      payers: seedPayers(),
      plans: seedPlans(),

      addPayer: (input) => {
        const id = nextLocalId("pay");
        const payer: HcPayer = {
          id, name_ar: input.name_ar, name_en: input.name_ar, contract_status: "active",
          contact: input.contact, covered_patients: 0, ar_on_payer: 0,
        };
        set((s) => ({ payers: { ...s.payers, [id]: payer } }));
        return payer;
      },

      updatePayer: (id, patch) => {
        set((s) => {
          const p = s.payers[id];
          if (!p) return s;
          return { payers: { ...s.payers, [id]: { ...p, ...patch } } };
        });
      },

      toggleContractStatus: (id) => {
        set((s) => {
          const p = s.payers[id];
          if (!p) return s;
          return { payers: { ...s.payers, [id]: { ...p, contract_status: p.contract_status === "active" ? "suspended" : "active" } } };
        });
      },

      addPlan: (payerId, input) => {
        const id = nextLocalId("plan");
        const plan: HcPlan = { id, payer_id: payerId, ...input };
        set((s) => ({ plans: { ...s.plans, [id]: plan } }));
        return plan;
      },

      updatePlan: (id, patch) => {
        set((s) => {
          const p = s.plans[id];
          if (!p) return s;
          return { plans: { ...s.plans, [id]: { ...p, ...patch } } };
        });
      },
    }),
    { name: "flexova.healthcare.insurance" }
  )
);
