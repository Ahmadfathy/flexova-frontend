import fixtures from "./fixtures/hr.fixtures.json";
import type { HrEmployeeRef } from "@/types/hr";

export function getEmployees(): HrEmployeeRef[] {
  return (fixtures.employees as HrEmployeeRef[]).filter((e) => e.status === "active");
}

export function findEmployee(id: string | null | undefined): HrEmployeeRef | undefined {
  if (!id) return undefined;
  return getEmployees().find((e) => e.id === id);
}

/**
 * Hourly rate for labor costing (FE_14 §3/§7.3) — only unambiguous for daily-rate
 * employees (day_rate ÷ 8h, verified against MO-0101's fixture labor_entries).
 * Monthly/commission employees have no clear hourly formula here, so callers fall
 * back to a manual cost entry for them.
 */
export function hourlyRate(emp: HrEmployeeRef): number | null {
  if (emp.salary_structure.day_rate) return emp.salary_structure.day_rate / 8;
  return null;
}
