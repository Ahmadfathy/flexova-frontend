import fixtures from "./fixtures/projects.fixtures.json";
import type {
  ProjectClient, ProjectEmployee, RoleRate, Treasury,
  Project, Milestone, TimeEntry, Expense, Retainer, ProjectInvoice,
  Appointment, ProjectDocument,
} from "@/features/projects/types";

export function getProjectClients(): ProjectClient[] {
  return fixtures.clients as ProjectClient[];
}

export function getProjectClient(id: string): ProjectClient | undefined {
  return getProjectClients().find((c) => c.id === id);
}

export function getProjectEmployees(): ProjectEmployee[] {
  return fixtures.employees as ProjectEmployee[];
}

export function getProjectEmployee(id: string): ProjectEmployee | undefined {
  return getProjectEmployees().find((e) => e.id === id);
}

export function getRoleRates(): RoleRate[] {
  return fixtures.role_rates as RoleRate[];
}

export function getRoleRate(role: string): RoleRate | undefined {
  return getRoleRates().find((r) => r.role === role);
}

export function getProjectTreasuries(): Treasury[] {
  return fixtures.treasuries as Treasury[];
}

export function getProjects(): Project[] {
  return fixtures.projects as Project[];
}

export function getProject(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

export function getMilestones(projectId?: string): Milestone[] {
  const all = fixtures.milestones as Milestone[];
  return projectId ? all.filter((m) => m.project_id === projectId) : all;
}

export function getMilestone(id: string): Milestone | undefined {
  return getMilestones().find((m) => m.id === id);
}

export function getTimeEntries(projectId?: string): TimeEntry[] {
  const all = fixtures.time_entries as TimeEntry[];
  return projectId ? all.filter((t) => t.project_id === projectId) : all;
}

export function getTimeEntry(id: string): TimeEntry | undefined {
  return getTimeEntries().find((t) => t.id === id);
}

export function getExpenses(projectId?: string): Expense[] {
  const all = fixtures.expenses as Expense[];
  return projectId ? all.filter((e) => e.project_id === projectId) : all;
}

export function getExpense(id: string): Expense | undefined {
  return getExpenses().find((e) => e.id === id);
}

export function getRetainers(): Retainer[] {
  return fixtures.retainers as Retainer[];
}

export function getRetainer(id: string): Retainer | undefined {
  return getRetainers().find((r) => r.id === id);
}

export function getRetainerByProject(projectId: string): Retainer | undefined {
  return getRetainers().find((r) => r.project_id === projectId);
}

export function getProjectInvoices(projectId?: string): ProjectInvoice[] {
  const all = fixtures.invoices as ProjectInvoice[];
  return projectId ? all.filter((i) => i.project_id === projectId) : all;
}

export function getProjectInvoice(id: string): ProjectInvoice | undefined {
  return getProjectInvoices().find((i) => i.id === id);
}

export function getProjectAppointments(projectId?: string): Appointment[] {
  const all = fixtures.appointments as Appointment[];
  return projectId ? all.filter((a) => a.project_id === projectId) : all;
}

export function getProjectDocuments(projectId?: string): ProjectDocument[] {
  const all = fixtures.documents as ProjectDocument[];
  return projectId ? all.filter((d) => d.project_id === projectId) : all;
}
