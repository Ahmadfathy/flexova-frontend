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

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { EntityCell, RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Badge }     from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label }  from "@/components/ui/label";

import {
  Plus, Download, MoreVertical, X, Eye, Wallet,
  Building2, Search, ChevronUp, ChevronDown, ChevronsUpDown,
  AlertTriangle, Pencil, Ban, CheckCircle2,
} from "lucide-react";

import { formatMoney } from "@/lib/format";
import { cn }          from "@/lib/utils";
import { useCan }      from "@/lib/permissions";
import { usePurchasingData, type Supplier } from "../data/usePurchasingData";
import { SupplierFormModal } from "./SupplierFormModal";

/* ─── Skeleton ───────────────────────────────────────────────── */

function SuppliersSkeleton() {
  return (
    <div className="overflow-hidden">
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[80, 160, 120, 100, 100, 80, 32].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded shrink-0" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <Skeleton className="h-3.5 w-20 shrink-0" />
          <Skeleton className="h-8 w-8 rounded shrink-0" />
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3.5 w-24 shrink-0 hidden sm:block" />
          <Skeleton className="h-3.5 w-24 shrink-0 hidden md:block" />
          <Skeleton className="h-3.5 w-20 shrink-0 ms-auto" />
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
          <Skeleton className="h-7 w-7 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ─── No-results ─────────────────────────────────────────────── */

function NoResults({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation("purchasing");
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="flex items-center justify-center h-12 w-12 rounded bg-muted text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <p className="font-medium">{t("suppliers.no_results")}</p>
      <Button variant="ghost" size="sm" onClick={onClear}>
        {t("suppliers.clear_filters")}
      </Button>
    </div>
  );
}

/* ─── Mobile card ────────────────────────────────────────────── */

function SupplierMobileCard({
  supplier,
  lang,
  onView,
  onEdit: _onEdit,
  onPay,
  canPay,
  t,
}: {
  supplier: Supplier;
  lang: "ar" | "en";
  onView: () => void;
  onEdit: () => void;
  onPay: () => void;
  canPay: boolean;
  t: ReturnType<typeof useTranslation<"purchasing">>["t"];
}) {
  const name = lang === "ar" ? supplier.name_ar : supplier.name_en;
  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm truncate">{name}</span>
        <StatusPill
          variant={supplier.status === "active" ? "active" : "inactive"}
          label={t(`status.${supplier.status}`)}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-muted-foreground" dir="ltr">{supplier.code}</span>
        {supplier.balance > 0 ? (
          <span className="text-xs font-medium tabular-nums text-warning-text">
            {formatMoney(supplier.balance, lang)}
          </span>
        ) : (
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatMoney(0, lang)}
          </span>
        )}
      </div>
      {canPay && supplier.balance > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="self-end h-7 text-xs"
          onClick={e => { e.stopPropagation(); onPay(); }}
        >
          <Wallet className="h-3.5 w-3.5 me-1" />
          {t("actions.pay")}
        </Button>
      )}
    </div>
  );
}

/* ─── Filter state ───────────────────────────────────────────── */

interface SupplierFilters {
  search:      string;
  category:    string;
  status:      string;
  withBalance: boolean;
}

const EMPTY_FILTERS: SupplierFilters = {
  search: "", category: "", status: "", withBalance: false,
};

/* ─── Column helper ──────────────────────────────────────────── */

const colHelper = createColumnHelper<Supplier>();

/* ─── Main page ──────────────────────────────────────────────── */

