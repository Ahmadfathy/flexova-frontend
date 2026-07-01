import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { Skeleton }    from "@/components/patterns/Skeletons";
import { RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";

import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, SlidersHorizontal, MoreVertical, Pencil, Download } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { cn }          from "@/lib/utils";
import { useCan }      from "@/lib/permissions";
import { useItems }    from "../items/useItems";
import { NewAdjustmentSheet } from "./NewAdjustmentSheet";

/* ─── Skeleton ───────────────────────────────────────────────── */

function AdjSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[80, 80, 100, 72, 88, 120].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 1 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-24 hidden md:block" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 flex-1 hidden lg:block" />
          <Skeleton className="h-7 w-7 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export function AdjustmentsPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();
  const [searchParams] = useSearchParams();

  const [sheetOpen, setSheetOpen] = useState(searchParams.get("new") === "1");

  const { data, loading, error, reload } = useItems();

  const adjustments = (data?.adjustments ?? []) as Array<{
    id: string;
    number: string;
    warehouse_id: string;
    date: string;
    reason: string;
    note?: string;
    net_diff_value: number;
    lines: unknown[];
  }>;

  const warehouseMap = Object.fromEntries(
    (data?.warehouses ?? []).map((w) => [w.id, w])
  );

  const totalCount = adjustments.length;

  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  const pageActions = can("inventory.adjustment.create") ? (
    <Button size="sm" onClick={() => setSheetOpen(true)}>
      <Plus className="h-4 w-4 me-1.5" />
      {t("actions.new_adjustment")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("adjustments.title")}
        count={totalCount > 0 ? t("adjustments.count", { n: totalCount }) : undefined}
        actions={pageActions}
      />

      <PageSection padded={false}>
        {showSkeleton && <AdjSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={SlidersHorizontal}
              title={t("adjustments.empty_title")}
              description={t("adjustments.empty_sub")}
              action={
                can("inventory.adjustment.create")
                  ? { label: t("actions.new_adjustment"), onClick: () => setSheetOpen(true) }
                  : undefined
              }
            />
          </div>
        )}

        {showTable && (
          <>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border">
                  {[
                    { key: "number",    label: t("columns.number"),    cls: "" },
                    { key: "date",      label: t("columns.date"),      cls: "hidden md:table-cell" },
                    { key: "warehouse", label: t("columns.warehouse"),  cls: "" },
                    { key: "reason",    label: t("columns.reason"),    cls: "hidden sm:table-cell" },
                    { key: "net_diff",  label: t("columns.net_diff"),  cls: "text-start" },
                    { key: "note",      label: t("columns.note"),      cls: "hidden lg:table-cell" },
                    { key: "actions",   label: "",                     cls: "w-10" },
                  ].map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-10 py-2 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap",
                        col.cls
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {adjustments.map((adj) => {
                  const wh      = warehouseMap[adj.warehouse_id];
                  const diffPos = adj.net_diff_value >= 0;

                  return (
                    <TableRow
                      key={adj.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                    >
                      {/* Number */}
                      <TableCell className="px-3 py-3">
                        <span className="font-mono text-sm font-medium">{adj.number}</span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-3 py-3 text-sm text-muted-foreground tabular-nums hidden md:table-cell">
                        {adj.date}
                      </TableCell>

                      {/* Warehouse */}
                      <TableCell className="px-3 py-3 text-sm">
                        {wh ? (lang === "ar" ? wh.name_ar : wh.name_en) : adj.warehouse_id}
                      </TableCell>

                      {/* Reason */}
                      <TableCell className="px-3 py-3 hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {t(`adj_reasons.${adj.reason}`, { defaultValue: adj.reason })}
                        </Badge>
                      </TableCell>

                      {/* Net diff value */}
                      <TableCell className="px-3 py-3 text-start tabular-nums text-sm">
                        <span className={cn(
                          "font-medium",
                          diffPos ? "text-success" : "text-destructive"
                        )}>
                          {diffPos ? "+" : ""}{formatMoney(adj.net_diff_value, lang)}
                        </span>
                      </TableCell>

                      {/* Note */}
                      <TableCell className="px-3 py-3 text-sm text-muted-foreground hidden lg:table-cell max-w-52 truncate">
                        {adj.note ?? "—"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-3 py-3 w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <RowActionsContent>
                            <RowActionItem icon={Pencil}>{t("actions.edit")}</RowActionItem>
                            <RowActionItem icon={Download}>{t("actions.export")}</RowActionItem>
                          </RowActionsContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-end px-4 py-2 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("adjustments.showing", { from: 1, to: totalCount, total: totalCount })}
              </span>
            </div>
          </>
        )}
      </PageSection>

      <NewAdjustmentSheet open={sheetOpen} onOpenChange={setSheetOpen} data={data} />
    </div>
  );
}
