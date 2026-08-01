import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

import { PageSection } from "@/components/patterns/PageSection";
import { StatCard } from "@/components/patterns/StatCard";
import { ProgressRow } from "@/components/patterns/ProgressRow";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton, KpiSkeleton } from "@/components/patterns/Skeletons";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore } from "@/stores/projectsStore";
import { getProjectInvoices, getProjectEmployees } from "@/lib/mock/projects";
import { useMockState } from "../useMockState";
import { computeProjectLedger } from "./ledger";

function MetricLink({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  if (!onClick) return <div className="p-3 rounded">{children}</div>;
  return (
    <button type="button" onClick={onClick} className="w-full text-start p-3 rounded hover:bg-muted/50 transition-colors">
      {children}
    </button>
  );
}

export function ProjectOverviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();
  const can = useCan();

  const project = useProjectsStore((s) => s.projects[id]);
  const clients = useProjectsStore((s) => s.clients);
  const allTimeEntries = useProjectsStore((s) => s.time_entries);
  const allExpenses = useProjectsStore((s) => s.expenses);
  const { loading, error, isOffline, reload } = useMockState();

  const canFinancials = can("projects.financials");

  const entries = useMemo(
    () => Object.values(allTimeEntries).filter((e) => e.project_id === id),
    [allTimeEntries, id]
  );
  const expenses = useMemo(
    () => Object.values(allExpenses).filter((e) => e.project_id === id),
    [allExpenses, id]
  );
  const invoices = useMemo(() => getProjectInvoices(id), [id]);
  const employees = useMemo(() => getProjectEmployees(), []);
  const ledger = useMemo(
    () => computeProjectLedger(entries, expenses, invoices, employees),
    [entries, expenses, invoices, employees]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <PageSection><ErrorState onRetry={reload} /></PageSection>;
  }

  if (!project) return null;

  const client = clients[project.client_id];
  const clientLabel = client ? (lang === "ar" ? client.name_ar : client.name_en) : "—";
  const dateRange = `${formatDate(project.start_date)} → ${project.actual_end ? formatDate(project.actual_end) : project.target_end ? formatDate(project.target_end) : "—"}`;

  const hasEstimate = (project.budget_estimated ?? 0) > 0 || (project.hours_estimated ?? 0) > 0;

  const hoursPct = project.hours_estimated ? Math.round((ledger.hoursActual / project.hours_estimated) * 100) : 0;
  const costPct = project.budget_estimated ? Math.round((ledger.costActual / project.budget_estimated) * 100) : 0;
  const revenuePct = project.budget_estimated ? Math.round((ledger.revenueActual / project.budget_estimated) * 100) : 0;
  const marginPct = project.budget_estimated && project.budget_estimated > 0
    ? Math.round((ledger.marginActual / project.budget_estimated) * 100)
    : (ledger.revenueActual > 0 ? Math.round((ledger.marginActual / ledger.revenueActual) * 100) : 0);

  return (
    <div className="space-y-4">
      {isOffline && <OfflineBanner message={t("list.offline_note")} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("filters.client")} value={clientLabel} />
        <StatCard label={t("filters.billing")} value={t(`billing.${project.billing_model}`)} />
        <StatCard label={`${t("form.start_date")} → ${t("form.target_end")}`} value={dateRange} />
        <StatCard label={t("form.team_section")} value={String(project.team.length)} />
      </div>

      {canFinancials && (
        <PageSection title={t("overview.title")}>
          {!hasEstimate ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("overview.no_budget")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <MetricLink onClick={() => navigate(`/projects/${id}/time`)}>
                <ProgressRow
                  label={t("overview.hours")}
                  value={hoursPct}
                  displayValue={project.hours_estimated ? `${ledger.hoursActual}/${project.hours_estimated}` : String(ledger.hoursActual)}
                  tone={hoursPct > 100 ? "danger" : "brand"}
                />
              </MetricLink>

              <MetricLink onClick={() => navigate(`/projects/${id}/time`)}>
                <ProgressRow
                  label={t("overview.cost")}
                  value={costPct}
                  displayValue={project.budget_estimated
                    ? `${formatMoney(ledger.costActual, lang)} / ${formatMoney(project.budget_estimated, lang)}`
                    : formatMoney(ledger.costActual, lang)}
                  tone={costPct > 100 ? "danger" : "warning"}
                />
              </MetricLink>

              <MetricLink onClick={() => navigate(`/projects/${id}/invoices`)}>
                <ProgressRow
                  label={t("overview.revenue")}
                  value={revenuePct}
                  displayValue={project.budget_estimated
                    ? `${formatMoney(ledger.revenueActual, lang)} / ${formatMoney(project.budget_estimated, lang)}`
                    : formatMoney(ledger.revenueActual, lang)}
                  tone="success"
                />
              </MetricLink>

              <div className="p-3 rounded flex items-center justify-between gap-3 border border-border">
                <span className="text-sm font-medium text-foreground">{t("overview.margin")}</span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums",
                  ledger.marginActual >= 0 ? "text-success-text" : "text-danger-text"
                )}>
                  {ledger.marginActual >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formatMoney(ledger.marginActual, lang)} ({marginPct}%)
                </span>
              </div>
            </div>
          )}
        </PageSection>
      )}
    </div>
  );
}
