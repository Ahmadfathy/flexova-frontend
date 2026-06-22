import { useState, useEffect, useCallback } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";

// ── Types ─────────────────────────────────────────────────────────

export interface SalaryComponent {
  name_ar: string;
  kind:    "addition" | "deduction";
  type:    "fixed" | "percent";
  amount:  number;
}

export interface SalaryStructure {
  base?:              number;
  day_rate?:          number;
  commission_rule_id?: string;
  components?:        SalaryComponent[];
}

export interface Employee {
  id:               string;
  name_ar:          string;
  name_en:          string;
  phone:            string;
  employment_type:  "monthly" | "daily" | "commission";
  title:            string;
  branch_id:        string;
  status:           "active" | "inactive";
  linked_user:      string | null;
  salary_structure: SalaryStructure;
  advance_balance:  number;
  _flag?:           string;
}

export interface AttendanceSummaryRow {
  employee_id:    string;
  present:        number;
  absent:         number;
  leave:          number;
  overtime_hours: number;
  late:           number;
}

export interface AttendancePeriod {
  period:    string;
  branch_id: string;
  summary:   AttendanceSummaryRow[];
}

export interface CommissionRule {
  id:      string;
  name_ar: string;
  name_en: string;
  type:    "percent" | "fixed";
  value:   number;
  base:    string;
  tiered:  boolean;
}

export interface CommissionSource {
  txn:       string;
  collected: number;
  note?:     string;
}

export interface CommissionAccrued {
  employee_id:  string;
  period:       string;
  rule_id:      string;
  base_amount:  number;
  commission:   number;
  sources:      CommissionSource[];
}

export interface AdvanceScheduleItem {
  period: string;
  amount: number;
}

export interface Advance {
  id:          string;
  employee_id: string;
  type:        "advance" | "loan";
  amount:      number;
  remaining:   number;
  status:      "outstanding" | "settled";
  granted:     string;
  treasury_id: string;
  schedule:    AdvanceScheduleItem[];
}

export interface PayrollLineDetail {
  type:   string;
  amount: number;
  ref:    string;
}

export interface PayrollLine {
  employee_id:      string;
  gross:            number;
  deductions:       number;
  net:              number;
  deduction_detail?: PayrollLineDetail[];
  addition_detail?:  PayrollLineDetail[];
}

export interface PayrollWarning {
  type:        string;
  employees:   string[];
  text_ar:     string;
  text_en:     string;
}

export interface PostingEntry {
  lines:    { account: string; name_ar: string; dr: number; cr: number }[];
  total_dr: number;
  total_cr: number;
  balanced: boolean;
}

export interface PayrollRun {
  id:             string;
  number:         string;
  period:         string;
  scope:          string;
  status:         "draft" | "posted";
  total_net:      number | null;
  lines:          PayrollLine[];
  warnings?:      PayrollWarning[];
  posting_entry?: PostingEntry;
}

export interface DashboardKpis {
  headcount:                number;
  monthly_payroll_cost:     number;
  outstanding_advances:     number;
  accrued_commissions:      number;
  absences_today:           number;
  payroll_run_this_month:   boolean;
}

export interface HrData {
  employees:          Employee[];
  attendance:         AttendancePeriod;
  commissionRules:    CommissionRule[];
  commissionsAccrued: CommissionAccrued[];
  advances:           Advance[];
  payrollRuns:        PayrollRun[];
  dashboardKpis:      DashboardKpis;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useHrData() {
  const [data, setData]           = useState<HrData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setIsOffline(false);
    try {
      const result = await mockFetch(
        () => loadFixture<Record<string, unknown>>("hr"),
        null,
      );
      const r = result as any;
      setData({
        employees:          r.employees          ?? [],
        attendance:         r.attendance         ?? { period: "", branch_id: "", summary: [] },
        commissionRules:    r.commission_rules   ?? [],
        commissionsAccrued: r.commissions_accrued ?? [],
        advances:           r.advances           ?? [],
        payrollRuns:        r.payroll_runs       ?? [],
        dashboardKpis:      r.dashboard_kpis     ?? {},
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "mock_offline") setIsOffline(true);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, isOffline, reload: load };
}
