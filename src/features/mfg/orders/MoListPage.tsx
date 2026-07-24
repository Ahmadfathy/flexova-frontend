import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus, Download, Search, ClipboardList, MoreVertical, Eye, Copy, Ban,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { DataTable, RowActionsContent, RowActionItem, type Column } from "@/components/patterns/DataTable";
import { Skeleton } from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useMfgOrders } from "@/stores/mfgOrders";
import { getItems, getWarehouses } from "@/lib/mock/mfg";
import type { ManufacturingOrder } from "@/types/mfg";
import { ALL_MO_STATUSES, moStatusPillVariant, isMoCancellable } from "./moStatus";
import { useMoList } from "./useMoList";

/** Earliest known timestamp for an MO — used only for the period filter (no
 * created_at field exists on an MO in the v1 fixture). */
function moOpenedAt(mo: ManufacturingOrder): string | null {
  const stageDates = mo.stages.map((s) => s.started_at).filter((d): d is string => !!d);
  const receiptDates = mo.finished_receipts.map((r) => r.date);
  const all = [...stageDates, ...receiptDates].sort();
  return all[0] ?? null;
}

export function MoListPage() {
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const orders = useMfgOrders((s) => s.orders);
  const cancelOrder = useMfgOrders((s) => s.cancelOrder);
  const duplicateOrder = useMfgOrders((s) => s.duplicateOrder);

  const { loading, error, isOffline, forcedEmpty, reload } = useMoList();

  const items = useMemo(() => getItems(), []);
  const warehouses = useMemo(() => getWarehouses(), []);
  const manufacturedItems = useMemo(() => items.filter((i) => i.item_type === "manufactured"), [items]);

  function itemName(id: string) {
    const item = items.find((i) => i.id === id);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : id;
  }
  function warehouseName(id: string) {
    const wh = warehouses.find((w) => w.id === id);
    return wh ? (lang === "ar" ? wh.name_ar : wh.name_en) : id;
  }

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [product, setProduct] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ManufacturingOrder | null>(null);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  function clearFilters() {
    setSearch(""); setStatus(""); setProduct(""); setWarehouse("");
    setDateFrom(""); setDateTo(""); setLinkedOnly(false);
  }

  const allOrders = forcedEmpty ? [] : Object.values(orders);

  const filtered = useMemo(() => {
    let list = allOrders;
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter((o) =>
        o.number.toLowerCase().includes(q) ||
        itemName(o.output_item_id).toLowerCase().includes(q) ||
        (o.customer_order_id ?? "").toLowerCase().includes(q)
      );
    }
    if (status) list = list.filter((o) => o.status === status);
    if (product) list = list.filter((o) => o.output_item_id === product);
    if (warehouse) list = list.filter((o) => o.wh_finished === warehouse);
    if (dateFrom) list = list.filter((o) => { const d = moOpenedAt(o); return !!d && d >= dateFrom; });
    if (dateTo) list = list.filter((o) => { const d = moOpenedAt(o); return !!d && d <= dateTo; });
    if (linkedOnly) list = list.filter((o) => !!o.customer_order_id);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrders, search, status, product, warehouse, dateFrom, dateTo, linkedOnly, lang]);

  const noResults = forcedNoResults || (allOrders.length > 0 && filtered.length === 0);

  const confirmCancel = useCallback(() => {
    if (!cancelTarget) return;
    cancelOrder(cancelTarget.id);
    toast.success(t("orders.cancel_success"));
    setCancelTarget(null);
  }, [cancelTarget, cancelOrder, t]);

  function handleDuplicate(mo: ManufacturingOrder) {
    const copy = duplicateOrder(mo.id);
    if (copy) toast.success(t("orders.duplicate_success", { number: copy.number }));
  }

  function handleExport() {
    toast.success(t("orders.export_toast", { n: filtered.length }));
  }

  if (!can("mfg.order.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("orders.permission_required")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("orders.title")} />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("orders.title")} />
        <PageSection><ErrorState title={t("orders.error_title")} description={t("orders.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const columns: Column<ManufacturingOrder>[] = [
    {
      key: "number", header: t("orders.col_number"),
      cell: (mo) => (
        <button
          onClick={() => navigate(`/mfg/orders/${mo.id}`)}
          className="font-mono text-xs text-brand hover:underline"
          dir="ltr"
        >
          {mo.number}
        </button>
      ),
    },
    { key: "product", header: t("orders.col_product"), cell: (mo) => itemName(mo.output_item_id) },
    { key: "qty", header: t("orders.col_qty"), numeric: true, cell: (mo) => mo.qty_ordered },
    { key: "received", header: t("orders.col_received"), numeric: true, cell: (mo) => mo.qty_received },
    {
      key: "status", header: t("orders.col_status"),
      cell: (mo) => <StatusPill variant={moStatusPillVariant(mo.status)} label={t(`orders.status_${mo.status}`)} />,
    },
    { key: "warehouse", header: t("orders.col_warehouse"), cell: (mo) => warehouseName(mo.wh_finished) },
    {
      key: "customer", header: t("orders.col_customer"),
      cell: (mo) => mo.customer_order_id
        ? <span className="font-mono text-xs" dir="ltr">{mo.customer_order_id}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "cost", header: t("orders.col_cost"), numeric: true,
      cell: (mo) => <span className="font-medium">{formatMoney(mo.cost_summary.total, lang)}</span>,
    },
    {
      key: "actions", header: t("orders.col_actions"),
      cell: (mo) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <RowActionsContent>
            <RowActionItem icon={Eye} onClick={() => navigate(`/mfg/orders/${mo.id}`)}>
              {t("orders.action_open")}
            </RowActionItem>
            <RowActionItem icon={Copy} onClick={() => handleDuplicate(mo)}>
              {t("orders.action_duplicate")}
            </RowActionItem>
            {can("mfg.order.create") && isMoCancellable(mo.status) && (
              <RowActionItem icon={Ban} destructive onClick={() => setCancelTarget(mo)}>
                {t("orders.action_cancel")}
              </RowActionItem>
            )}
          </RowActionsContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("orders.title")}
        count={allOrders.length > 0 ? t("orders.count", { n: allOrders.length }) : undefined}
        actions={
          <div className="flex items-center gap-2">
            {can("mfg.export") && (
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 me-1.5" />
                {t("orders.export")}
              </Button>
            )}
            {can("mfg.order.create") && (
              <Button size="sm" onClick={() => navigate("/mfg/orders/new")}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("orders.new")}
              </Button>
            )}
          </div>
        }
        alert={isOffline ? <OfflineBanner message={t("orders.offline_note")} /> : undefined}
      />

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("orders.search_placeholder")} className="ps-9" />
          </div>

          <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36"><SelectValue placeholder={t("orders.all_statuses")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_statuses")}</SelectItem>
              {ALL_MO_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`orders.status_${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={product || "__all__"} onValueChange={(v) => setProduct(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36"><SelectValue placeholder={t("orders.all_products")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_products")}</SelectItem>
              {manufacturedItems.map((i) => <SelectItem key={i.id} value={i.id}>{lang === "ar" ? i.name_ar : i.name_en}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={warehouse || "__all__"} onValueChange={(v) => setWarehouse(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36"><SelectValue placeholder={t("orders.all_warehouses")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_warehouses")}</SelectItem>
              {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto h-10" title={t("orders.filter_period_from")} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto h-10" title={t("orders.filter_period_to")} />

          <label className="flex items-center gap-2 text-sm ms-auto whitespace-nowrap">
            {t("orders.linked_customer_only")}
            <Switch checked={linkedOnly} onCheckedChange={setLinkedOnly} />
          </label>
        </div>

        {allOrders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t("orders.empty_title")}
            description={t("orders.empty_body")}
            action={can("mfg.order.create") ? { label: t("orders.new"), onClick: () => navigate("/mfg/orders/new") } : undefined}
          />
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("orders.no_results_title")}</p>
            <p className="text-xs text-muted-foreground">{t("orders.no_results_body")}</p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>{t("orders.clear_filters")}</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={filtered} keyExtractor={(mo) => mo.id} />
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
