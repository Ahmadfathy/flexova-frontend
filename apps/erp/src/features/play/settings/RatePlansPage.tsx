import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, Banknote, Pencil, MoreVertical, Lock } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { DataTable, RowActionsContent, RowActionItem, type Column } from "@/components/patterns/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePlayRatePlans } from "@/stores/playRatePlans";
import type { RatePlan } from "@/features/play/types";
import { useRatePlansList } from "./useRatePlansList";

export default function RatePlansPage() {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const ratePlans = usePlayRatePlans((s) => s.ratePlans);
  const { loading, error, isOffline, forcedEmpty, reload } = useRatePlansList();

  const [search, setSearch] = useState("");

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  if (!can("play.config")) {
    return (
      <div>
        <PageHeader title={t("rate.title")} />
        <PageSection>
          <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-16 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("rate.permission_required")}</p>
          </div>
        </PageSection>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("rate.title")} />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("rate.title")} />
        <PageSection><ErrorState title={t("rate.error_title")} description={t("rate.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const allPlans = forcedEmpty ? [] : Object.values(ratePlans);

  const filtered = search
    ? allPlans.filter((rp) => {
        const q = search.trim().toLowerCase();
        return rp.name_ar.includes(search) || rp.name_en.toLowerCase().includes(q);
      })
    : allPlans;

  const noResults = forcedNoResults || (allPlans.length > 0 && filtered.length === 0);

  const columns: Column<RatePlan>[] = [
    {
      key: "name", header: t("rate.col_name"),
      cell: (rp) => (
        <button onClick={() => navigate(`/settings/play/rate-plans/${rp.id}`)} className="text-brand hover:underline font-medium">
          {lang === "ar" ? rp.name_ar : rp.name_en}
        </button>
      ),
    },
    { key: "unit", header: t("rate.col_unit"), cell: (rp) => t(`rate.unit_${rp.unit}`) },
    { key: "rules", header: t("rate.col_rules"), numeric: true, cell: (rp) => rp.rules.length },
    { key: "blocks", header: t("rate.col_blocks"), numeric: true, cell: (rp) => rp.prepaid_blocks.length },
    {
      key: "actions", header: t("rate.col_actions"),
      cell: (rp) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <RowActionsContent>
            <RowActionItem icon={Pencil} onClick={() => navigate(`/settings/play/rate-plans/${rp.id}`)}>
              {t("rate.edit_btn")}
            </RowActionItem>
          </RowActionsContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("rate.title")}
        count={allPlans.length > 0 ? t("rate.count", { n: allPlans.length }) : undefined}
        actions={
          <Button size="sm" onClick={() => navigate("/settings/play/rate-plans/new")}>
            <Plus className="h-4 w-4 me-1.5" />
            {t("rate.new")}
          </Button>
        }
        alert={isOffline ? <OfflineBanner message={t("rate.offline_note")} /> : undefined}
      />

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("rate.search_placeholder")} className="ps-9" />
          </div>
        </div>

        {allPlans.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title={t("rate.empty_title")}
            description={t("rate.empty_body")}
            action={{ label: t("rate.new"), onClick: () => navigate("/settings/play/rate-plans/new") }}
          />
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("rate.no_results_title")}</p>
            <p className="text-xs text-muted-foreground">{t("rate.no_results_body")}</p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>{t("rate.clear_filters")}</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={filtered} keyExtractor={(rp) => rp.id} />
          </div>
        )}
      </PageSection>
    </div>
  );
}