export function SuppliersListPage() {
  const { t, i18n }  = useTranslation("purchasing");
  const lang          = (i18n.language?.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate      = useNavigate();
  const can           = useCan();

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  const [filters,     setFilters]     = useState<SupplierFilters>(EMPTY_FILTERS);
  const [sorting,     setSorting]     = useState<SortingState>([]);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<Supplier | null>(null);

  const setFilter = useCallback(
    <K extends keyof SupplierFilters>(key: K, val: SupplierFilters[K]) =>
      setFilters(prev => ({ ...prev, [key]: val })),
    []
  );
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const allSuppliers = data?.suppliers ?? [];

  const filteredSuppliers = useMemo(() => {
    let list = allSuppliers;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(s =>
        s.name_ar.toLowerCase().includes(q) ||
        s.name_en.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.trn.includes(q)
      );
    }
    if (filters.category) list = list.filter(s => s.category === filters.category);
    if (filters.status)   list = list.filter(s => s.status   === filters.status);
    if (filters.withBalance) list = list.filter(s => s.balance > 0);
    return list;
  }, [allSuppliers, filters]);

  /* ── humanise payment terms ── */
  function termsLabel(s: Supplier): string {
    if (s.payment_terms.type === "cash") return t("terms.cash");
    return t("terms.credit", { n: s.payment_terms.days ?? 0 });
  }

  /* ── TanStack columns ── */
  const columns = useMemo(() => [
    colHelper.accessor("code", {
      id: "code",
      header: () => t("col.code"),
      cell: info => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
          {info.getValue()}
        </span>
      ),
      enableSorting: true,
    }),
    colHelper.accessor(row => lang === "ar" ? row.name_ar : row.name_en, {
      id: "name",
      header: () => t("col.name"),
      cell: info => {
        const s = info.row.original;
        const name = lang === "ar" ? s.name_ar : s.name_en;
        const sub  = s.trn
          ? s.trn
          : undefined;
        return (
          <EntityCell
            name={name}
            sub={sub}
            avatarFallback={name.slice(0, 2)}
          />
        );
      },
      enableSorting: true,
    }),
    colHelper.accessor("trn", {
      id: "trn",
      header: () => t("col.trn"),
      cell: info => {
        const trn = info.getValue();
        if (!trn) {
          return (
            <Badge
              variant="outline"
              className="border-transparent bg-warning-tint text-warning-text text-xs gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              {t("card.no_trn")}
            </Badge>
          );
        }
        return (
          <span className="text-sm text-muted-foreground font-mono tabular-nums" dir="ltr">
            {trn}
          </span>
        );
      },
    }),
    colHelper.accessor(row => termsLabel(row), {
      id: "terms",
      header: () => t("col.terms"),
      cell: info => (
        <span className="text-sm text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    colHelper.accessor("balance", {
      id: "balance",
      header: () => t("col.balance"),
      cell: info => {
        const v = info.getValue();
        return (
          <span className={cn(
            "tabular-nums font-medium",
            v > 0 ? "text-warning-text" : "text-muted-foreground"
          )}>
            {formatMoney(v, lang)}
          </span>
        );
      },
      enableSorting: true,
    }),
    colHelper.accessor("status", {
      id: "status",
      header: () => t("col.status"),
      cell: info => (
        <StatusPill
          variant={info.getValue() === "active" ? "active" : "inactive"}
          label={t(`status.${info.getValue()}`)}
        />
      ),
    }),
    colHelper.display({
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const s = row.original;
        const canPayThis = s.balance > 0 && can("purchasing.payment.create");
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
            <RowActionsContent>
              <RowActionItem
                icon={Eye}
                onClick={e => { e.stopPropagation(); navigate(`/purchasing/suppliers/${s.id}`); }}
              >
                {t("actions.view")}
              </RowActionItem>
              {can("purchasing.supplier.manage") && (
                <RowActionItem
                  icon={Pencil}
                  onClick={e => { e.stopPropagation(); setEditTarget(s); setModalOpen(true); }}
                >
                  {t("actions.edit")}
                </RowActionItem>
              )}
              {canPayThis && (
                <>
                  <DropdownMenuSeparator />
                  <RowActionItem
                    icon={Wallet}
                    onClick={e => { e.stopPropagation(); navigate(`/purchasing/vouchers/new?supplier=${s.id}`); }}
                  >
                    {t("actions.pay")}
                  </RowActionItem>
                </>
              )}
              {can("purchasing.supplier.manage") && (
                <>
                  <DropdownMenuSeparator />
                  <RowActionItem
                    icon={s.status === "active" ? Ban : CheckCircle2}
                    onClick={e => e.stopPropagation()}
                    destructive={s.status === "active"}
                  >
                    {s.status === "active" ? t("actions.suspend") : t("actions.activate")}
                  </RowActionItem>
                </>
              )}
            </RowActionsContent>
          </DropdownMenu>
        );
      },
    }),
  ], [t, lang, can, navigate]);

  const table = useReactTable({
    data: filteredSuppliers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
  });

  /* ── Active filter chips ── */
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.category) activeChips.push({
    key: "cat", label: t(`category.${filters.category}`),
    clear: () => setFilter("category", ""),
  });
  if (filters.status) activeChips.push({
    key: "status", label: t(`status.${filters.status}`),
    clear: () => setFilter("status", ""),
  });
  if (filters.withBalance) activeChips.push({
    key: "balance", label: t("suppliers.with_balance"),
    clear: () => setFilter("withBalance", false),
  });

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };

  /* ── render ── */
  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("suppliers.title")}
        subtitle={allSuppliers.length > 0 ? t("suppliers.count", { n: allSuppliers.length }) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 me-1.5" />
              {t("suppliers.export")}
            </Button>
            {can("purchasing.supplier.manage") && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("suppliers.new")}
              </Button>
            )}
          </div>
        }
      />

      {isOffline && <OfflineBanner />}

      {/* Toolbar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            placeholder={t("suppliers.search_placeholder")}
            className="ps-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.category || "__all__"}
            onValueChange={v => setFilter("category", v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-8 w-auto min-w-36 text-sm">
              <SelectValue placeholder={t("suppliers.all_categories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("suppliers.all_categories")}</SelectItem>
              <SelectItem value="local">{t("category.local")}</SelectItem>
              <SelectItem value="imported">{t("category.imported")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || "__all__"}
            onValueChange={v => setFilter("status", v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-8 w-auto min-w-36 text-sm">
              <SelectValue placeholder={t("suppliers.all_statuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("suppliers.all_statuses")}</SelectItem>
              <SelectItem value="active">{t("status.active")}</SelectItem>
              <SelectItem value="suspended">{t("status.suspended")}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ms-1">
            <Switch
              id="with-balance"
              checked={filters.withBalance}
              onCheckedChange={v => setFilter("withBalance", v)}
              className="h-4 w-8 [&>span]:h-3 [&>span]:w-3"
            />
            <Label htmlFor="with-balance" className="text-sm cursor-pointer">
              {t("suppliers.with_balance")}
            </Label>
          </div>
        </div>

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
              {t("suppliers.clear_filters")}
            </Button>
          </div>
        )}
      </div>

      {/* Table area */}
      <PageSection padded={false}>
        {loading ? (
          <SuppliersSkeleton />
        ) : error ? (
          <ErrorState description={t("errors.load")} onRetry={reload} />
        ) : allSuppliers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t("suppliers.no_suppliers")}
            description={t("suppliers.empty_sub")}
            action={
              can("purchasing.supplier.manage")
                ? { label: t("suppliers.new"), onClick: openCreate }
                : undefined
            }
          />
        ) : filteredSuppliers.length === 0 ? (
          <NoResults onClear={clearFilters} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm">
                  {table.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id} className="border-b border-border hover:bg-transparent">
                      {hg.headers.map(header => {
                        const col = header.column;
                        const isSortable = col.getCanSort();
                        const isEnd = header.id === "balance";
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
                      onClick={() => navigate(`/purchasing/suppliers/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "px-4 py-3",
                            cell.column.id === "balance" && "text-start tabular-nums"
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
            <div className="sm:hidden">
              {filteredSuppliers.map(s => (
                <SupplierMobileCard
                  key={s.id}
                  supplier={s}
                  lang={lang}
                  t={t}
                  onView={() => navigate(`/purchasing/suppliers/${s.id}`)}
                  onEdit={() => { setEditTarget(s); setModalOpen(true); }}
                  onPay={() => navigate(`/purchasing/vouchers/new?supplier=${s.id}`)}
                  canPay={can("purchasing.payment.create")}
                />
              ))}
            </div>
          </>
        )}
      </PageSection>

      <SupplierFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        supplier={editTarget}
        onSaved={reload}
      />
    </div>
  );
}
