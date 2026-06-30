import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { EntityCell }    from "@/components/patterns/DataTable";
import { DatePicker }    from "@/components/patterns/DatePicker";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Badge }    from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Plus, Download, MoreVertical, X, Eye, Wallet,
  RotateCcw, Search, FileText, Printer,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { cn }     from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import {
  usePurchasingData,
  type PurchaseInvoice,
  type ReceiptStatus,
} from "../data/usePurchasingData";
import {
  receiptPillVariant,
  paymentPillVariant,
  inboundEtaPillVariant,
} from "../data/statusHelpers";

/* ─── Skeleton ───────────────────────────────────────────────── */

function ListSkeleton() {
  return (
    <div className="rounded border border-border overflow-hidden">
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[80, 72, 160, 96, 88, 72, 72, 72, 32].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded shrink-0" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.1 }}
        >
          <Skeleton className="h-3.5 w-24 shrink-0" />
          <Skeleton className="h-3.5 w-20 shrink-0" />
          <Skeleton className="h-8 w-8 rounded shrink-0" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-20 shrink-0 hidden sm:block" />
          <Skeleton className="h-3.5 w-24 shrink-0 ms-auto" />
          <Skeleton className="h-5 w-20 rounded-full shrink-0" />
          <Skeleton className="h-5 w-20 rounded-full shrink-0" />
          <Skeleton className="h-5 w-24 rounded-full shrink-0" />
          <Skeleton className="h-7 w-7 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ─── No results ─────────────────────────────────────────────── */

function NoResults({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation("purchasing");
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="flex items-center justify-center h-12 w-12 rounded bg-muted text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <p className="font-medium">{t("invoices.no_results")}</p>
      <Button variant="ghost" size="sm" onClick={onClear}>
        {t("invoices.clear_filters")}
      </Button>
    </div>
  );
}

/* ─── Mobile invoice card ────────────────────────────────────── */

function InvoiceMobileCard({
  inv,
  supplierName,
  lang,
  t,
  onView,
}: {
  inv: PurchaseInvoice;
  supplierName: string;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"purchasing">>["t"];
  onView: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
      onClick={onView}
    >
      {/* Row 1: number + date */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
          {inv.number}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDate(inv.date)}
        </span>
      </div>
      {/* Row 2: supplier + total */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm truncate">{supplierName}</span>
        <span className="tabular-nums font-medium text-sm shrink-0">
          {formatMoney(inv.totals.grand_total, lang)}
        </span>
      </div>
      {/* Row 3: three independent pills */}
      <div className="flex flex-wrap gap-1.5">
        <StatusPill
          variant={receiptPillVariant(inv.receipt_status)}
          label={t(`receipt.${inv.receipt_status === "partially_received" ? "partial" : inv.receipt_status}`)}
        />
        <StatusPill
          variant={paymentPillVariant(inv.payment_status)}
          label={t(`pay.${inv.payment_status}`)}
        />
        <StatusPill
          variant={inboundEtaPillVariant(inv.inbound_eta_status)}
          label={t(`inbound.${inv.inbound_eta_status}`)}
        />
      </div>
    </div>
  );
}

/* ─── Row actions ────────────────────────────────────────────── */

function InvoiceActions({
  inv,
  can,
  t,
  onView,
  onNavigate,
}: {
  inv: PurchaseInvoice;
  can: (p: string) => boolean;
  t: ReturnType<typeof useTranslation<"purchasing">>["t"];
  onView: () => void;
  onNavigate: (path: string) => void;
}) {
  const canReturn = inv.receipt_status === "completed" && can("purchasing.return.create");
  const canPay    = inv.balance > 0 && can("purchasing.payment.create");
  const canMatch  = (inv.inbound_eta_status === "unmatched" || inv.inbound_eta_status === "pending")
                    && can("purchasing.inbound.respond");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={e => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={e => { e.stopPropagation(); onView(); }}>
          <Eye className="h-4 w-4 me-2" />
          {t("invoices.action_view")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={e => { e.stopPropagation(); toast.info(t("invoices.action_print")); }}
        >
          <Printer className="h-4 w-4 me-2" />
          {t("invoices.action_print")}
        </DropdownMenuItem>

        {canReturn && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={e => { e.stopPropagation(); onNavigate(`/purchasing/returns/new?source=${inv.id}`); }}
            >
              <RotateCcw className="h-4 w-4 me-2" />
              {t("invoices.action_return")}
            </DropdownMenuItem>
          </>
        )}

        {canPay && (
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              onNavigate(`/purchasing/vouchers/new?supplier=${inv.supplier_id}&invoice=${inv.id}`);
            }}
          >
            <Wallet className="h-4 w-4 me-2" />
            {t("invoices.action_pay")}
          </DropdownMenuItem>
        )}

        {canMatch && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={e => { e.stopPropagation(); toast.info(t("invoices.action_match")); }}>
              {t("invoices.action_match")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Filter state ───────────────────────────────────────────── */

interface InvFilters {
  search:        string;
  supplier:      string;
  receiptStatus: string;
  paymentStatus: string;
  inboundStatus: string;
  dateFrom:      string;
  dateTo:        string;
}

const EMPTY_FILTERS: InvFilters = {
  search: "", supplier: "", receiptStatus: "",
  paymentStatus: "", inboundStatus: "", dateFrom: "", dateTo: "",
};

/* ─── Column helper ──────────────────────────────────────────── */

const colHelper = createColumnHelper<PurchaseInvoice>();

/* ─── Main page ──────────────────────────────────────────────── */

export function PurchasesListPage() {
  const { t, i18n }  = useTranslation("purchasing");
  const lang          = (i18n.language?.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate      = useNavigate();
  const can           = useCan();

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  const [filters,  setFilters]  = useState<InvFilters>(EMPTY_FILTERS);
  const [sorting,  setSorting]  = useState<SortingState>([]);

  const setFilter = useCallback(
    <K extends keyof InvFilters>(key: K, val: InvFilters[K]) =>
      setFilters(prev => ({ ...prev, [key]: val })),
    []
  );
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  /* ── lookup map ── */
  const supplierMap = useMemo(
    () => Object.fromEntries((data?.suppliers ?? []).map(s => [s.id, s])),
    [data?.suppliers]
  );

  /* ── filtering ── */
  const allInvoices = data?.purchaseInvoices ?? [];
  const filtered = useMemo(() => {
    let list = allInvoices;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(inv => {
        const s = supplierMap[inv.supplier_id];
        return (
          inv.number.toLowerCase().includes(q) ||
          (inv.supplier_invoice_no ?? "").toLowerCase().includes(q) ||
          s?.name_ar?.toLowerCase().includes(q) ||
          s?.name_en?.toLowerCase().includes(q) ||
          s?.code?.toLowerCase().includes(q)
        );
      });
    }
    if (filters.supplier)      list = list.filter(inv => inv.supplier_id      === filters.supplier);
    if (filters.receiptStatus) list = list.filter(inv => inv.receipt_status   === filters.receiptStatus);
    if (filters.paymentStatus) list = list.filter(inv => inv.payment_status   === filters.paymentStatus);
    if (filters.inboundStatus) list = list.filter(inv => inv.inbound_eta_status === filters.inboundStatus);
    if (filters.dateFrom)      list = list.filter(inv => inv.date >= filters.dateFrom);
    if (filters.dateTo)        list = list.filter(inv => inv.date <= filters.dateTo);
    return list;
  }, [allInvoices, filters, supplierMap]);

  /* ── receipt status i18n (partially_received maps to "partial") ── */
  function receiptLabel(s: ReceiptStatus) {
    return t(`receipt.${s === "partially_received" ? "partial" : s}`);
  }

  /* ── TanStack columns ── */
  const columns = useMemo(() => [
    colHelper.accessor("number", {
      id: "number",
      header: () => t("invoices.col_number"),
      cell: info => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
          {info.getValue()}
        </span>
      ),
      enableSorting: true,
    }),
    colHelper.accessor("date", {
      id: "date",
      header: () => t("invoices.col_date"),
      cell: info => (
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {formatDate(info.getValue())}
        </span>
      ),
      enableSorting: true,
    }),
    colHelper.accessor("supplier_id", {
      id: "supplier",
      header: () => t("invoices.col_supplier"),
      cell: info => {
        const s = supplierMap[info.getValue()];
        if (!s) return null;
        const name = lang === "ar" ? s.name_ar : s.name_en;
        return (
          <EntityCell
            name={name}
            sub={s.code}
            avatarFallback={name.slice(0, 2)}
          />
        );
      },
    }),
    colHelper.accessor("supplier_invoice_no", {
      id: "supplier_inv",
      header: () => t("invoices.col_supplier_inv"),
      cell: info => {
        const v = info.getValue();
        if (!v || v === "—") return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span className="text-sm text-muted-foreground font-mono" dir="ltr">{v}</span>
        );
      },
    }),
    colHelper.accessor(row => row.totals.grand_total, {
      id: "total",
      header: () => t("invoices.col_total"),
      cell: info => (
        <span className="tabular-nums font-medium">
          {formatMoney(info.getValue(), lang)}
        </span>
      ),
      enableSorting: true,
    }),
    /* ── THREE INDEPENDENT STATUS COLUMNS ── */
    colHelper.accessor("receipt_status", {
      id: "receipt",
      header: () => t("invoices.col_receipt"),
      cell: info => (
        <StatusPill
          variant={receiptPillVariant(info.getValue())}
          label={receiptLabel(info.getValue())}
        />
      ),
    }),
    colHelper.accessor("payment_status", {
      id: "payment",
      header: () => t("invoices.col_payment"),
      cell: info => (
        <StatusPill
          variant={paymentPillVariant(info.getValue())}
          label={t(`pay.${info.getValue()}`)}
        />
      ),
    }),
    colHelper.accessor("inbound_eta_status", {
      id: "inbound",
      header: () => t("invoices.col_inbound"),
      cell: info => (
        <StatusPill
          variant={inboundEtaPillVariant(info.getValue())}
          label={t(`inbound.${info.getValue()}`)}
        />
      ),
    }),
    colHelper.display({
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <InvoiceActions
          inv={row.original}
          can={can}
          t={t}
          onView={() => navigate(`/purchasing/invoices/${row.original.id}`)}
          onNavigate={navigate}
        />
      ),
    }),
  ], [t, lang, supplierMap, can, navigate]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
  });

  /* ── active filter chips ── */
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.supplier) {
    const s = supplierMap[filters.supplier];
    if (s) activeChips.push({
      key: "sup",
      label: lang === "ar" ? s.name_ar : s.name_en,
      clear: () => setFilter("supplier", ""),
    });
  }
  if (filters.receiptStatus) activeChips.push({
    key: "rec",
    label: receiptLabel(filters.receiptStatus as ReceiptStatus),
    clear: () => setFilter("receiptStatus", ""),
  });
  if (filters.paymentStatus) activeChips.push({
    key: "pay",
    label: t(`pay.${filters.paymentStatus}`),
    clear: () => setFilter("paymentStatus", ""),
  });
  if (filters.inboundStatus) activeChips.push({
    key: "eta",
    label: t(`inbound.${filters.inboundStatus}`),
    clear: () => setFilter("inboundStatus", ""),
  });
  if (filters.dateFrom) activeChips.push({
    key: "from",
    label: filters.dateFrom,
    clear: () => setFilter("dateFrom", ""),
  });
  if (filters.dateTo) activeChips.push({
    key: "to",
    label: filters.dateTo,
    clear: () => setFilter("dateTo", ""),
  });

  const isAdvanced = data?.mode === "advanced";

  /* ── render ── */
  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("invoices.title")}
        subtitle={allInvoices.length > 0 ? t("invoices.count", { n: allInvoices.length }) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 me-1.5" />
              {t("invoices.export")}
            </Button>
            {isAdvanced && can("purchasing.order.create") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/purchasing/orders/new")}
              >
                <Plus className="h-4 w-4 me-1.5" />
                {t("invoices.new_po")}
              </Button>
            )}
            {can("purchasing.invoice.create") && (
              <Button size="sm" onClick={() => navigate("/purchasing/invoices/new")}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("invoices.new")}
              </Button>
            )}
          </div>
        }
      />

      {isOffline && <OfflineBanner />}

      {/* Toolbar */}
      <div className="space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            placeholder={t("invoices.search_placeholder")}
            className="ps-9"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2">
          {/* Supplier filter */}
          <Select
            value={filters.supplier || "__all__"}
            onValueChange={v => setFilter("supplier", v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-8 w-auto min-w-40 text-sm">
              <SelectValue placeholder={t("invoices.all_suppliers")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("invoices.all_suppliers")}</SelectItem>
              {(data?.suppliers ?? []).map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {lang === "ar" ? s.name_ar : s.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Receipt status — INDEPENDENT */}
          <Select
            value={filters.receiptStatus || "__all__"}
            onValueChange={v => setFilter("receiptStatus", v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-8 w-auto min-w-44 text-sm">
              <SelectValue placeholder={t("invoices.all_receipt")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("invoices.all_receipt")}</SelectItem>
              <SelectItem value="pending">{t("receipt.pending")}</SelectItem>
              <SelectItem value="partially_received">{t("receipt.partial")}</SelectItem>
              <SelectItem value="completed">{t("receipt.completed")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment status — INDEPENDENT */}
          <Select
            value={filters.paymentStatus || "__all__"}
            onValueChange={v => setFilter("paymentStatus", v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-8 w-auto min-w-40 text-sm">
              <SelectValue placeholder={t("invoices.all_payment")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("invoices.all_payment")}</SelectItem>
              <SelectItem value="paid">{t("pay.paid")}</SelectItem>
              <SelectItem value="partial">{t("pay.partial")}</SelectItem>
              <SelectItem value="credit">{t("pay.credit")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Inbound ETA status — INDEPENDENT */}
          <Select
            value={filters.inboundStatus || "__all__"}
            onValueChange={v => setFilter("inboundStatus", v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-8 w-auto min-w-40 text-sm">
              <SelectValue placeholder={t("invoices.all_inbound")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("invoices.all_inbound")}</SelectItem>
              <SelectItem value="accepted">{t("inbound.accepted")}</SelectItem>
              <SelectItem value="pending">{t("inbound.pending")}</SelectItem>
              <SelectItem value="rejected">{t("inbound.rejected")}</SelectItem>
              <SelectItem value="unmatched">{t("inbound.unmatched")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <DatePicker
            value={filters.dateFrom}
            onChange={val => setFilter("dateFrom", val)}
            className="h-8 w-40 text-sm"
            aria-label={t("statement.date_from")}
          />
          <DatePicker
            value={filters.dateTo}
            onChange={val => setFilter("dateTo", val)}
            className="h-8 w-40 text-sm"
            aria-label={t("statement.date_to")}
          />
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {activeChips.map(chip => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="gap-1 pe-1 cursor-pointer"
                onClick={chip.clear}
              >
                {chip.label}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
              {t("invoices.clear_filters")}
            </Button>
          </div>
        )}
      </div>

      {/* Table area */}
      <PageSection padded={false}>
        {loading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState description={t("errors.load")} onRetry={reload} />
        ) : allInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("invoices.no_invoices")}
            description={t("invoices.empty_sub")}
            action={
              can("purchasing.invoice.create")
                ? { label: t("invoices.new"), onClick: () => navigate("/purchasing/invoices/new") }
                : undefined
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults onClear={clearFilters} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm">
                  {table.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id} className="border-b border-border hover:bg-transparent">
                      {hg.headers.map(header => {
                        const col = header.column;
                        const isSortable = col.getCanSort();
                        const isEnd = header.id === "total";
                        return (
                          <TableHead
                            key={header.id}
                            className={cn(
                              "h-11 py-0 px-4 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                              isSortable && "cursor-pointer select-none hover:text-foreground"
                            )}
                            onClick={isSortable ? col.getToggleSortingHandler() : undefined}
                          >
                            <span className="inline-flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {isSortable && (
                                col.getIsSorted() === "asc"
                                  ? <ChevronUp className="h-3 w-3" />
                                  : col.getIsSorted() === "desc"
                                    ? <ChevronDown className="h-3 w-3" />
                                    : <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </span>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/purchasing/invoices/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "px-4 py-3",
                            cell.column.id === "total" && "text-start tabular-nums"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden">
              {filtered.map(inv => {
                const s = supplierMap[inv.supplier_id];
                const name = s ? (lang === "ar" ? s.name_ar : s.name_en) : inv.supplier_id;
                return (
                  <InvoiceMobileCard
                    key={inv.id}
                    inv={inv}
                    supplierName={name}
                    lang={lang}
                    t={t}
                    onView={() => navigate(`/purchasing/invoices/${inv.id}`)}
                  />
                );
              })}
            </div>
          </>
        )}
      </PageSection>
    </div>
  );
}
