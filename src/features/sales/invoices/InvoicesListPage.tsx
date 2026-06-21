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
  type RowSelectionState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { EntityCell }    from "@/components/patterns/DataTable";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Badge }     from "@/components/ui/badge";
import { Checkbox }  from "@/components/ui/checkbox";
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
  Plus, Printer, Download, MoreVertical, X, Eye, Wallet,
  RotateCcw, RefreshCw, Ban, Search, FileText,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { cn }        from "@/lib/utils";
import { useCan }    from "@/lib/permissions";
import {
  useSalesData,
  type SalesInvoice,
  type EtaStatus,
  type PaymentStatus,
} from "./useSalesData";

/* ─── Status helpers ─────────────────────────────────────────── */

function etaPillVariant(s: EtaStatus): PillVariant {
  switch (s) {
    case "valid":          return "approved";
    case "clearing":       return "active";
    case "queued":         return "pending";
    case "rejected":
    case "buyer_rejected": return "rejected";
    case "cancelled":      return "inactive";
    default:               return "default";
  }
}

function payPillVariant(s: PaymentStatus): PillVariant {
  switch (s) {
    case "paid":     return "paid";
    case "partial":  return "pending";
    case "credit":   return "credit";
    case "returned": return "inactive";
    default:         return "default";
  }
}

/* ─── Channel badge ──────────────────────────────────────────── */

function ChannelBadge({ channel }: { channel: "e-invoice" | "e-receipt" }) {
  const { t } = useTranslation("sales");
  const isB2B = channel === "e-invoice";
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent text-xs font-medium",
        isB2B
          ? "bg-brand-tint text-brand-text"
          : "bg-success-tint text-success-text"
      )}
    >
      {isB2B ? t("list.channel_b2b") : t("list.channel_b2c")}
    </Badge>
  );
}

/* ─── Filter state ────────────────────────────────────────────── */

interface InvoiceFilters {
  search:        string;
  paymentStatus: string;
  etaStatus:     string;
  branch:        string;
  channel:       string;
  dateFrom:      string;
  dateTo:        string;
}

const EMPTY_FILTERS: InvoiceFilters = {
  search: "", paymentStatus: "", etaStatus: "",
  branch: "", channel: "", dateFrom: "", dateTo: "",
};


/* ─── Skeleton ───────────────────────────────────────────────── */

function InvoicesSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[16, 100, 72, 140, 72, 80, 80, 80, 32].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded shrink-0" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.1 }}
        >
          <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
          <Skeleton className="h-3.5 w-24 shrink-0" />
          <Skeleton className="h-3.5 w-20 shrink-0" />
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-5 w-16 rounded-full shrink-0 hidden sm:block" />
          <Skeleton className="h-3.5 w-24 shrink-0 ms-auto" />
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
          <Skeleton className="h-5 w-20 rounded-full shrink-0" />
          <Skeleton className="h-7 w-7 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ─── No-results ─────────────────────────────────────────────── */

function NoResults({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation("sales");
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-muted text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{t("list.no_results")}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        {t("list.clear_filters")}
      </Button>
    </div>
  );
}

/* ─── Row actions ────────────────────────────────────────────── */

