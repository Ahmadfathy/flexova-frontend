import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { DatePicker }    from "@/components/patterns/DatePicker";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import {
  Phone, Mail, MapPin, Info, Wallet, FileText,
  ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle,
} from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { cn }      from "@/lib/utils";
import { useCan }  from "@/lib/permissions";
import {
  usePurchasingData,
  type Supplier,
  type PurchaseInvoice,
  type PurchaseReturn,
  type PaymentVoucher,
} from "../data/usePurchasingData";
import { SupplierFormModal } from "./SupplierFormModal";

/* ─── Statement row type ─────────────────────────────────────── */

type DocType = "invoice" | "return" | "voucher";

interface StatementRow {
  id:       string;
  date:     string;
  docType:  DocType;
  docLabel: string;
  href:     string;
  debit:    number;
  credit:   number;
  running:  number;
}

function buildStatement(
  supplierId: string,
  invoices: PurchaseInvoice[],
  returns:  PurchaseReturn[],
  vouchers: PaymentVoucher[],
): StatementRow[] {
  const rows: Omit<StatementRow, "running">[] = [
    ...invoices
      .filter(i => i.supplier_id === supplierId)
      .map(i => ({
        id:       i.id,
        date:     i.date,
        docType:  "invoice" as DocType,
        docLabel: i.number,
        href:     `/purchasing/invoices/${i.id}`,
        debit:    i.totals.grand_total,
        credit:   0,
      })),
    ...returns
      .filter(r => r.supplier_id === supplierId)
      .map(r => ({
        id:       r.id,
        date:     r.date,
        docType:  "return" as DocType,
        docLabel: r.number,
        href:     `/purchasing/returns/${r.id}`,
        debit:    0,
        credit:   r.totals.value,
      })),
    ...vouchers
      .filter(v => v.supplier_id === supplierId)
      .map(v => ({
        id:       v.id,
        date:     v.date,
        docType:  "voucher" as DocType,
        docLabel: v.number,
        href:     `/purchasing/vouchers/${v.id}`,
        debit:    0,
        credit:   v.amount,
      })),
  ];

  rows.sort((a, b) => a.date.localeCompare(b.date));

  let running = 0;
  return rows.map(r => {
    running += r.debit - r.credit;
    return { ...r, running };
  });
}

/* ─── Skeleton ───────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded border border-border p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded border border-border p-5">
        <Skeleton className="h-4 w-28 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" style={{ opacity: 1 - i * 0.2 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Column helper ──────────────────────────────────────────── */

const colHelper = createColumnHelper<StatementRow>();

/* ─── Main page ──────────────────────────────────────────────── */

