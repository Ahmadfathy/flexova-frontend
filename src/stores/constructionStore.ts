import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getBoqItems, getCostBudget, getContractTerms as getFixtureContractTerms,
  getVariationOrders, getConstructionProject,
} from "@/lib/mock/construction";
import { round2 } from "@/features/construction/calc";
import type { BoqItem, CostBudgetBreakdown, ContractTerms, VariationOrder, VoLine } from "@/features/construction/types";

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

const SEED_VARIATION_ORDERS: Record<string, VariationOrder> = Object.fromEntries(
  getVariationOrders(FIXTURE_PROJECT_ID).map((v) => [v.id, v])
);

const SEED_BOQ_VERSION = getConstructionProject(FIXTURE_PROJECT_ID)?.boq_version ?? 1;

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

export interface VoDraftInput {
  reason_ar: string;
  date: string;
  ext_ref?: string;
  lines: VoLine[];
}

let seq = 1;

function nextVoNumber(vos: Record<string, VariationOrder>): string {
  const max = Object.values(vos).reduce((m, v) => {
    const match = v.number.match(/(\d+)$/);
    const n = match ? parseInt(match[1], 10) : NaN;
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `VO-${String(max + 1).padStart(3, "0")}`;
}

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

/** Applies a VO's modify_qty/modify_price line to an existing item — only qty/price change, never description/unit (those aren't part of a modify VO line per spec §5.1). */
function patchBoqItem(existing: BoqItem, patch: { estimated_qty?: number; unit_price?: number }): BoqItem {
  return deriveItem({
    id: existing.id, phase_ref: existing.phase_ref, section_header_ar: existing.section_header_ar,
    code: existing.code, description_ar: existing.description_ar, unit_ar: existing.unit_ar,
    estimated_qty: patch.estimated_qty ?? existing.estimated_qty,
    unit_price: patch.unit_price ?? existing.unit_price,
    estimated_unit_cost: existing.estimated_unit_cost,
    cumulative_executed_qty: existing.cumulative_executed_qty,
    _subcontracted: existing._subcontracted,
    _added_by_vo: existing._added_by_vo,
  });
}

interface ConstructionState {
  boq_items: Record<string, BoqItem>;
  /** Display order per phase — items render in this order; section dividers are derived from consecutive `section_header_ar` changes, not stored separately. */
  item_order: Record<string, string[]>;
  cost_budget_breakdown: Record<string, CostBudgetBreakdown | undefined>;
  /** Per-user display preference (§3.3 "hide-cost toggle... persisted per user") — ungated, view-only. */
  hide_cost: boolean;
  contract_terms: ContractTerms;
  variation_orders: Record<string, VariationOrder>;
  /** Bumped on every VO approval (§5.3 "new BOQ version") — informational traceability counter. */
  boq_version: number;

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

  createVariationOrder: (projectId: string, input: VoDraftInput) => { ok: boolean; id: string };
  updateVariationOrderDraft: (projectId: string, voId: string, input: VoDraftInput) => { ok: boolean };
  submitVariationOrder: (projectId: string, voId: string) => { ok: boolean };
  /** Approved VOs are never deletable (§5.3) — there is deliberately no deleteVariationOrder action; correction is a reversing VO. */
  approveVariationOrder: (projectId: string, voId: string) => { ok: boolean };
  rejectVariationOrder: (projectId: string, voId: string) => { ok: boolean };
}

export const useConstructionStore = create<ConstructionState>()(
  persist(
    (set, get) => ({
      boq_items: SEED_BOQ_ITEMS,
      item_order: seedItemOrder(),
      cost_budget_breakdown: SEED_COST_BUDGET_BREAKDOWN,
      hide_cost: false,
      contract_terms: SEED_CONTRACT_TERMS,
      variation_orders: SEED_VARIATION_ORDERS,
      boq_version: SEED_BOQ_VERSION,

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

      createVariationOrder: (_projectId, input) => {
        const id = `vo_new_${Date.now()}_${seq++}`;
        const vo: VariationOrder = {
          id,
          number: nextVoNumber(get().variation_orders),
          date: input.date,
          status: "draft",
          reason_ar: input.reason_ar,
          ext_ref: input.ext_ref,
          lines: input.lines,
          contract_value_impact: 0,
          contract_value_before: 0,
          contract_value_after: 0,
        };
        set((s) => ({ variation_orders: { ...s.variation_orders, [id]: vo } }));
        return { ok: true, id };
      },

      updateVariationOrderDraft: (_projectId, voId, input) => {
        const vo = get().variation_orders[voId];
        if (!vo || vo.status !== "draft") return { ok: false };
        set((s) => ({
          variation_orders: {
            ...s.variation_orders,
            [voId]: { ...vo, reason_ar: input.reason_ar, date: input.date, ext_ref: input.ext_ref, lines: input.lines },
          },
        }));
        return { ok: true };
      },

      submitVariationOrder: (_projectId, voId) => {
        const vo = get().variation_orders[voId];
        if (!vo || vo.status !== "draft") return { ok: false };
        set((s) => ({ variation_orders: { ...s.variation_orders, [voId]: { ...vo, status: "submitted" } } }));
        return { ok: true };
      },

      approveVariationOrder: (_projectId, voId) => {
        const vo = get().variation_orders[voId];
        if (!vo || vo.status !== "submitted") return { ok: false };

        const contractValueBefore = Object.values(get().boq_items).reduce((sum, i) => sum + i.value, 0);

        set((s) => {
          const boqItems = { ...s.boq_items };
          const itemOrder = { ...s.item_order };

          const updatedLines: VoLine[] = vo.lines.map((line) => {
            if (line.type === "add_item" && line.new_item) {
              const id = `boq_vo_${Date.now()}_${seq++}`;
              const item = deriveItem({
                id,
                phase_ref: line.new_item.phase_ref,
                section_header_ar: line.new_item.section_header_ar || undefined,
                code: line.new_item.code || `AUTO-${String(seq).padStart(3, "0")}`,
                description_ar: line.new_item.description_ar,
                unit_ar: line.new_item.unit_ar,
                estimated_qty: line.new_item.estimated_qty,
                unit_price: line.new_item.unit_price,
                estimated_unit_cost: line.new_item.estimated_unit_cost,
                cumulative_executed_qty: 0,
                _added_by_vo: vo.id,
              });
              boqItems[id] = item;
              itemOrder[line.new_item.phase_ref] = [...(itemOrder[line.new_item.phase_ref] ?? []), id];
              return { ...line, target_boq_item: id };
            }
            if (line.type === "modify_qty" && line.target_boq_item && line.new_qty != null) {
              const existing = boqItems[line.target_boq_item];
              if (existing) boqItems[line.target_boq_item] = patchBoqItem(existing, { estimated_qty: line.new_qty });
              return line;
            }
            if (line.type === "modify_price" && line.target_boq_item && line.new_price != null) {
              const existing = boqItems[line.target_boq_item];
              if (existing) boqItems[line.target_boq_item] = patchBoqItem(existing, { unit_price: line.new_price });
              return line;
            }
            return line;
          });

          const contractValueAfter = Object.values(boqItems).reduce((sum, i) => sum + i.value, 0);

          return {
            boq_items: boqItems,
            item_order: itemOrder,
            boq_version: s.boq_version + 1,
            variation_orders: {
              ...s.variation_orders,
              [voId]: {
                ...vo,
                status: "approved",
                lines: updatedLines,
                contract_value_before: contractValueBefore,
                contract_value_after: contractValueAfter,
                contract_value_impact: round2(contractValueAfter - contractValueBefore),
              },
            },
          };
        });
        return { ok: true };
      },

      rejectVariationOrder: (_projectId, voId) => {
        const vo = get().variation_orders[voId];
        if (!vo || vo.status !== "submitted") return { ok: false };
        set((s) => ({ variation_orders: { ...s.variation_orders, [voId]: { ...vo, status: "rejected" } } }));
        return { ok: true };
      },
    }),
    { name: "flexova.construction" }
  )
);
