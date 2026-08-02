import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getBoqItems, getCostBudget, getContractTerms as getFixtureContractTerms } from "@/lib/mock/construction";
import { round2 } from "@/features/construction/calc";
import type { BoqItem, CostBudgetBreakdown, ContractTerms } from "@/features/construction/types";

/**
 * The fixture models exactly one construction project (`prj_bldg_zayed`) —
 * seeding below is scoped to it, same convention as `projectsStore.ts`'s
 * `SEED_PROJECTS` etc. mirroring the single-tenant fixture shape.
 */
const FIXTURE_PROJECT_ID = "prj_bldg_zayed";

const SEED_BOQ_ITEMS: Record<string, BoqItem> = Object.fromEntries(
  getBoqItems(FIXTURE_PROJECT_ID).map((i) => [i.id, i])
);

function seedItemOrder(): Record<string, string[]> {
  const order: Record<string, string[]> = {};
  for (const item of getBoqItems(FIXTURE_PROJECT_ID)) {
    (order[item.phase_ref] ??= []).push(item.id);
  }
  return order;
}

const SEED_COST_BUDGET_BREAKDOWN: Record<string, CostBudgetBreakdown | undefined> = Object.fromEntries(
  getCostBudget(FIXTURE_PROJECT_ID).map((c) => [c.phase_ref, c.breakdown])
);

const SEED_CONTRACT_TERMS: ContractTerms = getFixtureContractTerms(FIXTURE_PROJECT_ID) ?? {
  retention_rate: 0.10,
  retention_cap: null,
  release_template: { initial_handover_pct: 0.5, warranty_end_pct: 0.5, warranty_months: 12 },
  advance_amount: 0,
  advance_recovery_method: "fixed_pct",
  advance_recovery_pct: 0,
  vat_rate: 0.14,
  locked: false,
};

export interface BoqItemFormInput {
  phase_ref: string;
  code: string;
  section_header_ar: string;
  description_ar: string;
  unit_ar: string;
  estimated_qty: number;
  unit_price: number;
  estimated_unit_cost: number;
}

/** Editable subset of ContractTerms (§4.2) — vat_rate/locked/locked_reason_ar are not user-editable here. */
export type ContractTermsFormInput = Omit<ContractTerms, "vat_rate" | "locked" | "locked_reason_ar">;

export type ContractTermsSaveResult = { ok: true } | { ok: false; reason: "locked" | "invalid" };

let seq = 1;

/** `_projectId` is unused today (single-project fixture) but kept in the signature so every
 * call site already reads as project-scoped once the mock layer supports more than one. */
function isLocked(get: () => ConstructionState, _projectId: string): boolean {
  return get().contract_terms.locked;
}

function deriveItem(base: Omit<BoqItem, "value" | "estimated_cost" | "expected_margin">): BoqItem {
  const value = round2(base.estimated_qty * base.unit_price);
  const estimated_cost = round2(base.estimated_qty * base.estimated_unit_cost);
  return { ...base, value, estimated_cost, expected_margin: round2(value - estimated_cost) };
}

interface ConstructionState {
  boq_items: Record<string, BoqItem>;
  /** Display order per phase — items render in this order; section dividers are derived from consecutive `section_header_ar` changes, not stored separately. */
  item_order: Record<string, string[]>;
  cost_budget_breakdown: Record<string, CostBudgetBreakdown | undefined>;
  /** Per-user display preference (§3.3 "hide-cost toggle... persisted per user") — ungated, view-only. */
  hide_cost: boolean;
  contract_terms: ContractTerms;

  toggleHideCost: () => void;
  addBoqItem: (projectId: string, input: BoqItemFormInput) => { ok: boolean };
  updateBoqItem: (projectId: string, id: string, input: BoqItemFormInput) => { ok: boolean };
  reorderBoqItems: (projectId: string, phaseRef: string, orderedIds: string[]) => { ok: boolean };
  setCostBudgetBreakdown: (projectId: string, phaseRef: string, breakdown: CostBudgetBreakdown | undefined) => { ok: boolean };
  importBoqItems: (projectId: string, phaseRef: string, rows: BoqItemFormInput[]) => { ok: boolean; count: number };
  /**
   * `locked` never flips back to false once true (§4.4 "hard lock after the first approved
   * claim" — permanent, not a toggle). `override: true` (gated `construction.contract.terms_override`
   * at the call site) allows a one-off edit while still locked; the record stays `locked: true`
   * afterwards, so editing again still requires another explicit override.
   */
  updateContractTerms: (projectId: string, input: ContractTermsFormInput, override?: boolean) => ContractTermsSaveResult;
}

