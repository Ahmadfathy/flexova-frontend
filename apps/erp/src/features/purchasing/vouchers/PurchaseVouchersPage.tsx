import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Download, Search, FileText, Printer, MoreVertical } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EntityCell, RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
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
import { PurchaseVoucherCreateModal } from "./PurchaseVoucherCreateModal";

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

export function PurchaseVouchersPage() {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const can = useCan();
  const openCreate = useCreateDispatcher(s => s.openCreate);

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  const [search, setSearch]           = useState("");
  const [supplierFilter, setSupplier] = useState("");

  // ── "Pay this invoice/supplier" deep-link (?invoice=, ?supplier=) ─
  const preInvoiceId  = searchParams.get("invoice") || undefined;
  const preSupplierId = searchParams.get("supplier") || undefined;
  const [prefillDialogOpen, setPrefillDialogOpen] = useState(!!(preInvoiceId || preSupplierId));
  useEffect(() => {
    if (preInvoiceId || preSupplierId) setPrefillDialogOpen(true);
  }, [preInvoiceId, preSupplierId]);

  // ── Lookup maps ───────────────────────────────────────────────
  const supplierMap = useMemo(
    () => Object.fromEntries((data?.suppliers ?? []).map(s => [s.id, s])),
    [data?.suppliers],
  );

  // ── Filter list ───────────────────────────────────────────────
  const allVouchers = data?.paymentVouchers ?? [];
  const filtered = useMemo(() => {
    let list = allVouchers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v => {
        const s = supplierMap[v.supplier_id];
        return (
          v.number.toLowerCase().includes(q) ||
          s?.name_ar?.toLowerCase().includes(q) ||
          s?.name_en?.toLowerCase().includes(q)
        );
      });
    }
    if (supplierFilter) list = list.filter(v => v.supplier_id === supplierFilter);
    return list;
  }, [allVouchers, search, supplierFilter, supplierMap]);

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("vouchers.title")} />
        <PageSection padded={false}><ListSkeleton /></PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("vouchers.title")} />
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
          title={t("vouchers.title")}
          count={allVouchers.length > 0 ? t("vouchers.count", { n: allVouchers.length }) : undefined}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 me-1.5" />
                {t("vouchers.export")}
              </Button>
              {can("purchasing.payment.create") && (
                <Button size="sm" onClick={() => openCreate("new_purchase_voucher")}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("vouchers.new")}
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
                placeholder={t("vouchers.search_placeholder")}
                className="ps-9"
              />
            </div>
            <Select
              value={supplierFilter || "__all__"}
              onValueChange={v => setSupplier(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-10 w-auto min-w-40">
                <SelectValue placeholder={t("vouchers.all_suppliers")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("vouchers.all_suppliers")}</SelectItem>
                {(data?.suppliers ?? []).map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {lang === "ar" ? s.name_ar : s.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {allVouchers.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("vouchers.no_vouchers")}
              description={t("vouchers.empty_sub")}
              action={can("purchasing.payment.create")
                ? { label: t("vouchers.new"), onClick: () => openCreate("new_purchase_voucher") }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("vouchers.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSupplier(""); }}>
                {t("vouchers.clear_filters")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_number")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_date")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_supplier")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_invoice")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_amount")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_method")}
                  </TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(v => {
                  const s   = supplierMap[v.supplier_id];
                  const sName = s ? (lang === "ar" ? s.name_ar : s.name_en) : v.supplier_id;
                  const inv = data?.purchaseInvoices.find(i => i.id === v.invoice_id);
                  const method = data?.paymentMethods.find(m => m.id === v.method);
                  const methodName = method
                    ? (lang === "ar" ? method.name_ar : method.name_en)
                    : v.method;
                  return (
                    <TableRow
                      key={v.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <TableCell>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {v.number}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(v.date)}
                      </TableCell>
                      <TableCell>
                        <EntityCell
                          name={sName}
                          sub={s?.code}
                          avatarFallback={sName.slice(0, 2)}
                        />
                      </TableCell>
                      <TableCell>
                        {inv ? (
                          <button
                            className="font-mono text-xs text-brand hover:underline"
                            onClick={() => navigate(`/purchasing/invoices/${v.invoice_id}`)}
                          >
                            {inv.number}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {v.invoice_id}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-start tabular-nums font-semibold">
                        {formatMoney(v.amount, lang)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {methodName}
                      </TableCell>
                      <TableCell className="w-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <RowActionsContent>
                            <RowActionItem icon={Printer} onClick={() => toast.info(t("vouchers.action_print"))}>
                              {t("vouchers.action_print")}
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

      {(preInvoiceId || preSupplierId) && (
        <PurchaseVoucherCreateModal
          open={prefillDialogOpen}
          onOpenChange={setPrefillDialogOpen}
          defaultInvoiceId={preInvoiceId}
          defaultSupplierId={preSupplierId}
        />
      )}
    </>
  );
}
