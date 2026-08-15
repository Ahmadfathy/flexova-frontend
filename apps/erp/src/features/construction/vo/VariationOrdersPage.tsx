import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileDiff, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton } from "@/components/patterns/Skeletons";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useConstructionStore } from "@/stores/constructionStore";
import { useMockState } from "@/features/projects/useMockState";
import type { VoStatus, VoLineType } from "@/features/construction/types";

const STATUS_PILL: Record<VoStatus, PillVariant> = {
  draft: "inactive",
  submitted: "pending",
  approved: "approved",
  rejected: "rejected",
};

function typeLabel(t: (key: string) => string, types: VoLineType[]): string {
  const unique = Array.from(new Set(types));
  if (unique.length === 0) return "—";
  if (unique.length > 1) return t("vo.type_mixed");
  return t(`vo.type_${unique[0] === "add_item" ? "add" : unique[0] === "modify_qty" ? "qty" : "price"}`);
}

export function VariationOrdersPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const variationOrders = useConstructionStore((s) => s.variation_orders);
  const boqVersion = useConstructionStore((s) => s.boq_version);
  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canCreate = can("construction.vo.create");

  const rows = useMemo(() => {
    const all = forcedEmpty ? [] : Object.values(variationOrders);
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [variationOrders, forcedEmpty]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("vo.title")} />
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("vo.title")} />
        <PageSection><ErrorState onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("vo.title")}
        subtitle={`${t("vo.boq_version")}: ${boqVersion}`}
        actions={canCreate ? (
          <Button size="sm" onClick={() => navigate(`/projects/${id}/variations/new`)}>
            <Plus className="h-4 w-4 me-1.5" />{t("vo.new_vo")}
          </Button>
        ) : undefined}
      />

      {isOffline && <OfflineBanner />}

      {rows.length === 0 ? (
        <PageSection>
          <EmptyState
            icon={FileDiff}
            title={t("vo.empty_title")}
            action={canCreate ? { label: t("vo.new_vo"), onClick: () => navigate(`/projects/${id}/variations/new`) } : undefined}
          />
        </PageSection>
      ) : (
        <PageSection padded={false}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">{t("vo.col_number")}</TableHead>
                  <TableHead className="text-xs">{t("vo.col_date")}</TableHead>
                  <TableHead className="text-xs">{t("vo.col_type")}</TableHead>
                  <TableHead className="text-xs text-end">{t("vo.col_impact")}</TableHead>
                  <TableHead className="text-xs">{t("vo.col_status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((vo) => (
                  <TableRow
                    key={vo.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                    onClick={() => navigate(`/projects/${id}/variations/${vo.id}`)}
                  >
                    <TableCell className="px-3 py-2.5 text-sm font-medium">{vo.number}</TableCell>
                    <TableCell className="px-3 py-2.5 text-sm">{formatDate(vo.date)}</TableCell>
                    <TableCell className="px-3 py-2.5 text-sm">{typeLabel(t, vo.lines.map((l) => l.type))}</TableCell>
                    <TableCell className={cn("px-3 py-2.5 text-sm tabular-nums text-end font-medium", vo.contract_value_impact > 0 ? "text-success-text" : vo.contract_value_impact < 0 ? "text-danger-text" : "")}>
                      {vo.status === "approved" || vo.status === "rejected" ? (
                        <>{vo.contract_value_impact > 0 ? "+" : ""}{formatMoney(vo.contract_value_impact, lang)}</>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <StatusPill variant={STATUS_PILL[vo.status]} label={t(`vo.status_${vo.status}`)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </PageSection>
      )}
    </div>
  );
}
