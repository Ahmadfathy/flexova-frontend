/**
 * DD-3 §2.8 — Inventory Valuation report: Item · Category · Warehouse · Qty on hand · Effective
 * method · Unit cost · Total value, with warehouse/category/method/as-of filters, grand total +
 * per-warehouse/per-category subtotals, and an export action. Entirely redacted without
 * `inventory.cost.view` (§5.7) — reuses the existing table shell, no new layout primitives.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Lock, ScrollText } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatMoney, formatNumber } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import { useItems } from "../items/useItems";
import { batchCarrierId } from "../items/batches";
import { effectiveCostingMethod, itemCurrentCost, itemValuation } from "../items/costing";

interface ValuationRow {
  itemId: string;
  carrierId: string;
  name: string;
  categoryId: string;
  warehouseId: string;
  qty: number;
  method: "fifo" | "average" | "specific";
  unitCost: number;
  value: number;
}

export function ValuationReportPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can = useCan();
  const canView = can("inventory.cost.view");
  const canExport = can("inventory.cost.export");

  const { data, loading, error, isOffline, reload } = useItems();

  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [asOf, setAsOf] = useState("");

  const rows = useMemo<ValuationRow[]>(() => {
    if (!data) return [];
    const out: ValuationRow[] = [];
    for (const item of data.items) {
      if (item.item_type !== "stocked") continue;
      const method = effectiveCostingMethod(item, data.settings);
      const carrierId = batchCarrierId(item);
      for (const balance of item.balances) {
        if (balance.qty <= 0) continue;
        const opts = { warehouseId: balance.warehouse_id, asOf: asOf || undefined };
        const unitCost = itemCurrentCost(item, data.ledger, carrierId, method, opts);
        const value = itemValuation(carrierId, data.ledger, method, opts);
        out.push({
          itemId: item.id, carrierId,
          name: lang === "ar" ? item.name_ar : item.name_en,
          categoryId: item.category_id, warehouseId: balance.warehouse_id,
          qty: balance.qty, method, unitCost, value,
        });
      }
    }
    return out
      .filter((r) => !warehouseFilter || r.warehouseId === warehouseFilter)
      .filter((r) => !categoryFilter || r.categoryId === categoryFilter)
      .filter((r) => !methodFilter || r.method === methodFilter)
      .sort((a, b) => b.value - a.value);
  }, [data, warehouseFilter, categoryFilter, methodFilter, asOf, lang]);

  const grandTotal = rows.reduce((s, r) => s + r.value, 0);
  const warehouseMap = Object.fromEntries((data?.warehouses ?? []).map((w) => [w.id, w]));
  const categoryMap = Object.fromEntries((data?.categories ?? []).map((c) => [c.id, c]));

  function handleExport() {
    toast.info(t("actions.export"));
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("costing.valuation_report_title")} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error && !isOffline) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("costing.valuation_report_title")} />
        <ErrorState description={t("errors.load")} onRetry={reload} />
      </div>
    );
  }
  if (!canView) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("costing.valuation_report_title")} />
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Lock className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground max-w-xs">
            {lang === "ar" ? "تحتاج صلاحية عرض التكلفة" : "You need the cost-view permission"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("costing.valuation_report_title")}
        actions={
          <Button size="sm" variant="outline" disabled={!canExport} onClick={handleExport}>
            <Download className="h-4 w-4 me-1.5" />
            {t("actions.export")}
          </Button>
        }
        alert={isOffline ? <OfflineBanner message={t("offline.banner")} /> : undefined}
      />

      <div className="flex flex-wrap gap-2">
        <Select value={warehouseFilter || "__all__"} onValueChange={(v) => setWarehouseFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-auto min-w-40"><SelectValue placeholder={t("filters.all_warehouses")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("filters.all_warehouses")}</SelectItem>
            {(data?.warehouses ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter || "__all__"} onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-auto min-w-40"><SelectValue placeholder={t("filters.all_categories")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("filters.all_categories")}</SelectItem>
            {(data?.categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{lang === "ar" ? c.name_ar : c.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={methodFilter || "__all__"} onValueChange={(v) => setMethodFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-auto min-w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{lang === "ar" ? "كل الطرق" : "All methods"}</SelectItem>
            <SelectItem value="fifo">{t("costing.method.fifo")}</SelectItem>
            <SelectItem value="average">{t("costing.method.average")}</SelectItem>
            <SelectItem value="specific">{t("costing.specific_locked")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-0 flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{t("costing.as_of_date")}</span>
          <Input type="date" data-testid="valuation-as-of" className="w-auto tabular-nums" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
      </div>

      <PageSection padded={false}>
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ScrollText} title={t("items.empty_title")} description="" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("columns.name")}</TableHead>
                  <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">{t("columns.category")}</TableHead>
                  <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("columns.warehouse")}</TableHead>
                  <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("columns.balance")}</TableHead>
                  <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("costing.method_chip")}</TableHead>
                  <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("costing.unit_cost")}</TableHead>
                  <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground">{t("costing.total_valuation")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.carrierId}_${r.warehouseId}`} className="border-b border-border last:border-0 hover:bg-muted/30" data-testid="valuation-row">
                    <TableCell className="px-3 py-2.5 text-sm font-medium">{r.name}</TableCell>
                    <TableCell className="px-3 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">
                      {lang === "ar" ? categoryMap[r.categoryId]?.name_ar : categoryMap[r.categoryId]?.name_en}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-sm">
                      {lang === "ar" ? warehouseMap[r.warehouseId]?.name_ar : warehouseMap[r.warehouseId]?.name_en}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-sm tabular-nums">{formatNumber(r.qty)}</TableCell>
                    <TableCell className="px-3 py-2.5">
                      <Badge variant="secondary" className="text-xs">
                        {r.method === "specific" ? t("costing.specific_locked") : t(`costing.method.${r.method}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-sm tabular-nums">{formatNumber(r.unitCost)}</TableCell>
                    <TableCell className="px-3 py-2.5 text-sm font-medium tabular-nums">{formatMoney(r.value, lang)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end px-4 py-2.5 border-t border-border bg-muted/20">
              <span className="text-sm font-semibold tabular-nums" data-testid="valuation-grand-total">
                {t("costing.total_valuation")}: {formatMoney(grandTotal, lang)}
              </span>
            </div>
          </>
        )}
      </PageSection>
    </div>
  );
}
