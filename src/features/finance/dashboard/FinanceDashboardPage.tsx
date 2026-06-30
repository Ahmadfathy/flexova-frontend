import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Wallet, Users, Store, Receipt } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { KpiCard }       from "@/components/patterns/KpiCard";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { formatMoney } from "@/lib/format";
import { useFinanceData } from "../data/useFinanceData";

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-40" />
        </Card>
      ))}
    </div>
  );
}

export function FinanceDashboardPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useFinanceData();

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dashboard.title")} />
        <PageSection><KpiSkeleton /></PageSection>
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
    <div className="space-y-4 pb-6">
      <PageHeader title={t("dashboard.title")} />

      {isOffline && <OfflineBanner />}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={Wallet}
          label={t("dashboard.kpi_liquidity")}
          value={formatMoney(kpis.liquidity, lang)}
          tone="success"
        />
        <KpiCard
          icon={kpis.net_cashflow_today >= 0 ? TrendingUp : TrendingDown}
          label={t("dashboard.kpi_cashflow")}
          value={formatMoney(kpis.net_cashflow_today, lang)}
          tone={kpis.net_cashflow_today >= 0 ? "success" : "danger"}
        />
        <KpiCard
          icon={Users}
          label={t("dashboard.kpi_ar")}
          value={formatMoney(kpis.ar_total, lang)}
        />
        <KpiCard
          icon={Store}
          label={t("dashboard.kpi_ap")}
          value={formatMoney(kpis.ap_total, lang)}
          tone="danger"
        />
        <KpiCard
          icon={Receipt}
          label={t("dashboard.kpi_expenses")}
          value={formatMoney(kpis.monthly_expenses, lang)}
        />
        <KpiCard
          icon={kpis.estimated_profit >= 0 ? TrendingUp : TrendingDown}
          label={t("dashboard.kpi_profit")}
          value={formatMoney(kpis.estimated_profit, lang)}
          tone={kpis.estimated_profit >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top expense categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("dashboard.top_expenses")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {kpis.top_expense_categories.map(row => {
              const cat = data!.expenseCategories.find(c => c.id === row.category_id);
              const catName = cat ? (lang === "ar" ? cat.name_ar : cat.name_en) : row.category_id;
              const maxAmt  = Math.max(...kpis.top_expense_categories.map(r => r.amount));
              const pct     = maxAmt > 0 ? row.amount / maxAmt : 0;
              return (
                <div key={row.category_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{catName}</span>
                    <span className="tabular-nums font-medium">{formatMoney(row.amount, lang)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Overdue receivables */}
        {kpis.overdue_receivables.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("dashboard.overdue")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border">
                {kpis.overdue_receivables.map(row => {
                  const customer = data!.customers.find(c => c.id === row.customer_id);
                  const cName = customer
                    ? (lang === "ar" ? customer.name_ar : customer.name_en)
                    : row.customer_id;
                  return (
                    <div key={row.customer_id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{cName}</p>
                        <p className="text-xs text-danger">{t("dashboard.overdue_days", { n: row.days_overdue })}</p>
                      </div>
                      <span className="tabular-nums font-semibold text-danger">
                        {formatMoney(row.amount, lang)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Treasuries summary */}
      <PageSection padded={false}>
        <div className="divide-y divide-border">
          {data!.treasuries.map(tr => {
            const name = lang === "ar" ? tr.name_ar : tr.name_en;
            return (
              <div key={tr.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  {tr.account_no && (
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">{tr.account_no}</p>
                  )}
                </div>
                <span className="tabular-nums font-semibold">{formatMoney(tr.balance, lang)}</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
            <span className="text-sm font-semibold">{t("treasuries.total_balance")}</span>
            <span className="tabular-nums font-bold text-success">
              {formatMoney(data!.treasuries.reduce((s, tr) => s + tr.balance, 0), lang)}
            </span>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
