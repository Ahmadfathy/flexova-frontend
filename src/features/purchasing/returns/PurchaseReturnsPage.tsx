import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus, Download, Search, FileText, Printer, MoreVertical,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EntityCell, RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { formatMoney, formatDate } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import { usePurchasingData } from "../data/usePurchasingData";
import { PurchaseReturnCreateModal } from "./PurchaseReturnCreateModal";

// ── Skeleton ──────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-2 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded" />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export function PurchaseReturnsPage() {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const can = useCan();
  const openCreate = useCreateDispatcher(s => s.openCreate);

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  const [search, setSearch]             = useState("");
  const [supplierFilter, setSupplier]   = useState("");

  // ── "Return this invoice" deep-link (?source=<invoiceId>) ─────
  const preSource = searchParams.get("source") || undefined;
  const [sourceDialogOpen, setSourceDialogOpen] = useState(!!preSource);
  useEffect(() => {
    if (preSource) setSourceDialogOpen(true);
  }, [preSource]);

  // ── Lookup maps ───────────────────────────────────────────────
  const supplierMap = useMemo(
    () => Object.fromEntries((data?.suppliers ?? []).map(s => [s.id, s])),
    [data?.suppliers],
  );

  // ── Filter list ───────────────────────────────────────────────
  const allReturns = data?.purchaseReturns ?? [];
  const filtered = useMemo(() => {
    let list = allReturns;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => {
        const s = supplierMap[r.supplier_id];
        return (
          r.number.toLowerCase().includes(q) ||
          s?.name_ar?.toLowerCase().includes(q) ||
          s?.name_en?.toLowerCase().includes(q)
        );
      });
    }
    if (supplierFilter) list = list.filter(r => r.supplier_id === supplierFilter);
    return list;
  }, [allReturns, search, supplierFilter, supplierMap]);


  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("returns.title")} />
        <PageSection padded={false}><ListSkeleton /></PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("returns.title")} />
        <PageSection>
          <ErrorState description={t("errors.load")} onRetry={reload} />
        </PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("returns.title")}
          count={allReturns.length > 0 ? t("returns.count", { n: allReturns.length }) : undefined}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 me-1.5" />
                {t("returns.export")}
              </Button>
              {can("purchasing.return.create") && (
                <Button size="sm" onClick={() => openCreate("new_purchase_return")}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("returns.new")}
                </Button>
              )}
            </div>
          }
        />

        {isOffline && <OfflineBanner />}

        {/* Table */}
        <PageSection padded={false}>

          {/* Toolbar — search + supplier filter; lives inside the card, above the table */}
          <div className="px-6 py-6 border-b border-border flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("returns.search_placeholder")}
                className="ps-9"
              />
            </div>
            <Select
              value={supplierFilter || "__all__"}
              onValueChange={v => setSupplier(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-10 w-auto min-w-40">
                <SelectValue placeholder={t("returns.all_suppliers")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("returns.all_suppliers")}</SelectItem>
                {(data?.suppliers ?? []).map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {lang === "ar" ? s.name_ar : s.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {allReturns.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("returns.no_returns")}
              description={t("returns.empty_sub")}
              action={can("purchasing.return.create")
                ? { label: t("returns.new"), onClick: () => openCreate("new_purchase_return") }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("returns.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSupplier(""); }}>
                {t("returns.clear_filters")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_number")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_date")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_source")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_supplier")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_reason")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_value")}
                  </TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const s = supplierMap[r.supplier_id];
                  const sName = s ? (lang === "ar" ? s.name_ar : s.name_en) : r.supplier_id;
                  const reasonText = lang === "ar" ? r.reason_ar : r.reason_en;
                  const sourceInv  = data?.purchaseInvoices.find(i => i.id === r.source_invoice);
                  return (
                    <TableRow
                      key={r.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <TableCell>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {r.number}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(r.date)}
                      </TableCell>
                      <TableCell>
                        {sourceInv ? (
                          <button
                            className="font-mono text-xs text-brand hover:underline"
                            onClick={() => navigate(`/purchasing/invoices/${r.source_invoice}`)}
                          >
                            {sourceInv.number}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.source_invoice}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <EntityCell
                          name={sName}
                          sub={s?.code}
                          avatarFallback={sName.slice(0, 2)}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {reasonText}
                      </TableCell>
                      <TableCell className="text-start tabular-nums font-semibold">
                        {formatMoney(r.totals.value, lang)}
                      </TableCell>
                      <TableCell className="w-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <RowActionsContent>
                            <RowActionItem icon={Printer} onClick={() => toast.info(t("returns.action_print"))}>
                              {t("returns.action_print")}
                            </RowActionItem>
                          </RowActionsContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      </div>

      {preSource && (
        <PurchaseReturnCreateModal
          open={sourceDialogOpen}
          onOpenChange={setSourceDialogOpen}
          defaultSourceId={preSource}
        />
      )}
    </>
  );
}