function InvoiceActions({
  inv,
  can,
  t,
  onView,
}: {
  inv: SalesInvoice;
  can: (p: string) => boolean;
  t: ReturnType<typeof useTranslation<"sales">>["t"];
  onView: () => void;
}) {
  const canCollect = inv.balance > 0 && can("sales.payment.collect");
  const canReturn  = inv.eta_status === "valid" && can("sales.creditnote.create");
  const canResend  = (inv.eta_status === "rejected" || inv.eta_status === "queued") && can("sales.eta.resend");
  const canCancel  = inv.eta_status !== "cancelled" && inv.eta_status !== "draft" && can("sales.invoice.cancel");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={e => { e.stopPropagation(); onView(); }}>
          <Eye className="h-4 w-4 me-2" />
          {t("list.action_view")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={e => { e.stopPropagation(); toast.info(t("list.action_print")); }}>
          <Printer className="h-4 w-4 me-2" />
          {t("list.action_print")}
        </DropdownMenuItem>

        {canCollect && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onView(); }}>
              <Wallet className="h-4 w-4 me-2" />
              {t("list.action_collect")}
            </DropdownMenuItem>
          </>
        )}

        {canReturn && (
          <DropdownMenuItem onClick={e => e.stopPropagation()}>
            <RotateCcw className="h-4 w-4 me-2" />
            {t("list.action_return")}
          </DropdownMenuItem>
        )}

        {canResend && (
          <DropdownMenuItem onClick={e => e.stopPropagation()}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t("list.action_resend")}
          </DropdownMenuItem>
        )}

        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={e => e.stopPropagation()}
            >
              <Ban className="h-4 w-4 me-2" />
              {t("list.action_cancel")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Column helper ──────────────────────────────────────────── */

const colHelper = createColumnHelper<SalesInvoice>();

/* ─── Main component ─────────────────────────────────────────── */

export function InvoicesListPage() {
  const { t, i18n }  = useTranslation("sales");
  const lang          = (i18n.language?.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate      = useNavigate();
  const can           = useCan();
  const { data, loading, error, isOffline, reload } = useSalesData();

  const [filters,   setFilters]   = useState<InvoiceFilters>(EMPTY_FILTERS);
  const [sorting,   setSorting]   = useState<SortingState>([]);
  const [selection, setSelection] = useState<RowSelectionState>({});

  const setFilter = useCallback(
    <K extends keyof InvoiceFilters>(key: K, val: InvoiceFilters[K]) =>
      setFilters(prev => ({ ...prev, [key]: val })),
    []
  );
  const clearFilters = useCallback(() => { setFilters(EMPTY_FILTERS); setSelection({}); }, []);

  /* ── lookup maps ── */
  const customerMap = useMemo(
    () => Object.fromEntries((data?.customers ?? []).map(c => [c.id, c])),
    [data?.customers]
  );

  /* ── filtered list ── */
  const allInvoices = data?.invoices ?? [];
  const filteredInvoices = useMemo(() => {
    let list = allInvoices;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(inv => {
        const c = customerMap[inv.customer_id];
        return (
          inv.number.toLowerCase().includes(q) ||
          c?.name_ar?.toLowerCase().includes(q) ||
          c?.name_en?.toLowerCase().includes(q) ||
          (c?.trn ?? "").includes(q)
        );
      });
    }
    /* payment status — INDEPENDENT axis */
    if (filters.paymentStatus) list = list.filter(inv => inv.payment_status === filters.paymentStatus);
    /* ETA status — INDEPENDENT axis */
    if (filters.etaStatus)     list = list.filter(inv => inv.eta_status === filters.etaStatus);
    if (filters.branch)        list = list.filter(inv => inv.branch_id === filters.branch);
    if (filters.channel)       list = list.filter(inv => inv.channel === filters.channel);
    if (filters.dateFrom)      list = list.filter(inv => inv.date >= filters.dateFrom);
    if (filters.dateTo)        list = list.filter(inv => inv.date <= filters.dateTo);
    return list;
  }, [allInvoices, filters, customerMap]);

  /* ── TanStack columns ── */
  const columns = useMemo(() => [
    colHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
          aria-label="select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={v => row.toggleSelected(!!v)}
          onClick={e => e.stopPropagation()}
          aria-label="select row"
        />
      ),
    }),
    colHelper.accessor("number", {
      id: "number",
      header: () => t("list.col_number"),
      cell: info => (
        <span className="font-mono text-xs tabular-nums num" dir="ltr">
          {info.getValue()}
        </span>
      ),
      enableSorting: true,
    }),
    colHelper.accessor("date", {
      id: "date",
      header: () => t("list.col_date"),
      cell: info => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(info.getValue())}
        </span>
      ),
      enableSorting: true,
    }),
    colHelper.accessor("customer_id", {
      id: "customer",
      header: () => t("list.col_customer"),
      cell: info => {
        const c = customerMap[info.getValue()];
        if (!c) return null;
        const name = lang === "ar" ? c.name_ar : c.name_en;
        return (
          <EntityCell
            name={name}
            sub={c.trn ? c.trn : undefined}
            avatarFallback={name.slice(0, 2)}
          />
        );
      },
    }),
    colHelper.accessor("channel", {
      id: "channel",
      header: () => t("list.col_channel"),
      cell: info => <ChannelBadge channel={info.getValue()} />,
    }),
    colHelper.accessor(row => row.totals.grand_total, {
      id: "total",
      header: () => t("list.col_total"),
      cell: info => (
        <span className="tabular-nums num font-medium">
          {formatMoney(info.getValue(), lang)}
        </span>
      ),
      enableSorting: true,
    }),
    /* payment status — INDEPENDENT column */
    colHelper.accessor("payment_status", {
      id: "payment_status",
      header: () => t("list.col_pay"),
      cell: info => (
        <StatusPill
          variant={payPillVariant(info.getValue())}
          label={t(`pay.${info.getValue()}`)}
        />
      ),
    }),
    /* ETA status — INDEPENDENT column */
    colHelper.accessor("eta_status", {
      id: "eta_status",
      header: () => t("list.col_eta"),
      cell: info => (
        <StatusPill
          variant={etaPillVariant(info.getValue())}
          label={t(`eta.${info.getValue()}`)}
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
          onView={() => navigate(`/sales/invoices/${row.original.id}`)}
        />
      ),
    }),
  ], [t, lang, customerMap, can, navigate]);

  const table = useReactTable({
    data: filteredInvoices,
    columns,
    state: { sorting, rowSelection: selection },
    onSortingChange: setSorting,
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
    enableRowSelection: true,
  });

  const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);
  const hasSelection = selectedRows.length > 0;
  const canBulkResend = selectedRows.every(
    r => r.eta_status === "rejected" || r.eta_status === "queued"
  );

  /* ─── Active filter chips ─── */
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.paymentStatus) activeChips.push({
    key: "pay", label: t(`pay.${filters.paymentStatus}`),
    clear: () => setFilter("paymentStatus", ""),
  });
  if (filters.etaStatus) activeChips.push({
    key: "eta", label: t(`eta.${filters.etaStatus}`),
    clear: () => setFilter("etaStatus", ""),
  });
  if (filters.branch) {
    const b = data?.branches.find(b => b.id === filters.branch);
    if (b) activeChips.push({
      key: "branch", label: lang === "ar" ? b.name_ar : b.name_en,
      clear: () => setFilter("branch", ""),
    });
  }
  if (filters.channel) activeChips.push({
    key: "channel", label: t(filters.channel === "e-invoice" ? "list.channel_b2b" : "list.channel_b2c"),
    clear: () => setFilter("channel", ""),
  });
  if (filters.dateFrom) activeChips.push({
    key: "from", label: filters.dateFrom,
    clear: () => setFilter("dateFrom", ""),
  });
  if (filters.dateTo) activeChips.push({
    key: "to", label: filters.dateTo,
    clear: () => setFilter("dateTo", ""),
  });

  /* ── render ── */
  return (
    <div className="space-y-4 pb-6">
      {/* Page header */}
      <PageHeader
        title={t("invoices.title")}
        actions={
          can("sales.invoice.create") ? (
            <Button size="sm" onClick={() => navigate("/sales/invoices/new")}>
              <Plus className="h-4 w-4 me-1.5" />
              {t("invoice.new")}
            </Button>
          ) : undefined
        }
      />

      {/* Offline banner */}
      {isOffline && <OfflineBanner />}

      {/* Toolbar */}
      <div className="space-y-2">
        {/* Row 1: search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            placeholder={t("list.search_placeholder")}
            className="ps-9"
          />
        </div>

        {/* Row 2: filter selects + date range */}
        <div className="flex flex-wrap gap-2">
          {/* Payment status filter — INDEPENDENT */}
          <Select value={filters.paymentStatus || "__all__"} onValueChange={v => setFilter("paymentStatus", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 w-auto min-w-40 text-sm">
              <SelectValue placeholder={t("list.all_payment")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_payment")}</SelectItem>
              <SelectItem value="paid">{t("pay.paid")}</SelectItem>
              <SelectItem value="partial">{t("pay.partial")}</SelectItem>
              <SelectItem value="credit">{t("pay.credit")}</SelectItem>
              <SelectItem value="returned">{t("pay.returned")}</SelectItem>
            </SelectContent>
          </Select>

          {/* ETA status filter — INDEPENDENT */}
          <Select value={filters.etaStatus || "__all__"} onValueChange={v => setFilter("etaStatus", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 w-auto min-w-44 text-sm">
              <SelectValue placeholder={t("list.all_eta")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_eta")}</SelectItem>
              <SelectItem value="draft">{t("eta.draft")}</SelectItem>
              <SelectItem value="unsent">{t("eta.unsent")}</SelectItem>
              <SelectItem value="queued">{t("eta.queued")}</SelectItem>
              <SelectItem value="clearing">{t("eta.clearing")}</SelectItem>
              <SelectItem value="valid">{t("eta.valid")}</SelectItem>
              <SelectItem value="rejected">{t("eta.rejected")}</SelectItem>
              <SelectItem value="cancelled">{t("eta.cancelled")}</SelectItem>
              <SelectItem value="buyer_rejected">{t("eta.buyer_rejected")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Branch filter */}
          {(data?.branches ?? []).length > 0 && (
            <Select value={filters.branch || "__all__"} onValueChange={v => setFilter("branch", v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 w-auto min-w-36 text-sm">
                <SelectValue placeholder={t("list.all_branches")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("list.all_branches")}</SelectItem>
                {(data?.branches ?? []).map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {lang === "ar" ? b.name_ar : b.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Channel filter */}
          <Select value={filters.channel || "__all__"} onValueChange={v => setFilter("channel", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 w-auto min-w-36 text-sm">
              <SelectValue placeholder={t("list.all_channels")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_channels")}</SelectItem>
              <SelectItem value="e-invoice">{t("list.channel_b2b")}</SelectItem>
              <SelectItem value="e-receipt">{t("list.channel_b2c")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilter("dateFrom", e.target.value)}
            className="h-8 w-auto text-sm"
            aria-label="from date"
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilter("dateTo", e.target.value)}
            className="h-8 w-auto text-sm"
            aria-label="to date"
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
              {t("list.clear_filters")}
            </Button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
          <span className="text-sm font-medium text-muted-foreground">
            {t("list.selected", { n: selectedRows.length })}
          </span>
          <div className="ms-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info(t("list.bulk_print"))}
            >
              <Printer className="h-4 w-4 me-1.5" />
              {t("list.bulk_print")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info(t("list.bulk_export"))}
            >
              <Download className="h-4 w-4 me-1.5" />
              {t("list.bulk_export")}
            </Button>
            {canBulkResend && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.info(t("list.bulk_resend"))}
              >
                <RefreshCw className="h-4 w-4 me-1.5" />
                {t("list.bulk_resend")}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => { setSelection({}); table.resetRowSelection(); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table area */}
      <PageSection padded={false}>
        {loading ? (
          <InvoicesSkeleton />
        ) : error ? (
          <ErrorState description={error} onRetry={reload} />
        ) : allInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("list.no_invoices")}
            action={can("sales.invoice.create") ? {
              label: t("invoice.new"),
              onClick: () => navigate("/sales/invoices/new"),
            } : undefined}
          />
        ) : filteredInvoices.length === 0 ? (
          <NoResults onClear={clearFilters} />
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm">
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id} className="border-b border-border hover:bg-transparent">
                  {hg.headers.map(header => {
                    const col = header.column;
                    const isSortable = col.getCanSort();
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "h-11 py-0 px-4 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                          header.id === "total" && "text-end",
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
                  onClick={() => navigate(`/sales/invoices/${row.original.id}`)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-4 py-3",
                        cell.column.id === "total" && "text-end"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageSection>
    </div>
  );
}
