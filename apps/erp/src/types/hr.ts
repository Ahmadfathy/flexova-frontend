/**
 * Minimal cross-module employee reference — used by mfg's Stages tab (assignee
 * picker + wage-rate lookup for labor cost). Not the HR feature's own richer
 * Employee type (src/features/hr/data/useHrData.ts); this is only the slice
 * another module is allowed to depend on.
 */
export interface HrEmployeeRef {
  id: string;
  name_ar: string;
  name_en: string;
  employment_type: "monthly" | "daily" | "commission";
  status: "active" | "inactive";
  salary_structure: {
    base?: number;
    day_rate?: number;
  };
}
