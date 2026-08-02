import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wallet, TrendingUp, TrendingDown, ClipboardList, AlertTriangle, CheckCircle2 } from "lucide-react";

import { PageSection } from "@/components/patterns/PageSection";
import { StatCard } from "@/components/patterns/StatCard";
import { ProgressRow } from "@/components/patterns/ProgressRow";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Skeleton, KpiSkeleton } from "@/components/patterns/Skeletons";
import { Button } from "@/components/ui/button";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { isFlagEnabled } from "@/lib/flags";
import { useProjectsStore } from "@/stores/projectsStore";
import { useConstructionStore } from "@/stores/constructionStore";
import { getProjectInvoices, getProjectEmployees } from "@/lib/mock/projects";
import { computeWarrantyReleaseDue } from "@/features/construction/calc";
import { useMockState } from "../useMockState";
import { computeProjectLedger } from "./ledger";

function FinRow({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-success-text" : tone === "warning" ? "text-warning-text" : tone === "danger" ? "text-danger-text" : "text-foreground";
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", toneClass)}>{value}</span>
    </div>
  );
}

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
  const { t: tc } = useTranslation("construction");
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

  const isConstruction = isFlagEnabled("construction.enabled") && project?.mode === "construction";

  const boqItemsAll = useConstructionStore((s) => s.boq_items);
  const progressClaimsAll = useConstructionStore((s) => s.progress_claims);
  const retentionLive = useConstructionStore((s) => s.retention);
  const advanceLive = useConstructionStore((s) => s.advance);
  const variationOrdersAll = useConstructionStore((s) => s.variation_orders);
  const contractTermsLive = useConstructionStore((s) => s.contract_terms);

  // §11 Overview additions — financial position, latest claim, alerts. Recomputed live from the
  // construction store (never trusts the fixture's own precomputed `overall_completion_pct`
  // etc.) so it stays correct as BOQ/VO/claims editing lands across steps.
  const construction = useMemo(() => {
    if (!project || !isConstruction) return null;
    const boqItems = Object.values(boqItemsAll);
    const claims = Object.values(progressClaimsAll);
    const retention = retentionLive;
    const advance = advanceLive;
    const variationOrders = Object.values(variationOrdersAll);

    const contractValue = boqItems.reduce((sum, i) => sum + i.value, 0);
    const billed = claims
      .filter((c) => c.status === "approved" || c.status === "invoiced" || c.status === "collected")
      .reduce((sum, c) => sum + c.gross_current, 0);
    const collected = claims
      .filter((c) => c.status === "collected")
      .reduce((sum, c) => sum + c.net_payable, 0);
    const retentionOutstanding = retention?.outstanding ?? 0;
    const advanceOutstanding = advance?.outstanding ?? 0;
    const netRemaining = contractValue - collected;

    const latestClaim = claims.length
      ? [...claims].sort((a, b) => b.date.localeCompare(a.date))[0]
      : null;

    const pendingVo = variationOrders.find((vo) => vo.status === "submitted");
    const warrantyDue = retention
      ? computeWarrantyReleaseDue(retention.release_events, contractTermsLive.release_template.warranty_months, retention.outstanding)
      : { due: false, sinceDate: null };

    return {
      boqItems, claims, retention, advance,
      contractValue, billed, collected, retentionOutstanding, advanceOutstanding, netRemaining,
      latestClaim, pendingVo, warrantyDue,
    };
  }, [project, isConstruction, boqItemsAll, progressClaimsAll, retentionLive, advanceLive, variationOrdersAll, contractTermsLive]);

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

      {isConstruction && construction && (
        construction.boqItems.length === 0 ? (
          <PageSection>
            <EmptyState
              icon={ClipboardList}
              title={tc("overview.boq_onboarding_title")}
              action={{ label: tc("overview.boq_onboarding_cta"), onClick: () => navigate(`/projects/${id}/boq`) }}
            />
          </PageSection>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <PageSection title={tc("overview.financial_position_title")} className="lg:col-span-2">
              <FinRow label={tc("overview.contract_value")} value={formatMoney(construction.contractValue, lang)} />
              <FinRow label={tc("overview.billed")} value={formatMoney(construction.billed, lang)} tone="success" />
              <FinRow label={tc("overview.collected")} value={formatMoney(construction.collected, lang)} tone="success" />
              <FinRow label={tc("overview.retention")} value={formatMoney(construction.retentionOutstanding, lang)} tone="warning" />
              <FinRow label={tc("overview.advance_outstanding")} value={formatMoney(construction.advanceOutstanding, lang)} tone="warning" />
              <FinRow label={tc("overview.net_remaining")} value={formatMoney(construction.netRemaining, lang)} />
            </PageSection>

            <div className="space-y-4">
              <PageSection
                title={tc("overview.latest_claim_title")}
                actions={can("construction.claim.create") && (
                  <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${id}/claims/new`)}>
                    {tc("overview.new_claim")}
                  </Button>
                )}
              >
                {construction.latestClaim ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${id}/claims/${construction.latestClaim!.id}`)}
                    className="w-full text-start space-y-1.5 hover:bg-muted/50 -m-1 p-1 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{construction.latestClaim.number}</span>
                      <span className="text-xs text-muted-foreground">{construction.latestClaim.period_ar}</span>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{formatMoney(construction.latestClaim.net_payable, lang)}</p>
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">{tc("overview.no_claims_yet")}</p>
                )}
              </PageSection>

              <PageSection title={tc("overview.alerts_title")}>
                <div className="space-y-2">
                  {construction.retention?.at_cap && (
                    <div className="flex items-start gap-2 text-sm text-warning-text">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{construction.retention._note_ar}</span>
                    </div>
                  )}
                  {construction.advanceOutstanding > 0 && (
                    <div className="flex items-start gap-2 text-sm text-warning-text">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{tc("overview.alert_advance_outstanding", { amount: formatMoney(construction.advanceOutstanding, lang) })}</span>
                    </div>
                  )}
                  {construction.pendingVo && (
                    <div className="flex items-start gap-2 text-sm text-warning-text">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{tc("overview.alert_pending_vo")}</span>
                    </div>
                  )}
                  {construction.warrantyDue.due && (
                    <div className="flex items-start gap-2 text-sm text-danger-text">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{tc("retention.warranty_due_alert", { date: formatDate(construction.warrantyDue.sinceDate ?? "") })}</span>
                    </div>
                  )}
                  {!construction.retention?.at_cap && construction.advanceOutstanding <= 0 && !construction.pendingVo && !construction.warrantyDue.due && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{tc("overview.no_alerts")}</span>
                    </div>
                  )}
                </div>
              </PageSection>
            </div>
          </div>
        )
      )}

      {!isConstruction && canFinancials && (
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
