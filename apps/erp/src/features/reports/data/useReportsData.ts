import { useState, useEffect, useCallback } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";

// ── Types ─────────────────────────────────────────────────────────

export interface DashWidget {
  id:       string;
  type:     "kpi" | "chart" | "list";
  title_ar: string;
  value?:   number;
  unit?:    string;
  delta_pct?: number;
  source:   string;
  drill?:   string;
  chart?:   string;
  series?:  { day: string; in: number; out: number }[];
  items?:   { label_ar: string; value: number }[];
}

export interface Dashboard {
  id:       string;
  name_ar:  string;
  name_en:  string;
  role:     string;
  default:  boolean;
  widgets:  DashWidget[];
}

export interface ReportDef {
  id:              string;
  name_ar:         string;
  name_en:         string;
  source:          string;
  columns:         string[];
  default_filters?: string[];
  financial?:      boolean;
  _note?:          string;
}

export interface SavedReport {
  id:       string;
  name_ar:  string;
  owner:    string;
  base:     string;
  filters:  Record<string, string>;
  group_by?: string;
  sort?:    string;
}

export interface EtaQueueItem {
  doc:        string;
  status:     "clearing" | "rejected" | "queued" | "accepted";
  customer?:  string;
  value:      number;
  reason_ar?: string;
  window_remaining_hours?: number;
}

export interface EtaTaxDashboard {
  environment: string;
  test_mode:   boolean;
  b2b_queue:   EtaQueueItem[];
  b2c_queue:   EtaQueueItem[];
  vat_return:  { vat_payable: number; vat_deductible: number; net: number };
}

export interface ZReport {
  shift_id:   string;
  cashier:    string;
  branch_id:  string;
  opened:     string;
  closed:     string;
  sales_total: number;
  payment_breakdown: { method: string; amount: number }[];
  expected_cash: number;
  actual_cash:   number;
  variance:      number;
  sync_state:    string;
}

export interface Schedule {
  id:         string;
  name_ar:    string;
  target:     string;
  cadence:    "daily" | "weekly" | "monthly";
  time:       string;
  recipients: string[];
  channel:    string;
  last_sent:  string | null;
  status:     "active" | "paused";
}

export interface AggregateMeta {
  last_updated:     string;
  staleness_minutes: number;
}

export interface ReportsData {
  dashboards:        Dashboard[];
  reportLibrary:     ReportDef[];
  savedReports:      SavedReport[];
  etaTaxDashboard:   EtaTaxDashboard;
  zReportSample:     ZReport;
  schedules:         Schedule[];
  aggregateMeta:     AggregateMeta;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useReportsData() {
  const [data, setData]           = useState<ReportsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setIsOffline(false);
    try {
      const result = await mockFetch(
        () => loadFixture<Record<string, unknown>>("reports"),
        null,
      );
      const r = result as any;
      setData({
        dashboards:      r.dashboards       ?? [],
        reportLibrary:   r.report_library   ?? [],
        savedReports:    r.saved_reports    ?? [],
        etaTaxDashboard: r.eta_tax_dashboard ?? {},
        zReportSample:   r.z_report_sample  ?? {},
        schedules:       r.schedules        ?? [],
        aggregateMeta:   r.aggregate_meta   ?? {},
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
