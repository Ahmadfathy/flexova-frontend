import { useTranslation } from "react-i18next";
import { Users, Wallet, TrendingUp, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { KpiCard }       from "@/components/patterns/KpiCard";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { useHrData } from "../data/useHrData";

// ── Main page ─────────────────────────────────────────────────────

export function HrDashboardPage() {
  const { t, i18n } = useTranslation("hr");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useHrData();

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dashboard.title")} />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-sm bg-card shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-9 rounded" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dashboard.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const kpis = data!.dashboardKpis;

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title={t("dashboard.title")}
        actions={
          !kpis.payroll_run_this_month ? (
            <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning/10">
              {t("dashboard.run_now")}
            </Button>
          ) : undefined
        }
        alert={
          (isOffline || !kpis.payroll_run_this_month) ? (
            <div className="space-y-2">
              {isOffline && <OfflineBanner />}
              {!kpis.payroll_run_this_month && (
                <div className="flex items-center gap-2 rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {t("dashboard.payroll_alert")}
                </div>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={Users}
          label={t("dashboard.headcount")}
          value={String(kpis.headcount)}
        />
        <KpiCard
          icon={Wallet}
          label={t("dashboard.payroll_cost")}
          value={formatMoney(kpis.monthly_payroll_cost, lang)}
        />
        <KpiCard
          icon={AlertCircle}
          label={t("dashboard.advances_out")}
          value={formatMoney(kpis.outstanding_advances, lang)}
          tone={kpis.outstanding_advances > 0 ? "warning" : undefined}
        />
        <KpiCard
          icon={TrendingUp}
          label={t("dashboard.commissions")}
          value={formatMoney(kpis.accrued_commissions, lang)}
          tone="success"
        />
        <KpiCard
          icon={Clock}
          label={t("dashboard.absences")}
          value={String(kpis.absences_today)}
          tone={kpis.absences_today > 0 ? "danger" : undefined}
        />
        <KpiCard
          icon={kpis.payroll_run_this_month ? CheckCircle2 : AlertCircle}
          label={kpis.payroll_run_this_month ? t("dashboard.payroll_done") : t("dashboard.payroll_pending")}
          value={kpis.payroll_run_this_month ? "✓" : "—"}
          tone={kpis.payroll_run_this_month ? "success" : "warning"}
        />
      </div>

      {/* Employee quick list */}
      <PageSection title={t("employees.title")} padded={false}>
        {(data!.employees).map(emp => {
          const name = lang === "ar" ? emp.name_ar : emp.name_en;
          const base = emp.salary_structure.base ?? emp.salary_structure.day_rate ?? 0;
          return (
            <div key={emp.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30">
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                {name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground">{emp.title}</p>
              </div>
              <p className="tabular-nums text-sm font-medium shrink-0">{formatMoney(base, lang)}</p>
              {emp.advance_balance > 0 && (
                <span className="text-xs text-warning tabular-nums">{formatMoney(emp.advance_balance, lang)}</span>
              )}
            </div>
          );
        })}
      </PageSection>
    </div>
  );
}
