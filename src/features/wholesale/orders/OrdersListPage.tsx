import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
  createColumnHelper, type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Plus, Download, Search, Eye, PackageCheck, Receipt, Ban, MoreVertical,
  ChevronUp, ChevronDown, ChevronsUpDown, ClipboardList,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { EntityCell, RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";
import { FulfillmentBar } from "@/components/wholesale/FulfillmentBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useWholesaleOrders } from "@/stores/wholesaleOrders";
import { useWholesaleCreditReservations } from "@/stores/wholesaleCreditReservations";
import { getCustomers, getReps, getRoutes } from "@/lib/mock/wholesale";
import { getAvailableCredit } from "@/lib/wholesale/credit";
import type { SalesOrder, SalesOrderStatus } from "@/types/wholesale";

const STATUS_PILL: Record<SalesOrderStatus, PillVariant> = {
  draft: "default",
  approved: "active",
  picking: "pending",
  partial: "pending",
  delivered: "approved",
  invoiced: "paid",
  cancelled: "inactive",
};

const ALL_STATUSES: SalesOrderStatus[] = [
  "draft", "approved", "picking", "partial", "delivered", "invoiced", "cancelled",
];

/** Row height estimate for the virtualizer below the ≥200-row threshold. */
const ROW_HEIGHT = 56;
const VIRTUALIZE_THRESHOLD = 200;

const colHelper = createColumnHelper<SalesOrder>();

export function OrdersListPage() {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const orders = useWholesaleOrders((s) => s.orders);
  const updateOrder = useWholesaleOrders((s) => s.updateOrder);
  const reservations = useWholesaleCreditReservations((s) => s.reservations);

  const customers = useMemo(() => getCustomers(), []);
  const reps = useMemo(() => getReps(), []);
  const routes = useMemo(() => getRoutes(), []);
  const customerMap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const repMap = useMemo(() => Object.fromEntries(reps.map((r) => [r.id, r])), [reps]);

  const overLimitCustomerIds = useMemo(
    () => new Set(customers.filter((c) => getAvailableCredit(c, reservations) < 0).map((c) => c.id)),
    [customers, reservations],
  );

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [repId, setRepId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overLimitOnly, setOverLimitOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [cancelTarget, setCancelTarget] = useState<SalesOrder | null>(null);

  function clearFilters() {
    setSearch(""); setStatus(""); setCustomerId(""); setRepId(""); setRouteId("");
    setDateFrom(""); setDateTo(""); setOverLimitOnly(false);
  }

  const filtered = useMemo(() => {
    let list = orders;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) => {
        const c = customerMap[o.customer_id];
        return (
          o.number.toLowerCase().includes(q) ||
          c?.name_ar?.includes(search) ||
          c?.name_en?.toLowerCase().includes(q)
        );
      });
    }
    if (status) list = list.filter((o) => o.status === status);
    if (customerId) list = list.filter((o) => o.customer_id === customerId);
    if (repId) list = list.filter((o) => o.rep_id === repId);
    if (routeId) list = list.filter((o) => o.route_id === routeId);
    if (dateFrom) list = list.filter((o) => o.date >= dateFrom);
    if (dateTo) list = list.filter((o) => o.date <= dateTo);
    if (overLimitOnly) list = list.filter((o) => overLimitCustomerIds.has(o.customer_id));
    return list;
  }, [orders, search, status, customerId, repId, routeId, dateFrom, dateTo, overLimitOnly, customerMap, overLimitCustomerIds]);

  function canCancel(order: SalesOrder) {
    return !["cancelled", "invoiced"].includes(order.status) && order.delivered_pct === 0;
  }

  const confirmCancel = useCallback(() => {
    if (!cancelTarget) return;
    updateOrder(cancelTarget.id, { status: "cancelled" });
    toast.success(t("orders.cancel_success"));
    setCancelTarget(null);
  }, [cancelTarget, updateOrder, t]);

  const columns = useMemo(() => [
    colHelper.accessor("number", {
      id: "number",
      header: () => t("orders.col_number"),
      cell: (info) => <span className="font-mono text-xs tabular-nums" dir="ltr">{info.getValue()}</span>,
      enableSorting: true,
    }),
    colHelper.accessor("customer_id", {
      id: "customer",
      header: () => t("orders.col_customer"),
      cell: (info) => {
        const c = customerMap[info.getValue()];
        if (!c) return info.getValue();
        const name = lang === "ar" ? c.name_ar : c.name_en;
        return <EntityCell name={name} avatarFallback={name.slice(0, 2)} />;
      },
    }),
    colHelper.accessor("date", {
      id: "date",
      header: () => t("orders.col_date"),
      cell: (info) => <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">{formatDate(info.getValue())}</span>,
      enableSorting: true,
    }),
    colHelper.accessor("delivery_date", {
      id: "delivery_date",
      header: () => t("orders.col_delivery_date"),
      cell: (info) => <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">{formatDate(info.getValue())}</span>,
      enableSorting: true,
    }),
    colHelper.accessor((row) => row.totals.grand_total, {
      id: "total",
      header: () => t("orders.col_total"),
      cell: (info) => <span className="tabular-nums font-medium">{formatMoney(info.getValue(), lang)}</span>,
      enableSorting: true,
    }),
    colHelper.accessor("delivered_pct", {
      id: "fulfillment",
      header: () => t("orders.col_fulfillment"),
      cell: (info) => <FulfillmentBar pct={info.getValue()} />,
    }),
    colHelper.accessor("status", {
      id: "status",
      header: () => t("orders.col_status"),
      cell: (info) => <StatusPill variant={STATUS_PILL[info.getValue()]} label={t(`orders.status_${info.getValue()}`)} />,
    }),
    colHelper.accessor("rep_id", {
      id: "rep",
      header: () => t("orders.col_rep"),
      cell: (info) => {
        const rep = repMap[info.getValue()];
        return <span className="text-sm text-muted-foreground">{rep ? (lang === "ar" ? rep.name_ar : rep.name_en) : "—"}</span>;
      },
    }),
    colHelper.display({
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <RowActionsContent>
              <RowActionItem icon={Eye} onClick={() => navigate(`/wholesale/orders/${order.id}`)}>
                {t("orders.action_view")}
              </RowActionItem>
              {(order.status === "approved" || order.status === "partial") && (
                <RowActionItem icon={PackageCheck} onClick={() => navigate(`/wholesale/orders/${order.id}/pick`)}>
                  {t("orders.action_pick")}
                </RowActionItem>
              )}
              {order.delivered_pct > 0 && (
                <RowActionItem icon={Receipt} onClick={() => toast.info(t("orders.action_invoice"))}>
                  {t("orders.action_invoice")}
                </RowActionItem>
              )}
              {can("sales.order.cancel") && canCancel(order) && (
                <RowActionItem icon={Ban} destructive onClick={() => setCancelTarget(order)}>
                  {t("orders.action_cancel")}
                </RowActionItem>
              )}
            </RowActionsContent>
          </DropdownMenu>
        );
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, lang, customerMap, repMap, can, navigate]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  const shouldVirtualize = rows.length > VIRTUALIZE_THRESHOLD;
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  function handleExport() {
    toast.success(t("orders.export_toast", { n: filtered.length }));
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("orders.title")}
        count={orders.length > 0 ? t("orders.count", { n: orders.length }) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 me-1.5" />
              {t("orders.export_excel")}
            </Button>
            {can("sales.order.create") && (
              <Button size="sm" onClick={() => navigate("/wholesale/orders/new")}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("orders.new")}
              </Button>
            )}
          </div>
        }
      />

      <PageSection padded={false}>
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("orders.search_placeholder")} className="ps-9" />
          </div>

          <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36"><SelectValue placeholder={t("orders.all_statuses")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_statuses")}</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(`orders.status_${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={customerId || "__all__"} onValueChange={(v) => setCustomerId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36"><SelectValue placeholder={t("orders.all_customers")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_customers")}</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{lang === "ar" ? c.name_ar : c.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={repId || "__all__"} onValueChange={(v) => setRepId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-32"><SelectValue placeholder={t("orders.all_reps")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_reps")}</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r.id} value={r.id}>{lang === "ar" ? r.name_ar : r.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={routeId || "__all__"} onValueChange={(v) => setRouteId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-32"><SelectValue placeholder={t("orders.all_routes")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_routes")}</SelectItem>
              {routes.map((r) => (
                <SelectItem key={r.id} value={r.id}>{lang === "ar" ? r.name_ar : r.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto h-10" title={t("orders.filter_date_from")} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto h-10" title={t("orders.filter_date_to")} />

          <label className="flex items-center gap-2 text-sm ms-auto whitespace-nowrap">
            {t("orders.filter_over_limit")}
            <Switch checked={overLimitOnly} onCheckedChange={setOverLimitOnly} />
          </label>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t("orders.no_orders")}
            description={t("orders.empty_sub")}
            action={can("sales.order.create") ? { label: t("orders.new"), onClick: () => navigate("/wholesale/orders/new") } : undefined}
          />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("orders.no_results_title")}</p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>{t("orders.clear_filters")}</Button>
          </div>
        ) : (
          <div ref={parentRef} className={shouldVirtualize ? "max-h-[70vh] overflow-auto" : "overflow-x-auto"}>
            <Table>
              <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm z-10">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-b border-border hover:bg-transparent">
                    {hg.headers.map((header) => {
                      const col = header.column;
                      const isSortable = col.getCanSort();
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "h-11 py-0 px-4 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                            isSortable && "cursor-pointer select-none hover:text-foreground",
                          )}
                          onClick={isSortable ? col.getToggleSortingHandler() : undefined}
                        >
                          <span className="inline-flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {isSortable && (
                              col.getIsSorted() === "asc" ? <ChevronUp className="h-3 w-3" />
                                : col.getIsSorted() === "desc" ? <ChevronDown className="h-3 w-3" />
                                : <ChevronsUpDown className="h-3 w-3 opacity-40" />
                            )}
                          </span>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>

              {/* Virtualized above VIRTUALIZE_THRESHOLD rows; plain render otherwise
                  (matches every other list page in this codebase below that size). */}
              {shouldVirtualize ? (
                <TableBody style={{ display: "block", position: "relative", height: virtualizer.getTotalSize() }}>
                  {virtualizer.getVirtualItems().map((vRow) => {
                    const row = rows[vRow.index];
                    return (
                      <TableRow
                        key={row.id}
                        style={{ display: "table", width: "100%", position: "absolute", transform: `translateY(${vRow.start}px)` }}
                        className="border-b border-border hover:bg-muted/40 cursor-pointer"
                        onClick={() => navigate(`/wholesale/orders/${row.original.id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-4 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              ) : (
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                      onClick={() => navigate(`/wholesale/orders/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>
        )}
      </PageSection>

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title={t("orders.cancel_title")}
        description={t("orders.cancel_body")}
        confirmTone="danger"
        confirmLabel={t("orders.action_cancel")}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
