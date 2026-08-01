import type { Project, ProjectEmployee, RoleRate, RateSource } from "@/features/projects/types";

export interface ResolvedRate {
  rate: number;
  source: RateSource;
}

/**
 * Bill-rate resolution priority per spec §8.3: project > role > employee.
 * Pure function so both the approvals store action and the "resolved rate
 * preview" column (computed for not-yet-approved entries) share one rule.
 */
export function resolveRate(
  project: Project | undefined,
  employee: ProjectEmployee | undefined,
  getRoleRate: (role: string) => RoleRate | undefined
): ResolvedRate {
  if (project?.project_bill_rate != null) return { rate: project.project_bill_rate, source: "project" };
  const role = employee ? getRoleRate(employee.role) : undefined;
  if (role) return { rate: role.bill_rate, source: "role" };
  if (employee) return { rate: employee.default_bill_rate, source: "employee" };
  return { rate: 0, source: null };
}
