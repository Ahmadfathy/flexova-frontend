import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { StatusPill }  from "@/components/patterns/StatusPill";
import { Skeleton }    from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, ClipboardList, MoreVertical } from "lucide-react";

import { formatNumber } from "@/lib/format";
import { cn }           from "@/lib/utils";
import { useCan }       from "@/lib/permissions";
import { useItems }     from "../items/useItems";
import { NewStocktakeDialog } from "./NewStocktakeDialog";

/* ─── Status variant mapping ─────────────────────────────────── */

const STOCK_STATUS_VARIANT: Record<string, "pending" | "approved"> = {
  counting: "pending",
  approved: "approved",
  draft:    "pending",
};

/* ─── Skeleton ───────────────────────────────────────────────── */

function StSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[80, 96, 80, 72, 80, 60, 72].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.3 }}
        >
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24 hidden md:block" />
          <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3.5 w-10 hidden lg:block" />
          <Skeleton className="h-3.5 w-20 hidden lg:block" />
          <Skeleton className="h-7 w-7 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export function StocktakesPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const navigate     = useNavigate();
  const can          = useCan();

  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, loading, error, reload } = useItems();

  const stocktakes = (data?.stocktakes ?? []) as Array<{
    id: string;
    number: string;
    warehouse_id: string;
    date: string;
    mode: "live" | "freeze";
    status: string;
    items_count: number;
    net_diff_qty: number;
    net_diff_value: number;
  }>;

  const warehouseMap = Object.fromEntries(
    (data?.warehouses ?? []).map((w) => [w.id, w])
  );

  const totalCount = stocktakes.length;

  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  const pageActions = can("inventory.stocktake.create") ? (
    <Button size="sm" onClick={() => setDialogOpen(true)}>
      <Plus className="h-4 w-4 me-1.5" />
      {t("actions.new_stocktake")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("stocktakes.title")}
        subtitle={totalCount > 0 ? t("stocktakes.count", { n: totalCount }) : undefined}
        actions={pageActions}
      />

      <PageSection padded={false}>
        {showSkeleton && <StSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={ClipboardList}
              title={t("stocktakes.empty_title")}
              description={t("stocktakes.empty_sub")}
              action={
                can("inventory.stocktake.create")
                  ? { label: t("actions.new_stocktake"), onClick: () => setDialogOpen(true) }
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
                    { key: "number",   label: t("columns.number"),   cls: "" },
                    { key: "warehouse",label: t("columns.warehouse"), cls: "" },
                    { key: "date",     label: t("columns.date"),      cls: "hidden md:table-cell" },
                    { key: "mode",     label: t("columns.mode"),      cls: "hidden sm:table-cell" },
                    { key: "status",   label: t("columns.status"),    cls: "" },
                    { key: "items",    label: t("columns.items_count"),cls: "hidden lg:table-cell text-end" },
                    { key: "net_diff", label: t("columns.net_diff"),  cls: "hidden lg:table-cell text-end" },
                    { key: "actions",  label: "",                     cls: "w-10" },
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
                {stocktakes.map((st) => {
                  const wh       = warehouseMap[st.warehouse_id];
                  const diffPos  = st.net_diff_qty >= 0;

                  return (
                    <TableRow
                      key={st.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/inventory/stocktakes/${st.id}`)}
                    >
                      {/* Number */}
                      <TableCell className="px-3 py-3">
                        <span className="font-mono text-sm font-medium">{st.number}</span>
                      </TableCell>

                      {/* Warehouse */}
                      <TableCell className="px-3 py-3 text-sm">
                        {wh ? (lang === "ar" ? wh.name_ar : wh.name_en) : st.warehouse_id}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-3 py-3 text-sm text-muted-foreground hidden md:table-cell tabular-nums">
                        {st.date}
                      </TableCell>

                      {/* Mode */}
                      <TableCell className="px-3 py-3 hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {t(`stock_modes.${st.mode}`)}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-3 py-3">
                        <StatusPill
                          variant={STOCK_STATUS_VARIANT[st.status] ?? "pending"}
                          label={t(`stock_status.${st.status}`)}
                        />
                      </TableCell>

                      {/* Items count */}
                      <TableCell className="px-3 py-3 text-start tabular-nums text-sm hidden lg:table-cell">
                        {formatNumber(st.items_count)}
                      </TableCell>

                      {/* Net diff */}
                      <TableCell className="px-3 py-3 text-start tabular-nums text-sm hidden lg:table-cell">
                        <span className={cn(
                          "font-medium",
                          diffPos ? "text-success" : "text-destructive"
                        )}>
                          {diffPos ? "+" : ""}{formatNumber(st.net_diff_qty)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-3 py-3 w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>{t("actions.edit")}</DropdownMenuItem>
                            <DropdownMenuItem>{t("actions.export")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-end px-4 py-2 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("stocktakes.showing", { from: 1, to: totalCount, total: totalCount })}
              </span>
            </div>
          </>
        )}
      </PageSection>

      <NewStocktakeDialog open={dialogOpen} onOpenChange={setDialogOpen} data={data} />
    </div>
  );
}
