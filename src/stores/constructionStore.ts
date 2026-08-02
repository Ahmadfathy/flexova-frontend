import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getBoqItems, getCostBudget, getContractTerms as getFixtureContractTerms,
  getVariationOrders, getConstructionProject, getProgressClaims, getAdvance, getRetention, getPhases,
} from "@/lib/mock/construction";
import { round2, computeClaimSummary, computeClaimLine } from "@/features/construction/calc";
import type {
  BoqItem, CostBudgetBreakdown, ContractTerms, VariationOrder, VoLine,
  ProgressClaim, ClaimLine, ClaimDeduction, AdvancePayment, Retention,
} from "@/features/construction/types";

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

const SEED_PROGRESS_CLAIMS: Record<string, ProgressClaim> = Object.fromEntries(
  getProgressClaims(FIXTURE_PROJECT_ID).map((c) => [c.id, c])
);

const SEED_ADVANCE: AdvancePayment = getAdvance(FIXTURE_PROJECT_ID) ?? {
  amount: 0, recovery_method: "fixed_pct", recovery_pct: 0, recovered_to_date: 0, outstanding: 0,
};

const SEED_RETENTION: Retention = getRetention(FIXTURE_PROJECT_ID) ?? {
  rate: 0, cap: null, accumulated_retained: 0, released: 0, outstanding: 0, at_cap: false, release_events: [],
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

export interface VoDraftInput {
  reason_ar: string;
  date: string;
  ext_ref?: string;
  lines: VoLine[];
}

export interface ClaimDraftInput {
  period_ar: string;
  date: string;
  lines: ClaimLine[];
  deductions: ClaimDeduction[];
}

export type CreateClaimResult = { ok: true; id: string } | { ok: false; reason: "open_claim_exists" | "no_boq" };

let seq = 1;

function nextNumber(numbers: string[], prefix: string): string {
  const max = numbers.reduce((m, n) => {
    const match = n.match(/(\d+)$/);
    const num = match ? parseInt(match[1], 10) : NaN;
    return Number.isFinite(num) ? Math.max(m, num) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function nextVoNumber(vos: Record<string, VariationOrder>): string {
  return nextNumber(Object.values(vos).map((v) => v.number), "VO");
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
  progress_claims: Record<string, ProgressClaim>;
  advance: AdvancePayment;
  retention: Retention;

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

  /** §6.7 "one open draft per project" — also refuses a second draft while one is already
   * submitted (awaiting approval), since that claim's numbers aren't final yet and the next
   * claim's `prev_qty` baseline depends on it. §6.7 "no approved BOQ → block". */
  createProgressClaim: (projectId: string) => CreateClaimResult;
  updateProgressClaimDraft: (projectId: string, claimId: string, input: ClaimDraftInput) => { ok: boolean };
  submitProgressClaim: (projectId: string, claimId: string) => { ok: boolean };
  /** Approval posts the mock journal + ETA tax invoice, rolls retention/advance running totals
   * forward, and writes each line's `cumulative_qty` back onto the BOQ item (`cumulative_executed_qty`)
   * so the next claim's `prev_qty` and the VO reduce-below-executed check both read current data. */
  approveProgressClaim: (projectId: string, claimId: string) => { ok: boolean };
  collectProgressClaim: (projectId: string, claimId: string) => { ok: boolean };
  /** Simulates a fixed-and-resent ETA submission — flips a rejected claim's `eta_status` back
   * to accepted; the claim's own `status` never leaves "approved" while this happens (§6.7). */
  resendClaimEta: (projectId: string, claimId: string) => { ok: boolean };
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
      progress_claims: SEED_PROGRESS_CLAIMS,
      advance: SEED_ADVANCE,
      retention: SEED_RETENTION,

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

      createProgressClaim: (projectId) => {
        const hasOpen = Object.values(get().progress_claims).some((c) => c.status === "draft" || c.status === "submitted");
        if (hasOpen) return { ok: false, reason: "open_claim_exists" };

        const boqItems = get().boq_items;
        if (Object.keys(boqItems).length === 0) return { ok: false, reason: "no_boq" };

        const claims = get().progress_claims;
        const prevClaim = Object.values(claims)
          .filter((c) => c.status === "approved" || c.status === "invoiced" || c.status === "collected")
          .sort((a, b) => {
            const an = parseInt(a.number.match(/(\d+)$/)?.[1] ?? "0", 10);
            const bn = parseInt(b.number.match(/(\d+)$/)?.[1] ?? "0", 10);
            return bn - an;
          })[0] ?? null;
        const prevLinesByItem = new Map((prevClaim?.lines ?? []).map((l) => [l.boq_item_ref, l]));

        const itemOrder = get().item_order;
        const phases = getPhases(projectId);
        const orderedItemIds = phases.length ? phases.flatMap((p) => itemOrder[p.id] ?? []) : Object.values(itemOrder).flat();

        const lines: ClaimLine[] = orderedItemIds.map((itemId) => {
          const item = boqItems[itemId];
          const prevLine = prevLinesByItem.get(itemId);
          const prevQty = prevLine?.cumulative_qty ?? 0;
          const prevValue = prevLine?.cumulative_value ?? 0;
          const lineCalc = computeClaimLine({ contractQty: item.estimated_qty, unitPrice: item.unit_price, prevValue, cumulativeQty: prevQty });
          return {
            boq_item_ref: itemId,
            prev_qty: prevQty,
            cumulative_qty: prevQty,
            cumulative_pct: lineCalc.cumulative_pct,
            cumulative_value: lineCalc.cumulative_value,
            prev_value: prevValue,
            current_value: lineCalc.current_value,
          };
        });

        const id = `claim_new_${Date.now()}_${seq++}`;
        const claim: ProgressClaim = {
          id,
          number: nextNumber(Object.values(claims).map((c) => c.number), "PC"),
          project_ref: projectId,
          period_ar: "",
          date: new Date().toISOString().slice(0, 10),
          status: "draft",
          previous_claim_ref: prevClaim?.id ?? null,
          lines,
          gross_current: 0,
          retention_this: 0,
          advance_recovery_this: 0,
          deductions: [],
          net_before_vat: 0,
          vat: 0,
          net_payable: 0,
        };
        set((s) => ({ progress_claims: { ...s.progress_claims, [id]: claim } }));
        return { ok: true, id };
      },

      updateProgressClaimDraft: (_projectId, claimId, input) => {
        const claim = get().progress_claims[claimId];
        if (!claim || claim.status !== "draft") return { ok: false };

        const grossCurrent = round2(input.lines.reduce((sum, l) => sum + l.current_value, 0));
        const deductionsTotal = round2(input.deductions.reduce((sum, d) => sum + d.amount, 0));
        const terms = get().contract_terms;
        const retention = get().retention;
        const advance = get().advance;
        const summary = computeClaimSummary({
          grossCurrent,
          retentionRate: terms.retention_rate,
          retentionCap: terms.retention_cap,
          retentionAccumulatedSoFar: retention.accumulated_retained,
          advanceAmount: terms.advance_amount,
          advanceRecoveryPct: terms.advance_recovery_pct,
          advanceRecoveredSoFar: advance.recovered_to_date,
          vatRate: terms.vat_rate,
          deductionsTotal,
        });

        set((s) => ({
          progress_claims: {
            ...s.progress_claims,
            [claimId]: {
              ...claim,
              period_ar: input.period_ar,
              date: input.date,
              lines: input.lines,
              deductions: input.deductions,
              gross_current: grossCurrent,
              retention_this: summary.retentionThis,
              advance_recovery_this: summary.advanceRecoveryThis,
              net_before_vat: summary.netBeforeVat,
              vat: summary.vat,
              net_payable: summary.netPayable,
            },
          },
        }));
        return { ok: true };
      },

      submitProgressClaim: (_projectId, claimId) => {
        const claim = get().progress_claims[claimId];
        if (!claim || claim.status !== "draft") return { ok: false };
        set((s) => ({ progress_claims: { ...s.progress_claims, [claimId]: { ...claim, status: "submitted" } } }));
        return { ok: true };
      },

      approveProgressClaim: (_projectId, claimId) => {
        const claim = get().progress_claims[claimId];
        if (!claim || claim.status !== "submitted") return { ok: false };

        set((s) => {
          const boqItems = { ...s.boq_items };
          for (const line of claim.lines) {
            const existing = boqItems[line.boq_item_ref];
            if (existing) boqItems[line.boq_item_ref] = { ...existing, cumulative_executed_qty: line.cumulative_qty };
          }

          const retentionAccumulated = round2(s.retention.accumulated_retained + claim.retention_this);
          const retention: Retention = {
            ...s.retention,
            accumulated_retained: retentionAccumulated,
            outstanding: round2(retentionAccumulated - s.retention.released),
            at_cap: s.retention.cap != null && retentionAccumulated >= s.retention.cap,
          };

          const advanceRecovered = round2(s.advance.recovered_to_date + claim.advance_recovery_this);
          const advance: AdvancePayment = {
            ...s.advance,
            recovered_to_date: advanceRecovered,
            outstanding: round2(Math.max(0, s.advance.amount - advanceRecovered)),
          };

          const claimNumSuffix = claim.number.match(/(\d+)$/)?.[1] ?? "001";

          return {
            boq_items: boqItems,
            retention,
            advance,
            // §4.4 hard-lock, permanent once true — first approved claim is exactly the trigger.
            contract_terms: s.contract_terms.locked ? s.contract_terms : {
              ...s.contract_terms, locked: true, locked_reason_ar: "قُفلت بعد اعتماد المستخلص الأول",
            },
            progress_claims: {
              ...s.progress_claims,
              [claimId]: { ...claim, status: "approved", tax_invoice_ref: `MN-INV-CL-${claimNumSuffix}`, eta_status: "accepted" },
            },
          };
        });
        return { ok: true };
      },

      collectProgressClaim: (_projectId, claimId) => {
        const claim = get().progress_claims[claimId];
        if (!claim || claim.status !== "approved") return { ok: false };
        set((s) => ({ progress_claims: { ...s.progress_claims, [claimId]: { ...claim, status: "collected" } } }));
        return { ok: true };
      },

      resendClaimEta: (_projectId, claimId) => {
        const claim = get().progress_claims[claimId];
        if (!claim || claim.eta_status !== "rejected") return { ok: false };
        set((s) => ({ progress_claims: { ...s.progress_claims, [claimId]: { ...claim, eta_status: "accepted" } } }));
        return { ok: true };
      },
    }),
    { name: "flexova.construction" }
  )
);
