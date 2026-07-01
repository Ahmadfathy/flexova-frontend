import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { StatusPill }  from "@/components/patterns/StatusPill";
import { Skeleton }    from "@/components/patterns/Skeletons";
import { RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";

import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, ArrowRightLeft, MoreVertical, ArrowRight, Pencil, Download } from "lucide-react";

import { cn }       from "@/lib/utils";
import { useCan }   from "@/lib/permissions";
import { useItems } from "../items/useItems";
import { NewTransferSheet } from "./NewTransferSheet";

/* ─── Skeleton ───────────────────────────────────────────────── */

function TrfSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[80, 80, 100, 100, 80, 120].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 1 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-24 hidden md:block" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-4 w-4 hidden md:block" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 flex-1 hidden md:block" />
          <Skeleton className="h-7 w-7 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export function TransfersPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();

  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, loading, error, reload } = useItems();

  const transfers = (data?.transfers ?? []) as Array<{
    id: string;
    number: string;
    from_wh: string;
    to_wh: string;
    date: string;
    status: string;
    note?: string;
    lines: unknown[];
  }>;

  const warehouseMap = Object.fromEntries(
    (data?.warehouses ?? []).map((w) => [w.id, w])
  );

  const totalCount = transfers.length;

  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  const pageActions = can("inventory.transfer.create") ? (
    <Button size="sm" onClick={() => setSheetOpen(true)}>
      <Plus className="h-4 w-4 me-1.5" />
      {t("actions.new_transfer")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("transfers.title")}
        count={totalCount > 0 ? t("transfers.count", { n: totalCount }) : undefined}
        actions={pageActions}
      />

      <PageSection padded={false}>
        {showSkeleton && <TrfSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={ArrowRightLeft}
              title={t("transfers.empty_title")}
              description={t("transfers.empty_sub")}
              action={
                can("inventory.transfer.create")
                  ? { label: t("actions.new_transfer"), onClick: () => setSheetOpen(true) }
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
                    { key: "number",  label: t("columns.number"),  cls: "" },
                    { key: "date",    label: t("columns.date"),    cls: "hidden md:table-cell" },
                    { key: "from_wh", label: t("columns.from_wh"), cls: "" },
                    { key: "arrow",   label: "",                   cls: "w-6 hidden md:table-cell" },
                    { key: "to_wh",   label: t("columns.to_wh"),   cls: "" },
                    { key: "status",  label: t("columns.status"),  cls: "" },
                    { key: "note",    label: t("columns.note"),    cls: "hidden lg:table-cell" },
                    { key: "actions", label: "",                   cls: "w-10" },
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
                {transfers.map((trf) => {
                  const fromWh = warehouseMap[trf.from_wh];
                  const toWh   = warehouseMap[trf.to_wh];

                  return (
                    <TableRow
                      key={trf.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                    >
                      {/* Number */}
                      <TableCell className="px-3 py-3">
                        <span className="font-mono text-sm font-medium">{trf.number}</span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-3 py-3 text-sm text-muted-foreground tabular-nums hidden md:table-cell">
                        {trf.date}
                      </TableCell>

                      {/* From */}
                      <TableCell className="px-3 py-3 text-sm">
                        {fromWh ? (lang === "ar" ? fromWh.name_ar : fromWh.name_en) : trf.from_wh}
                      </TableCell>

                      {/* Arrow */}
                      <TableCell className="px-0 py-3 w-6 hidden md:table-cell text-muted-foreground">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </TableCell>

                      {/* To */}
                      <TableCell className="px-3 py-3 text-sm">
                        {toWh ? (lang === "ar" ? toWh.name_ar : toWh.name_en) : trf.to_wh}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-3 py-3">
                        <StatusPill
                          variant={trf.status === "posted" ? "approved" : "pending"}
                          label={t(`stock_status.${trf.status}`)}
                        />
                      </TableCell>

                      {/* Note */}
                      <TableCell className="px-3 py-3 text-sm text-muted-foreground hidden lg:table-cell max-w-48 truncate">
                        {trf.note ?? "—"}
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
                {t("transfers.showing", { from: 1, to: totalCount, total: totalCount })}
              </span>
            </div>
          </>
        )}
      </PageSection>

      <NewTransferSheet open={sheetOpen} onOpenChange={setSheetOpen} data={data} />
    </div>
  );
}
