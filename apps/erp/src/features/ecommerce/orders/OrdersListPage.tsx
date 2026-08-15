import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingBag, CreditCard, Truck } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EntityCell } from "@/components/patterns/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useEcommerceOrders } from "@/stores/ecommerceOrders";
import { getEcCustomer } from "@/lib/mock/ecommerce";
import { ORDER_STATUS_PILL } from "../catalog";
import { useMockState } from "../useMockState";
import type { EcOrder, EcOrderStatus, EcPaymentMethod } from "../types";

const ALL_STATUSES: EcOrderStatus[] = [
  "pending_payment", "paid", "processing", "shipped", "delivered", "returned", "cancelled",
];
const ALL_PAYMENT_METHODS: EcPaymentMethod[] = ["card", "cod"];

export function OrdersListPage() {
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const navigate = useNavigate();

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();
  const ordersMap = useEcommerceOrders((s) => s.orders);
  const reconcilePending = useEcommerceOrders((s) => s.reconcilePending);

  useEffect(() => { if (!isOffline) reconcilePending(); }, [isOffline, reconcilePending]);

  const allOrders = useMemo(
    () => (forcedEmpty ? [] : Object.values(ordersMap).sort((a, b) => b.created_at.localeCompare(a.created_at))),
    [ordersMap, forcedEmpty]
  );

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function clearFilters() {
    setSearch(""); setStatus(""); setPaymentMethod(""); setDateFrom(""); setDateTo("");
  }

  const filtered = useMemo(() => {
    let list = allOrders;
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter((o) => {
        const customer = getEcCustomer(o.customer_id);
        return o.code.toLowerCase().includes(q) || (customer?.phone ?? "").includes(q);
      });
    }
    if (status) list = list.filter((o) => o.status === status);
    if (paymentMethod) list = list.filter((o) => o.payment_method === paymentMethod);
    if (dateFrom) list = list.filter((o) => o.created_at.slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((o) => o.created_at.slice(0, 10) <= dateTo);
    return list;
  }, [allOrders, search, status, paymentMethod, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("orders.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border" style={{ opacity: 1 - i * 0.15 }}>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3.5 w-16 tabular-nums" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("orders.title")} />
        <PageSection><ErrorState description={t("orders.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("orders.title")}
        count={allOrders.length > 0 ? t("orders.count", { n: allOrders.length }) : undefined}
      />

      {isOffline && <OfflineBanner message={t("orders.offline_note")} />}

      <PageSection padded={false}>
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("orders.search_placeholder")}
              className="h-10"
            />
          </div>

          <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-40"><SelectValue placeholder={t("orders.all_statuses")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_statuses")}</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(`orders.status_${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentMethod || "__all__"} onValueChange={(v) => setPaymentMethod(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36"><SelectValue placeholder={t("orders.all_payment_methods")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_payment_methods")}</SelectItem>
              {ALL_PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>{t(`orders.payment_method_${m}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto h-10" title={t("orders.filter_date_from")} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto h-10" title={t("orders.filter_date_to")} />
        </div>

        {allOrders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={t("orders.no_orders")} description={t("orders.empty_sub")} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("orders.no_results_title")}</p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>{t("orders.clear_filters")}</Button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("orders.col_code")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("orders.col_customer")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("orders.col_total")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("orders.col_status")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("orders.col_payment")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("orders.col_date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                    <OrderRow key={o.id} order={o} lang={lang} t={t} onClick={() => navigate(`/ecommerce/orders/${o.id}`)} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((o) => {
                const customer = getEcCustomer(o.customer_id);
                return (
                  <div key={o.id} className="px-4 py-3 space-y-1.5 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/ecommerce/orders/${o.id}`)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold" dir="ltr">{o.code}</span>
                      <StatusPill variant={ORDER_STATUS_PILL[o.status]} label={t(`orders.status_${o.status}`)} />
                    </div>
                    <p className="text-sm text-foreground">{customer ? customer.name_ar : o.customer_id}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span dir="ltr">{customer?.phone}</span>
                      <span className="tabular-nums font-medium text-foreground">{formatMoney(o.total, lang)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PageSection>
    </div>
  );
}

function OrderRow({
  order, lang, t, onClick,
}: {
  order: EcOrder;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"ecommerce">>["t"];
  onClick: () => void;
}) {
  const customer = getEcCustomer(order.customer_id);
  const isStuck = order._flag === "webhook_late_no_invoice_yet";
  return (
    <TableRow className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer" onClick={onClick}>
      <TableCell className="font-mono text-xs" dir="ltr">{order.code}</TableCell>
      <TableCell>
        <EntityCell
          name={customer ? customer.name_ar : order.customer_id}
          sub={customer?.phone}
          avatarFallback={(customer?.name_ar ?? order.customer_id).slice(0, 2)}
        />
      </TableCell>
      <TableCell className="tabular-nums font-medium px-4 py-3.5">{formatMoney(order.total, lang)}</TableCell>
      <TableCell className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <StatusPill variant={ORDER_STATUS_PILL[order.status]} label={t(`orders.status_${order.status}`)} />
          {order.sync && order.sync !== "synced" && (
            <Badge variant="outline" className="text-[10px] font-normal border-warning/40 text-warning-text">
              {t(`orders.sync_${order.sync}`)}
            </Badge>
          )}
          {isStuck && (
            <Badge variant="outline" className="text-[10px] font-normal border-danger/40 text-danger-text">
              {t("orders.flag_stuck_payment")}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground")}>
          {order.payment_method === "card" ? <CreditCard className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
          {t(`orders.payment_method_${order.payment_method}`)}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap px-4 py-3.5">
        {formatDate(order.created_at)}
      </TableCell>
    </TableRow>
  );
}
