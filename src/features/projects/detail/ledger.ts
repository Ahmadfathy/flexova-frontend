import { getTimeEntries, getExpenses, getProjectInvoices, getProjectEmployees } from "@/lib/mock/projects";
import type { TimeEntry } from "@/features/projects/types";

/**
 * Ledger-derived figures (kickoff invariant #6 — never stored on the project).
 * Deliberately ignores the fixture's `actuals_view` (an illustrative pre-computed
 * summary per the fixture's own `_meta` note) and recomputes from the individual
 * time entries / expenses / invoices every time, exactly like a real ledger would.
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

export function computeProjectLedger(projectId: string): ProjectLedger {
  const entries = getTimeEntries(projectId);
  const expenses = getExpenses(projectId);
  const invoices = getProjectInvoices(projectId);
  const employees = getProjectEmployees();

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
