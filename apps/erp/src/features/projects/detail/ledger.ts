import type { TimeEntry, Expense, ProjectInvoice, ProjectEmployee } from "@/features/projects/types";

/**
 * Ledger-derived figures (kickoff invariant #6 — never stored on the project).
 * Deliberately ignores the fixture's `actuals_view` (an illustrative pre-computed
 * summary per the fixture's own `_meta` note) and recomputes from the individual
 * time entries / expenses / invoices every time, exactly like a real ledger would.
 *
 * Pure function — callers pass already-filtered (by project) live data from
 * `useProjectsStore` so results stay reactive as entries/expenses/invoices change.
 */

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function entryHours(e: TimeEntry): number {
  if (e.manual_minutes != null) return e.manual_minutes / 60;
  if (e.start_ts && e.stop_ts) {
    return (new Date(e.stop_ts).getTime() - new Date(e.start_ts).getTime()) / 3_600_000;
  }
  return 0; // active timer, no stop_ts yet — not counted until stopped
}

/** Billed amount for an approved time entry — hours × the rate resolved at approval (spec §8.3). */
export function timeEntryBilledAmount(e: TimeEntry): number {
  return round2(entryHours(e) * (e.rate_resolved ?? 0));
}

/** Billed amount for an expense — cost plus markup% (spec §9.4/§7.9, markup defaults 0). */
export function expenseBilledAmount(x: Expense): number {
  return round2(x.amount * (1 + x.markup / 100));
}

/** Flat VAT rate used across FE_16 invoice totals — derived from the fixture's own posted invoices (14% throughout). */
export const VAT_RATE = 0.14;

export function computeInvoiceTotals(lineAmounts: number[]): { subtotal: number; tax: number; grand_total: number } {
  const subtotal = round2(lineAmounts.reduce((sum, a) => sum + a, 0));
  const tax = round2(subtotal * VAT_RATE);
  return { subtotal, tax, grand_total: round2(subtotal + tax) };
}

export interface OpenWorkItem {
  kind: "time" | "expense";
  id: string;
  label: string;
}

export interface ProjectLedger {
  hoursActual: number;
  costActual: number;
  revenueActual: number;
  marginActual: number;
  openWork: OpenWorkItem[];
}

export function computeProjectLedger(
  entries: TimeEntry[],
  expenses: Expense[],
  invoices: ProjectInvoice[],
  employees: ProjectEmployee[]
): ProjectLedger {
  const approvedEntries = entries.filter((e) => e.state === "approved");

  const hoursActual = round2(approvedEntries.reduce((sum, e) => sum + entryHours(e), 0));

  const laborCost = approvedEntries.reduce((sum, e) => {
    const emp = employees.find((x) => x.id === e.employee_id);
    return sum + entryHours(e) * (emp?.cost_rate ?? 0);
  }, 0);
  const expenseCost = expenses.reduce((sum, x) => sum + x.amount, 0);
  const costActual = round2(laborCost + expenseCost);

  const revenueActual = round2(
    invoices.filter((i) => i.status === "posted").reduce((sum, i) => sum + i.totals.subtotal, 0)
  );

  const marginActual = round2(revenueActual - costActual);

  const openWork: OpenWorkItem[] = [
    ...entries
      .filter((e) => e.state === "submitted")
      .map((e) => ({ kind: "time" as const, id: e.id, label: e.description_ar })),
    ...entries
      .filter((e) => e.state === "approved" && e.billable && !e.invoiced)
      .map((e) => ({ kind: "time" as const, id: e.id, label: e.description_ar })),
    ...expenses
      .filter((x) => x.billable && !x.invoiced)
      .map((x) => ({ kind: "expense" as const, id: x.id, label: x.description_ar })),
  ];

  return { hoursActual, costActual, revenueActual, marginActual, openWork };
}
