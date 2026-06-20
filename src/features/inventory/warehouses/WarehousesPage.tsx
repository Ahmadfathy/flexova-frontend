import { useTranslation } from "react-i18next";

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
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, Warehouse, MoreVertical, Star } from "lucide-react";

import { formatMoney }  from "@/lib/format";
import { cn }           from "@/lib/utils";
import { useCan }       from "@/lib/permissions";
import { useItems }     from "../items/useItems";
import type { InventoryWarehouse } from "../items/types";

/* ─── Type badge ─────────────────────────────────────────────── */

const TYPE_VARIANT: Record<InventoryWarehouse["type"], "active" | "pending" | "rejected"> = {
  storage: "active",
  sale:    "pending",
  damaged: "rejected",
};

/* ─── Skeleton ───────────────────────────────────────────────── */

function WhSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[60, 140, 72, 80, 100, 88].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.2 }}
        >
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-20 hidden md:block" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-3.5 w-24 hidden lg:block" />
          <Skeleton className="h-7 w-7 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export function WarehousesPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();

  const { data, loading, error, reload } = useItems();

  const warehouses  = data?.warehouses ?? [];
  const totalCount  = warehouses.length;
  const branchMap   = Object.fromEntries((data?.branches ?? []).map((b) => [b.id, b]));

  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  const pageActions = can("inventory.warehouse.create") ? (
    <Button size="sm">
      <Plus className="h-4 w-4 me-1.5" />
      {t("warehouses.new")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("warehouses.title")}
        subtitle={totalCount > 0 ? t("warehouses.count", { n: totalCount }) : undefined}
        actions={pageActions}
      />

      <PageSection padded={false}>
        {showSkeleton && <WhSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={Warehouse}
              title={t("warehouses.empty_title")}
              description={t("warehouses.empty_sub")}
              action={
                can("inventory.warehouse.create")
                  ? { label: t("warehouses.new"), onClick: () => {} }
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
                    { key: "code",        label: t("columns.code"),        cls: "w-28" },
                    { key: "name",        label: t("columns.name"),        cls: "" },
                    { key: "type",        label: t("columns.type"),        cls: "hidden sm:table-cell" },
                    { key: "branch",      label: t("columns.branch"),      cls: "hidden md:table-cell" },
                    { key: "status",      label: t("columns.status"),      cls: "" },
                    { key: "stock_value", label: t("columns.stock_value"), cls: "hidden lg:table-cell text-end" },
                    { key: "actions",     label: "",                       cls: "w-10" },
                  ].map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-10 py-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap",
                        col.cls
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {warehouses.map((wh) => {
                  const branch = branchMap[wh.branch_id];
                  return (
                    <TableRow
                      key={wh.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      {/* Code */}
                      <TableCell className="px-3 py-3 w-28">
                        <span className="font-mono text-xs tabular-nums">{wh.code}</span>
                      </TableCell>

                      {/* Name + default star */}
                      <TableCell className="px-3 py-3">
                        <span className="flex items-center gap-2 font-medium">
                          {lang === "ar" ? wh.name_ar : wh.name_en}
                          {wh.is_default && (
                            <Star className="h-3.5 w-3.5 fill-warning text-warning shrink-0" />
                          )}
                        </span>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="px-3 py-3 hidden sm:table-cell">
                        <StatusPill
                          variant={TYPE_VARIANT[wh.type]}
                          label={t(`wh_types.${wh.type}`)}
                        />
                      </TableCell>

                      {/* Branch */}
                      <TableCell className="px-3 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {lang === "ar" ? (branch?.name_ar ?? "—") : (branch?.name_en ?? "—")}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-3 py-3">
                        <StatusPill
                          variant={wh.status === "active" ? "active" : "inactive"}
                          label={t(`status.${wh.status}`)}
                        />
                      </TableCell>

                      {/* Stock value */}
                      <TableCell className="px-3 py-3 text-end tabular-nums text-sm hidden lg:table-cell">
                        {formatMoney(wh.stock_value, lang)}
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
                            {can("inventory.warehouse.edit") && (
                              <DropdownMenuItem>{t("actions.edit")}</DropdownMenuItem>
                            )}
                            {!wh.is_default && can("inventory.warehouse.edit") && (
                              <DropdownMenuItem>{t("actions.set_default")}</DropdownMenuItem>
                            )}
                            <DropdownMenuItem>{t("actions.view_items")}</DropdownMenuItem>
                            {can("inventory.warehouse.edit") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  {wh.status === "active" ? t("actions.suspend") : t("actions.activate")}
                                </DropdownMenuItem>
                              </>
                            )}
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
                {t("warehouses.showing", { from: 1, to: totalCount, total: totalCount })}
              </span>
            </div>
          </>
        )}
      </PageSection>
    </div>
  );
}