export function SupplierCardPage() {
  const { t, i18n }  = useTranslation("purchasing");
  const lang          = (i18n.language?.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { id }        = useParams<{ id: string }>();
  const navigate      = useNavigate();
  const can           = useCan();

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  const [modalOpen,  setModalOpen]  = useState(false);
  const [sorting,    setSorting]    = useState<SortingState>([]);
  const [stmtType,   setStmtType]   = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");

  /* ── derive supplier + statement ── */
  const supplier: Supplier | undefined = useMemo(
    () => data?.suppliers.find(s => s.id === id),
    [data, id]
  );

  const allRows: StatementRow[] = useMemo(() => {
    if (!data || !id) return [];
    return buildStatement(id, data.purchaseInvoices, data.purchaseReturns, data.paymentVouchers);
  }, [data, id]);

  const filteredRows = useMemo(() => {
    let list = allRows;
    if (stmtType)  list = list.filter(r => r.docType === stmtType);
    if (dateFrom)  list = list.filter(r => r.date >= dateFrom);
    if (dateTo)    list = list.filter(r => r.date <= dateTo);
    return list;
  }, [allRows, stmtType, dateFrom, dateTo]);

  /* ── TanStack columns ── */
  const columns = useMemo(() => [
    colHelper.accessor("date", {
      id: "date",
      header: () => t("statement.col_date"),
      cell: info => (
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {formatDate(info.getValue())}
        </span>
      ),
      enableSorting: true,
    }),
    colHelper.accessor("docLabel", {
      id: "doc",
      header: () => t("statement.col_doc"),
      cell: info => {
        const row = info.row.original;
        const typeLabel = t(`statement.type_${row.docType}`);
        return (
          <span className="flex flex-col gap-0.5">
            <Link
              to={row.href}
              className="text-sm font-medium text-foreground hover:underline font-mono"
              onClick={e => e.stopPropagation()}
              dir="ltr"
            >
              {info.getValue()}
            </Link>
            <span className="text-xs text-muted-foreground">{typeLabel}</span>
          </span>
        );
      },
    }),
    colHelper.accessor("debit", {
      id: "debit",
      header: () => t("statement.col_debit"),
      cell: info => {
        const v = info.getValue();
        return v > 0 ? (
          <span className="tabular-nums font-medium text-foreground">
            {formatMoney(v, lang)}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
      enableSorting: false,
    }),
    colHelper.accessor("credit", {
      id: "credit",
      header: () => t("statement.col_credit"),
      cell: info => {
        const v = info.getValue();
        return v > 0 ? (
          <span className="tabular-nums font-medium text-success-text">
            {formatMoney(v, lang)}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
      enableSorting: false,
    }),
    colHelper.accessor("running", {
      id: "running",
      header: () => t("statement.col_balance"),
      cell: info => {
        const v = info.getValue();
        return (
          <span className={cn(
            "tabular-nums font-semibold",
            v > 0 ? "text-warning-text" : "text-muted-foreground"
          )}>
            {formatMoney(v, lang)}
          </span>
        );
      },
      enableSorting: false,
    }),
  ], [t, lang]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
  });

  /* ── render states ── */
  const showSkeleton = loading && !data;

  if (!loading && !error && !isOffline && data && !supplier) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader title={t("suppliers.title")} />
        <PageSection>
          <ErrorState description={t("errors.not_found")} onRetry={() => navigate("/purchasing/suppliers")} />
        </PageSection>
      </div>
    );
  }

  const name = supplier ? (lang === "ar" ? supplier.name_ar : supplier.name_en) : "…";

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={name}
        crumbLabel={supplier ? name : null}
        crumbLoading={showSkeleton}
        actions={
          supplier ? (
            <div className="flex items-center gap-2">
              {can("purchasing.supplier.manage") && (
                <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                  {t("card.edit", { defaultValue: t("actions.edit") })}
                </Button>
              )}
              {supplier.balance > 0 && can("purchasing.payment.create") && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/purchasing/vouchers/new?supplier=${supplier.id}`)}
                >
                  <Wallet className="h-4 w-4 me-1.5" />
                  {t("actions.pay")}
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {isOffline && <OfflineBanner />}

      {showSkeleton ? (
        <CardSkeleton />
      ) : error ? (
        <PageSection>
          <ErrorState description={t("errors.load")} onRetry={reload} />
        </PageSection>
      ) : supplier ? (
        <>
          {/* ── Header card ── */}
          <PageSection>
            <div className="space-y-5">
              {/* Name + status + code */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold">{name}</h2>
                    <StatusPill
                      variant={supplier.status === "active" ? "active" : "inactive"}
                      label={t(`status.${supplier.status}`)}
                    />
                  </div>
                  <span className="text-sm font-mono text-muted-foreground" dir="ltr">
                    {supplier.code}
                  </span>
                </div>

                {/* Balance block */}
                <div className={cn(
                  "rounded px-4 py-3 text-end border",
                  supplier.balance > 0
                    ? "bg-warning-tint border-warning/20"
                    : "bg-muted/50 border-border"
                )}>
                  <p className="text-xs text-muted-foreground">{t("card.balance")}</p>
                  <p className={cn(
                    "text-lg font-semibold tabular-nums",
                    supplier.balance > 0 ? "text-warning-text" : "text-foreground"
                  )}>
                    {formatMoney(supplier.balance, lang)}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 justify-end">
                    <Info className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{t("card.balance_note")}</p>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{t("card.trn")}</p>
                  {supplier.trn ? (
                    <p className="text-sm font-mono tabular-nums" dir="ltr">{supplier.trn}</p>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-warning-tint text-warning-text text-xs gap-1"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {t("card.no_trn")}
                    </Badge>
                  )}
                </div>

                {supplier.uin && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t("card.uin")}</p>
                    <p className="text-sm font-mono tabular-nums" dir="ltr">{supplier.uin}</p>
                  </div>
                )}

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{t("card.terms")}</p>
                  <p className="text-sm">
                    {supplier.payment_terms.type === "cash"
                      ? t("terms.cash")
                      : t("terms.credit", { n: supplier.payment_terms.days ?? 0 })}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{t("card.category")}</p>
                  <p className="text-sm">{t(`category.${supplier.category}`)}</p>
                </div>
              </div>

              {/* Contact */}
              {(supplier.contact.phone || supplier.contact.email || supplier.contact.address) && (
                <div className="pt-3 border-t border-border space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("card.contact")}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {supplier.contact.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span dir="ltr">{supplier.contact.phone}</span>
                      </span>
                    )}
                    {supplier.contact.email && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span dir="ltr">{supplier.contact.email}</span>
                      </span>
                    )}
                    {supplier.contact.address && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{supplier.contact.address}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </PageSection>

          {/* ── Statement ── */}
          <PageSection padded={false}>
            {/* Statement header + filters */}
            <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-sm">{t("statement.title")}</h3>

              <div className="flex flex-wrap gap-2 ms-auto">
                <Select
                  value={stmtType || "__all__"}
                  onValueChange={v => setStmtType(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="h-7 w-auto min-w-32 text-xs">
                    <SelectValue placeholder={t("statement.all_types")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("statement.all_types")}</SelectItem>
                    <SelectItem value="invoice">{t("statement.type_invoice")}</SelectItem>
                    <SelectItem value="return">{t("statement.type_return")}</SelectItem>
                    <SelectItem value="voucher">{t("statement.type_voucher")}</SelectItem>
                  </SelectContent>
                </Select>

                <DatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  className="h-7 w-36 text-xs"
                  aria-label={t("statement.date_from")}
                />
                <DatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  className="h-7 w-36 text-xs"
                  aria-label={t("statement.date_to")}
                />
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={FileText}
                  title={t("statement.empty")}
                />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  {table.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id} className="border-b border-border hover:bg-transparent">
                      {hg.headers.map(header => {
                        const col = header.column;
                        const isSortable = col.getCanSort();
                        const isEnd = ["debit", "credit", "running"].includes(header.id);
                        return (
                          <TableHead
                            key={header.id}
                            className={cn(
                              "h-9 py-0 px-4 text-xs font-semibold text-muted-foreground whitespace-nowrap",
                              isEnd ? "text-end" : "text-start",
                              isSortable && "cursor-pointer select-none hover:text-foreground"
                            )}
                            onClick={isSortable ? col.getToggleSortingHandler() : undefined}
                          >
                            <span className={cn("inline-flex items-center gap-1", isEnd && "flex-row-reverse")}>
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
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "px-4 py-3",
                            ["debit", "credit", "running"].includes(cell.column.id) && "text-end"
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
        </>
      ) : null}

      {supplier && (
        <SupplierFormModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          supplier={supplier}
          onSaved={reload}
        />
      )}
    </div>
  );
}
