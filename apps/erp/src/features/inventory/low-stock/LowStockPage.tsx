import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { Skeleton }    from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { PackageOpen, ExternalLink, Flag } from "lucide-react";

import { formatNumber } from "@/lib/format";
import { cn }           from "@/lib/utils";
import { isFlagEnabled } from "@/lib/flags";
import { useItems }     from "../items/useItems";
import {
  batchCarrierId, getCarrierBatches, effectiveBatchStatus, effectiveNearExpiryDays, batchWarehouseBalances,
} from "../items/batches";
import { BatchStatusPill } from "../items/BatchStatusBadge";

/* ─── Skeleton ───────────────────────────────────────────────── */

function LsSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[140, 100, 60, 72, 56, 88].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.3 }}
        >
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24 hidden sm:block" />
          <Skeleton className="h-3.5 w-16 tabular-nums" />
          <Skeleton className="h-3.5 w-20 hidden md:block" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-3.5 w-20 hidden lg:block" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export function LowStockPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const navigate     = useNavigate();

  const { data, loading, error, reload } = useItems();

  const rows = useMemo(() => {
    if (!data) return [];

    const itemMap = Object.fromEntries(data.items.map((it) => [it.id, it]));
    const whMap   = Object.fromEntries(data.warehouses.map((w) => [w.id, w]));

    return data.low_stock.map((ls) => ({
      ...ls,
      item:      itemMap[ls.item_id],
      warehouse: whMap[ls.warehouse_id],
    })).sort((a, b) => b.shortfall - a.shortfall);
  }, [data]);

  const totalCount = rows.length;

  // DD-2 §2.7 — Expiring soon / Expired section, flag-gated, grouped by item.
  const batchFlagOn = isFlagEnabled("inventory.batch_expiry");
  const expiryRows = useMemo(() => {
    if (!data || !batchFlagOn) return [];
    const globalDays = data.settings?.global_near_expiry_days ?? 30;
    const out: Array<{
      item: (typeof data.items)[number]; batchId: string; lotNumber: string; expiryDate: string | null;
      status: "expired" | "near_expiry"; balances: Array<{ warehouse_id: string; qty: number }>;
    }> = [];
    for (const item of data.items) {
      if (!item.tracks_batch) continue;
      const carrierId = batchCarrierId(item);
      const nearDays = effectiveNearExpiryDays(item, globalDays);
      for (const batch of getCarrierBatches(carrierId, data.stock_batch ?? [])) {
        const status = effectiveBatchStatus(batch, data.ledger, nearDays);
        if (status !== "expired" && status !== "near_expiry") continue;
        out.push({
          item, batchId: batch.id, lotNumber: batch.lot_number, expiryDate: batch.expiry_date,
          status, balances: batchWarehouseBalances(batch.id, data.ledger),
        });
      }
    }
    return out.sort((a, b) => (a.expiryDate ?? "") < (b.expiryDate ?? "") ? -1 : 1);
  }, [data, batchFlagOn]);

  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("low_stock.title")}
        alert={totalCount > 0 ? (
          <div className="flex items-start gap-3 rounded border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
            <PackageOpen className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <span className="text-warning">
              {t("low_stock.count", { n: totalCount })}
              {" "}
              {lang === "ar"
                ? "وصلت إلى الحد الأدنى للطلب"
                : "have reached the reorder level"}
            </span>
          </div>
        ) : undefined}
      />

      <PageSection padded={false}>
        {showSkeleton && <LsSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={PackageOpen}
              title={t("low_stock.empty_title")}
              description={t("low_stock.empty_sub")}
            />
          </div>
        )}

        {showTable && (
          <>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border">
                  {[
                    { key: "item",      label: t("columns.name"),      cls: "" },
                    { key: "warehouse", label: t("columns.warehouse"),  cls: "hidden sm:table-cell" },
                    { key: "balance",   label: t("columns.balance"),    cls: "text-start" },
                    { key: "reorder",   label: t("columns.reorder"),    cls: "hidden md:table-cell text-start" },
                    { key: "shortfall", label: t("columns.shortfall"),  cls: "text-start" },
                    { key: "suggested", label: t("columns.suggested"),  cls: "hidden lg:table-cell text-start" },
                    { key: "action",    label: "",                      cls: "w-10" },
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
                {rows.map((row) => {
                  const urgency = row.shortfall > row.reorder_level * 0.5 ? "high" : "medium";

                  return (
                    <TableRow
                      key={`${row.item_id}_${row.warehouse_id}`}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      {/* Item */}
                      <TableCell className="px-3 py-3">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-sm leading-tight">
                            {row.item
                              ? (lang === "ar" ? row.item.name_ar : row.item.name_en)
                              : row.item_id}
                          </span>
                          {row.item && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {row.item.code}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Warehouse */}
                      <TableCell className="px-3 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {row.warehouse
                          ? (lang === "ar" ? row.warehouse.name_ar : row.warehouse.name_en)
                          : row.warehouse_id}
                      </TableCell>

                      {/* Balance */}
                      <TableCell className="px-3 py-3 text-start tabular-nums text-sm">
                        <span className="text-destructive font-medium">
                          {formatNumber(row.balance)}
                        </span>
                      </TableCell>

                      {/* Reorder level */}
                      <TableCell className="px-3 py-3 text-start tabular-nums text-sm text-muted-foreground hidden md:table-cell">
                        {formatNumber(row.reorder_level)}
                      </TableCell>

                      {/* Shortfall */}
                      <TableCell className="px-3 py-3 text-start tabular-nums text-sm">
                        <Badge
                          variant={urgency === "high" ? "destructive" : "secondary"}
                          className="text-xs tabular-nums"
                        >
                          -{formatNumber(row.shortfall)}
                        </Badge>
                      </TableCell>

                      {/* Suggested qty */}
                      <TableCell className="px-3 py-3 text-start tabular-nums text-sm text-muted-foreground hidden lg:table-cell">
                        {formatNumber(row.suggested_qty)}
                      </TableCell>

                      {/* Navigate to item */}
                      <TableCell className="px-3 py-3 w-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => row.item && navigate(`/inventory/items/${row.item.id}`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-end px-4 py-2 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("low_stock.showing", { from: 1, to: totalCount, total: totalCount })}
              </span>
            </div>
          </>
        )}
      </PageSection>

      {/* DD-2 §2.7 — Expiring soon / Expired */}
      {batchFlagOn && expiryRows.length > 0 && (
        <PageSection padded={false}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Flag className="h-4 w-4 text-warning-text shrink-0" />
            <h2 className="text-sm font-semibold">{t("batch.expiring_section_title")}</h2>
            <Badge variant="secondary" className="text-xs tabular-nums">{expiryRows.length}</Badge>
          </div>
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("columns.name")}</TableHead>
                <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("batch.lot_number")}</TableHead>
                <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("batch.expiry_date")}</TableHead>
                <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("columns.status")}</TableHead>
                <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">{t("columns.warehouse")}</TableHead>
                <TableHead className="h-10 py-2 px-3 w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiryRows.map((row) => (
                <TableRow key={row.batchId} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <TableCell className="px-3 py-3">
                    <span className="font-medium text-sm">{lang === "ar" ? row.item.name_ar : row.item.name_en}</span>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-sm tabular-nums">{row.lotNumber}</TableCell>
                  <TableCell className="px-3 py-3 text-sm tabular-nums">{row.expiryDate ?? "—"}</TableCell>
                  <TableCell className="px-3 py-3"><BatchStatusPill status={row.status} t={t} /></TableCell>
                  <TableCell className="px-3 py-3 text-sm text-muted-foreground hidden md:table-cell tabular-nums">
                    {row.balances.map((b) => `${b.warehouse_id}: ${b.qty}`).join(" · ")}
                  </TableCell>
                  <TableCell className="px-3 py-3 w-10">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/inventory/items/${row.item.id}`)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </PageSection>
      )}
    </div>
  );
}
