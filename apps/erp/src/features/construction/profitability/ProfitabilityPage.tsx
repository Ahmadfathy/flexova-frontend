import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, TrendingUp, X } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { StatCard } from "@/components/patterns/StatCard";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton, KpiSkeleton } from "@/components/patterns/Skeletons";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useConstructionStore } from "@/stores/constructionStore";
import { useMockState } from "@/features/projects/useMockState";
import { getPhases, getCostActuals, getProfitability } from "@/lib/mock/construction";
import { round2, flagCostVariance } from "@/features/construction/calc";
import type { CostActualBreakdown } from "@/features/construction/types";

const FLAG_TONE: Record<string, string> = {
  over: "text-danger-text",
  under: "text-success-text",
  partial: "text-muted-foreground",
  on_track: "text-success-text",
};

export function ProfitabilityPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const boqItemsAll = useConstructionStore((s) => s.boq_items);
  const costBudgetBreakdown = useConstructionStore((s) => s.cost_budget_breakdown);
  const progressClaimsAll = useConstructionStore((s) => s.progress_claims);
  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canView = can("construction.profitability.view");

  const [drillKey, setDrillKey] = useState<string | null>(null);

  const phases = useMemo(() => getPhases(id), [id]);
  const costActuals = useMemo(() => getCostActuals(id), [id]);
  const profitability = useMemo(() => getProfitability(id), [id]);

  const contractValue = useMemo(() => Object.values(boqItemsAll).reduce((sum, i) => sum + i.value, 0), [boqItemsAll]);

  /**
   * Estimated cost is live (Cost Budget from S2, so "no Cost Budget → estimated columns
   * empty" falls out for free). Actual cost is the ledger-snapshot fixture, taken as-is —
   * golden rule #5 / DoD §9 "no source figure is recomputed" applies to the whole breakdown,
   * `subcontract` included: the DoD's own fixture check (actual cost 3,855,000) is the static
   * number, so §8's "approved sub-claims flow into actual cost" describes the backend ledger
   * pipeline this snapshot represents, not something the client recomputes on every approval.
   */
  const pivot = useMemo(() => phases.map((phase) => {
    const estBreakdown = costBudgetBreakdown[phase.id];
    const estimatedCost = estBreakdown ? round2(estBreakdown.materials + estBreakdown.labor + estBreakdown.subcontract + estBreakdown.other) : null;

    const staticPhase = costActuals?.by_phase.find((p) => p.phase_ref === phase.id);
    const actualBreakdown: CostActualBreakdown | null = staticPhase ? staticPhase.breakdown : null;
    const actualCost = actualBreakdown ? round2(actualBreakdown.materials + actualBreakdown.labor + actualBreakdown.subcontract + actualBreakdown.other) : null;

    const variance = estimatedCost != null && actualCost != null ? round2(actualCost - estimatedCost) : null;
    const variancePct = variance != null && estimatedCost ? round2((variance / estimatedCost) * 100) : null;
    const flag = actualCost != null ? flagCostVariance(phase.completion_pct, variance ?? 0) : null;

    return { phase, estimatedCost, actualCost, actualBreakdown, variance, variancePct, flag };
  }), [phases, costBudgetBreakdown, costActuals]);

  const estimatedCostTotal = useMemo(() => round2(pivot.reduce((sum, r) => sum + (r.estimatedCost ?? 0), 0)), [pivot]);
  const actualCostTotal = useMemo(() => round2(pivot.reduce((sum, r) => sum + (r.actualCost ?? 0), 0)), [pivot]);
  const totalBreakdown = useMemo(() => pivot.reduce((acc, r) => ({
    materials: acc.materials + (r.actualBreakdown?.materials ?? 0),
    labor: acc.labor + (r.actualBreakdown?.labor ?? 0),
    subcontract: acc.subcontract + (r.actualBreakdown?.subcontract ?? 0),
    other: acc.other + (r.actualBreakdown?.other ?? 0),
  }), { materials: 0, labor: 0, subcontract: 0, other: 0 }), [pivot]);

  const estimatedProfit = round2(contractValue - estimatedCostTotal);
  const estimatedMarginPct = contractValue > 0 ? round2((estimatedProfit / contractValue) * 100) : 0;

  const revenueBilled = useMemo(() => round2(
    Object.values(progressClaimsAll)
      .filter((c) => c.status === "approved" || c.status === "invoiced" || c.status === "collected")
      .reduce((sum, c) => sum + c.gross_current, 0)
  ), [progressClaimsAll]);
  const actualProfit = round2(revenueBilled - actualCostTotal);
  const actualMarginPct = revenueBilled > 0 ? round2((actualProfit / revenueBilled) * 100) : 0;

  const noCostBudget = pivot.every((r) => r.estimatedCost == null);
  const isEmpty = revenueBilled === 0 && actualCostTotal === 0;

  const drillRow = drillKey ? pivot.find((r) => r.phase.id === drillKey) : null;

  if (!canView) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("profit.title")} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
        <TableSkeleton rows={3} cols={7} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("profit.title")} />
        <PageSection><ErrorState onRetry={reload} /></PageSection>
      </div>
    );
  }

  if (forcedEmpty || isEmpty) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("profit.title")} />
        <PageSection>
          <EmptyState icon={TrendingUp} title={t("profit.empty_title")} />
        </PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("profit.title")} subtitle={costActuals ? `${t("profit.as_of")} ${formatDate(costActuals.as_of)}` : undefined} />

      {isOffline && <OfflineBanner message={t("profit.offline_note")} />}

      {noCostBudget && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-warning-tint text-warning-text text-sm font-medium rounded border border-warning/20">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("profit.no_cost_budget_note")}
          </span>
          <button type="button" className="underline underline-offset-2 shrink-0" onClick={() => navigate(`/projects/${id}/boq`)}>
            {t("profit.no_cost_budget_cta")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("profit.revenue")} value={formatMoney(revenueBilled, lang)} />
        <StatCard label={t("profit.actual_cost")} value={formatMoney(actualCostTotal, lang)} />
        <StatCard
          label={t("profit.actual_profit")}
          value={formatMoney(actualProfit, lang)}
          delta={`${actualMarginPct >= 0 ? "+" : ""}${actualMarginPct}%`}
          deltaPositive={actualProfit >= estimatedProfit}
          tone={actualProfit >= estimatedProfit ? "success" : "danger"}
        />
        <StatCard label={t("profit.estimated_profit")} value={formatMoney(estimatedProfit, lang)} delta={`${estimatedMarginPct >= 0 ? "+" : ""}${estimatedMarginPct}%`} deltaPositive={estimatedProfit >= 0} />
      </div>

      <PageSection title={t("profit.phase_col")} padded={false}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">{t("profit.phase_col")}</TableHead>
                <TableHead className="text-xs text-end">{t("profit.est_cost")}</TableHead>
                <TableHead className="text-xs text-end">{t("profit.actual_cost")}</TableHead>
                <TableHead className="text-xs text-end">{t("profit.variance")}</TableHead>
                <TableHead className="text-xs text-end">{t("profit.variance_pct")}</TableHead>
                <TableHead className="text-xs text-end">{t("profit.complete")}</TableHead>
                <TableHead className="text-xs">{t("common:status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pivot.map((r) => (
                <TableRow key={r.phase.id} className="border-b border-border last:border-0">
                  <TableCell className="px-3 py-2 text-sm font-medium">{lang === "ar" ? r.phase.name_ar : r.phase.name_en}</TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{r.estimatedCost != null ? formatMoney(r.estimatedCost, lang) : "—"}</TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums text-end">
                    {r.actualCost != null ? (
                      <button type="button" className="underline decoration-dotted underline-offset-4 hover:decoration-solid" onClick={() => setDrillKey(r.phase.id)}>
                        {formatMoney(r.actualCost, lang)}
                      </button>
                    ) : "—"}
                  </TableCell>
                  <TableCell className={cn("px-3 py-2 text-sm font-medium tabular-nums text-end", r.variance != null && (r.variance > 0 ? "text-danger-text" : r.variance < 0 ? "text-success-text" : ""))}>
                    {r.variance != null ? `${r.variance > 0 ? "+" : ""}${formatMoney(r.variance, lang)}` : "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{r.variancePct != null ? `${r.variancePct > 0 ? "+" : ""}${r.variancePct}%` : "—"}</TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{r.phase.completion_pct}%</TableCell>
                  <TableCell className={cn("px-3 py-2 text-xs font-medium", r.flag ? FLAG_TONE[r.flag] : "text-muted-foreground")}>
                    {r.flag ? t(`profit.flag_${r.flag}`) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30">
                <TableCell className="px-3 py-2 text-xs">{t("claims.totals_row")}</TableCell>
                <TableCell className="px-3 py-2 text-xs tabular-nums text-end">{formatMoney(estimatedCostTotal, lang)}</TableCell>
                <TableCell className="px-3 py-2 text-xs tabular-nums text-end">
                  <button type="button" className="underline decoration-dotted underline-offset-4 hover:decoration-solid" onClick={() => setDrillKey("__total__")}>
                    {formatMoney(actualCostTotal, lang)}
                  </button>
                </TableCell>
                <TableCell className={cn("px-3 py-2 text-xs tabular-nums text-end", actualCostTotal > estimatedCostTotal ? "text-danger-text" : "text-success-text")}>
                  {actualCostTotal - estimatedCostTotal > 0 ? "+" : ""}{formatMoney(actualCostTotal - estimatedCostTotal, lang)}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </PageSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PageSection title={t("profit.progress_vs_spend_title")}>
          <p className="text-sm text-muted-foreground">{profitability?.progress_vs_spend_ar ?? "—"}</p>
        </PageSection>

        <PageSection title={t("profit.forecast")}>
          {profitability?.approximate_forecast ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("profit.forecast_final_cost")}</span>
                <span className="tabular-nums font-medium">{formatMoney(profitability.approximate_forecast.projected_final_cost, lang)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("profit.forecast_final_profit")}</span>
                <span className="tabular-nums font-medium">{formatMoney(profitability.approximate_forecast.projected_final_profit, lang)}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">{t("profit.forecast_margin")}</span>
                <span className="tabular-nums font-semibold">{profitability.approximate_forecast.projected_margin_pct}%</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">{profitability.approximate_forecast.label_ar}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </PageSection>
      </div>

      <ModalShell
        open={drillKey !== null}
        onOpenChange={(open) => !open && setDrillKey(null)}
        title={t("profit.drill_title")}
        size="sm"
        footer={<Button variant="outline" onClick={() => setDrillKey(null)}><X className="h-4 w-4 me-1.5" />{t("common:close")}</Button>}
      >
        <div className="space-y-3">
          {(() => {
            const breakdown = drillKey === "__total__" ? totalBreakdown : drillRow?.actualBreakdown;
            if (!breakdown) return <p className="text-sm text-muted-foreground">—</p>;
            return (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("profit.materials")}</span><span className="tabular-nums">{formatMoney(breakdown.materials, lang)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("profit.labor")}</span><span className="tabular-nums">{formatMoney(breakdown.labor, lang)}</span></div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("profit.subcontract")}</span>
                  <span className="tabular-nums">{formatMoney(breakdown.subcontract, lang)}</span>
                </div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("profit.direct")}</span><span className="tabular-nums">{formatMoney(breakdown.other, lang)}</span></div>
                {breakdown.subcontract > 0 && (
                  <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => navigate(`/projects/${id}/subcontracts`)}>
                    {t("profit.drill_view_subcontracts")}
                  </Button>
                )}
              </div>
            );
          })()}
          <p className="text-xs text-muted-foreground border-t border-border pt-3">{t("profit.drill_note")}</p>
        </div>
      </ModalShell>
    </div>
  );
}
