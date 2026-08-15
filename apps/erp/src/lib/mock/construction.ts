import fixtures from "./fixtures/construction.fixtures.json";
import type {
  ConstructionProject, ConstructionPhase, BoqItem, CostBudgetEntry, ContractTerms,
  VariationOrder, AdvancePayment, Retention, ProgressClaim, Subcontract,
  CostActuals, Profitability, EtaQueueEntry,
} from "@/features/construction/types";

/**
 * Signatures mirror a future per-project REST API (`projectId` param on every
 * getter) even though the current fixture only models one project
 * (`prj_bldg_zayed`) — getters resolve to empty/undefined for any other id.
 */

export function getConstructionMeta() {
  return fixtures._meta;
}

export function getConstructionProject(projectId: string): ConstructionProject | undefined {
  const p = fixtures.project as ConstructionProject;
  return p.id === projectId ? p : undefined;
}

export function getPhases(projectId: string): ConstructionPhase[] {
  return getConstructionProject(projectId) ? (fixtures.phases as ConstructionPhase[]) : [];
}

export function getBoqItems(projectId: string): BoqItem[] {
  return getConstructionProject(projectId) ? (fixtures.boq_items as BoqItem[]) : [];
}

export function getCostBudget(projectId: string): CostBudgetEntry[] {
  return getConstructionProject(projectId) ? (fixtures.cost_budget as CostBudgetEntry[]) : [];
}

export function getContractTerms(projectId: string): ContractTerms | undefined {
  return getConstructionProject(projectId) ? (fixtures.contract_terms as ContractTerms) : undefined;
}

export function getVariationOrders(projectId: string): VariationOrder[] {
  return getConstructionProject(projectId) ? (fixtures.variation_orders as VariationOrder[]) : [];
}

export function getAdvance(projectId: string): AdvancePayment | undefined {
  return getConstructionProject(projectId) ? (fixtures.advance as AdvancePayment) : undefined;
}

export function getRetention(projectId: string): Retention | undefined {
  return getConstructionProject(projectId) ? (fixtures.retention as Retention) : undefined;
}

export function getProgressClaims(projectId: string): ProgressClaim[] {
  return (fixtures.progress_claims as ProgressClaim[]).filter((c) => c.project_ref === projectId);
}

export function getProgressClaim(claimId: string): ProgressClaim | undefined {
  return (fixtures.progress_claims as ProgressClaim[]).find((c) => c.id === claimId);
}

export function getSubcontracts(projectId: string): Subcontract[] {
  return getConstructionProject(projectId) ? (fixtures.subcontracts as Subcontract[]) : [];
}

export function getSubcontract(id: string): Subcontract | undefined {
  return (fixtures.subcontracts as Subcontract[]).find((s) => s.id === id);
}

export function getCostActuals(projectId: string): CostActuals | undefined {
  return getConstructionProject(projectId) ? (fixtures.cost_actuals as CostActuals) : undefined;
}

export function getProfitability(projectId: string): Profitability | undefined {
  return getConstructionProject(projectId) ? (fixtures.profitability as Profitability) : undefined;
}

export function getEtaQueue(projectId: string): EtaQueueEntry[] {
  return getConstructionProject(projectId) ? (fixtures.eta_queue as EtaQueueEntry[]) : [];
}