export const useConstructionStore = create<ConstructionState>()(
  persist(
    (set, get) => ({
      boq_items: SEED_BOQ_ITEMS,
      item_order: seedItemOrder(),
      cost_budget_breakdown: SEED_COST_BUDGET_BREAKDOWN,
      hide_cost: false,
      contract_terms: SEED_CONTRACT_TERMS,

      toggleHideCost: () => set((s) => ({ hide_cost: !s.hide_cost })),

      addBoqItem: (projectId, input) => {
        if (isLocked(get, projectId)) return { ok: false };
        const id = `boq_new_${Date.now()}_${seq++}`;
        const item = deriveItem({
          id,
          phase_ref: input.phase_ref,
          section_header_ar: input.section_header_ar || undefined,
          code: input.code || `AUTO-${String(seq).padStart(3, "0")}`,
          description_ar: input.description_ar,
          unit_ar: input.unit_ar,
          estimated_qty: input.estimated_qty,
          unit_price: input.unit_price,
          estimated_unit_cost: input.estimated_unit_cost,
          cumulative_executed_qty: 0,
        });
        set((s) => ({
          boq_items: { ...s.boq_items, [id]: item },
          item_order: { ...s.item_order, [input.phase_ref]: [...(s.item_order[input.phase_ref] ?? []), id] },
        }));
        return { ok: true };
      },

      updateBoqItem: (projectId, id, input) => {
        if (isLocked(get, projectId)) return { ok: false };
        set((s) => {
          const existing = s.boq_items[id];
          if (!existing) return s;
          const item = deriveItem({
            id,
            phase_ref: existing.phase_ref,
            section_header_ar: input.section_header_ar || undefined,
            code: input.code || existing.code,
            description_ar: input.description_ar,
            unit_ar: input.unit_ar,
            estimated_qty: input.estimated_qty,
            unit_price: input.unit_price,
            estimated_unit_cost: input.estimated_unit_cost,
            cumulative_executed_qty: existing.cumulative_executed_qty,
            _subcontracted: existing._subcontracted,
            _added_by_vo: existing._added_by_vo,
          });
          return { boq_items: { ...s.boq_items, [id]: item } };
        });
        return { ok: true };
      },

      reorderBoqItems: (projectId, phaseRef, orderedIds) => {
        if (isLocked(get, projectId)) return { ok: false };
        set((s) => ({ item_order: { ...s.item_order, [phaseRef]: orderedIds } }));
        return { ok: true };
      },

      setCostBudgetBreakdown: (projectId, phaseRef, breakdown) => {
        if (isLocked(get, projectId)) return { ok: false };
        set((s) => ({ cost_budget_breakdown: { ...s.cost_budget_breakdown, [phaseRef]: breakdown } }));
        return { ok: true };
      },

      importBoqItems: (projectId, phaseRef, rows) => {
        if (isLocked(get, projectId)) return { ok: false, count: 0 };
        const newItems: BoqItem[] = rows.map((input) => {
          const id = `boq_new_${Date.now()}_${seq++}`;
          return deriveItem({
            id,
            phase_ref: phaseRef,
            section_header_ar: input.section_header_ar || undefined,
            code: input.code || `AUTO-${String(seq).padStart(3, "0")}`,
            description_ar: input.description_ar,
            unit_ar: input.unit_ar,
            estimated_qty: input.estimated_qty,
            unit_price: input.unit_price,
            estimated_unit_cost: input.estimated_unit_cost,
            cumulative_executed_qty: 0,
          });
        });
        set((s) => ({
          boq_items: { ...s.boq_items, ...Object.fromEntries(newItems.map((i) => [i.id, i])) },
          item_order: { ...s.item_order, [phaseRef]: [...(s.item_order[phaseRef] ?? []), ...newItems.map((i) => i.id)] },
        }));
        return { ok: true, count: newItems.length };
      },

      updateContractTerms: (_projectId, input, override) => {
        const current = get().contract_terms;
        if (current.locked && !override) return { ok: false, reason: "locked" };
        if (input.retention_rate + input.advance_recovery_pct > 1) return { ok: false, reason: "invalid" };
        set((s) => ({
          contract_terms: {
            ...s.contract_terms,
            retention_rate: input.retention_rate,
            retention_cap: input.retention_cap,
            retention_cap_basis_ar: input.retention_cap_basis_ar,
            release_template: input.release_template,
            advance_amount: input.advance_amount,
            advance_recovery_method: input.advance_recovery_method,
            advance_recovery_pct: input.advance_recovery_pct,
            advance_received_receipt_ref: input.advance_received_receipt_ref,
          },
        }));
        return { ok: true };
      },
    }),
    { name: "flexova.construction" }
  )
);
