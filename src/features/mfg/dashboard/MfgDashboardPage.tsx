import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardList, Clock, Boxes, Trash2, AlertTriangle, Plus, ListTree,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { KpiCard }       from "@/components/patterns/KpiCard";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { Button } from "@/components/ui/button";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { getManufacturingOrders, getBomTemplates, getItems, getDashboard } from "@/lib/mock/mfg";
import { useMfgDashboard } from "./useMfgDashboard";

const OPEN_STATUSES = new Set(["draft", "approved", "in_progress", "partial"]);

export function MfgDashboardPage() {
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const { loading, error, isOffline, forcedEmpty, reload } = useMfgDashboard();

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  if (!can("mfg.order.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("dash.permission_required")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("dash.title")} />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-sm bg-card shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-9 rounded" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dash.title")} />
        <PageSection><ErrorState title={t("dash.error_title")} description={t("dash.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const mos = forcedEmpty ? [] : getManufacturingOrders();
  const bomTemplates = forcedEmpty ? [] : getBomTemplates();
  const items = getItems();

  const isEmpty = forcedEmpty || (mos.length === 0 && bomTemplates.length === 0);

  if (isEmpty) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dash.title")} />
        <PageSection>
          <EmptyState
            icon={ListTree}
            title={t("dash.empty_title")}
            description={t("dash.empty_body")}
            action={can("mfg.bom.manage") ? { label: t("bom.new"), onClick: () => navigate("/mfg/bom/new") } : undefined}
          />
        </PageSection>
      </div>
    );
  }

  // ── KPI aggregation from fixture MOs (not the fixture's precomputed dashboard.kpis) ──
  const ordersInProgress = mos.filter(m => m.status === "in_progress" || m.status === "partial").length;
  const ordersAwaiting   = mos.filter(m => m.status === "approved").length;
  const wipValue = mos
    .filter(m => OPEN_STATUSES.has(m.status))
    .reduce((sum, m) => sum + m.cost_summary.total, 0);
  const scrapMonth = mos.reduce((sum, m) => sum + (m.cost_summary.scrap_effect ?? 0), 0);
  // No due-date field exists on an MO in the v1 fixture, so "overdue" can't be derived
  // from MO data yet — fall back to the fixture's own precomputed figure.
  const ordersOverdue = getDashboard().kpis.orders_overdue;

  const shortageAlerts = mos
    .filter(m => m.status === "approved" && m.material_shortage && m.material_shortage.length > 0)
    .flatMap(m =>
      (m.material_shortage ?? []).map(s => {
        const item = items.find(i => i.id === s.item_id);
        const itemName = item ? (lang === "ar" ? item.name_ar : item.name_en) : s.item_id;
        return { key: `${m.id}_${s.item_id}`, mo: m, itemName };
      })
    );

  const hasAlerts = shortageAlerts.length > 0 && !forcedNoResults;

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title={t("dash.title")}
        actions={
          <div className="flex items-center gap-2">
            {can("mfg.bom.manage") && (
              <Button size="sm" variant="outline" onClick={() => navigate("/mfg/bom/new")}>
                <Plus className="size-4 me-1.5" />
                {t("bom.new")}
              </Button>
            )}
            {can("mfg.order.create") && (
              <Button size="sm" onClick={() => navigate("/mfg/orders/new")}>
                <Plus className="size-4 me-1.5" />
                {t("orders.new")}
              </Button>
            )}
          </div>
        }
        alert={isOffline ? <OfflineBanner message={t("dash.offline_note")} /> : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={ClipboardList}
          label={t("dash.in_progress")}
          value={String(ordersInProgress)}
        />
        <KpiCard
          icon={Clock}
          label={t("dash.awaiting")}
          value={String(ordersAwaiting)}
        />
        <KpiCard
          icon={Boxes}
          label={t("dash.wip_value")}
          value={formatMoney(wipValue, lang)}
          tone="brand"
        />
        <KpiCard
          icon={Trash2}
          label={t("dash.scrap_month")}
          value={formatMoney(scrapMonth, lang)}
          tone={scrapMonth > 0 ? "warning" : undefined}
        />
        <KpiCard
          icon={AlertTriangle}
          label={t("dash.overdue")}
          value={String(ordersOverdue)}
          tone={ordersOverdue > 0 ? "danger" : undefined}
        />
      </div>

      <PageSection title={t("dash.alerts_title")}>
        {hasAlerts ? (
          <div className="space-y-2">
            {shortageAlerts.map(({ key, mo, itemName }) => (
              <button
                key={key}
                onClick={() => navigate(`/mfg/orders/${mo.id}`)}
                className="w-full flex items-center gap-2 rounded border border-warning/40 bg-warning-tint px-4 py-3 text-sm text-warning-text text-start hover:bg-warning/10 transition-colors"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="flex-1">{t("dash.shortage_alert", { item: itemName })}</span>
                <span className="font-mono text-xs shrink-0">{mo.number}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("dash.no_alerts")}</p>
        )}
      </PageSection>
    </div>
  );
}
