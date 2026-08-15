import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft, ExternalLink, Package, MapPin, CreditCard, Truck,
  Receipt, RefreshCw, Ban, ShoppingBag, Users2, FileWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { formatDate, formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useEcommerceOrders } from "@/stores/ecommerceOrders";
import { getEcCustomer, getAffiliate } from "@/lib/mock/ecommerce";
import {
  ORDER_STATUS_PILL, PAYMENT_STATUS_PILL, etaStatusPill,
  primaryAction, canReturnOrCancel, isReturnVsCancel, productTitle,
} from "../catalog";
import { MarkShippedDialog } from "./MarkShippedDialog";

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

export function OrderDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const order = useEcommerceOrders((s) => s.orders[id]);
  const recheckPayment = useEcommerceOrders((s) => s.recheckPayment);
  const startProcessing = useEcommerceOrders((s) => s.startProcessing);
  const markShipped = useEcommerceOrders((s) => s.markShipped);
  const markDelivered = useEcommerceOrders((s) => s.markDelivered);
  const returnOrCancel = useEcommerceOrders((s) => s.returnOrCancel);
  const reconcilePending = useEcommerceOrders((s) => s.reconcilePending);

  // Reuses the list page's five-states signal (?mock=loading|empty|error|offline) —
  // `empty` has no meaning for a single-record detail page, so it's ignored here.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(false); setIsOffline(false);
      const { mockFetch } = await import("@/lib/mock/client");
      try {
        await mockFetch(async () => "ok" as const, "ok" as const);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof Error && e.message === "mock_offline") setIsOffline(true);
        else setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => { if (!isOffline) reconcilePending(); }, [isOffline, reconcilePending]);

  const [shipOpen, setShipOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  if (loading) return <DetailSkeleton />;
  if (error) {
    return <div className="p-4"><ErrorState title={t("orders.error_title")} description={t("orders.error_body")} onRetry={() => window.location.reload()} /></div>;
  }
  if (!order) {
    return (
      <div className="p-4">
        <EmptyState icon={ShoppingBag} title={t("orders.not_found_title")} description={t("orders.not_found_body")}
          action={{ label: t("orders.back_to_list"), onClick: () => navigate("/ecommerce/orders") }} />
      </div>
    );
  }

  const customer = getEcCustomer(order.customer_id);
  const affiliate = getAffiliate(order.affiliate_id);
  const action = primaryAction(order.status);
  const canManage = can("ecommerce.orders.manage");
  const canRefund = can("ecommerce.orders.refund");
  const isStuck = order._flag === "webhook_late_no_invoice_yet";
  const returnKind = isReturnVsCancel(order.status);

  function handlePrimaryAction() {
    if (!order) return;
    switch (action) {
      case "recheck_payment":
        recheckPayment(order.id);
        toast.success(t("orders.recheck_success_toast"));
        return;
      case "start_processing":
        startProcessing(order.id);
        toast.success(t("orders.start_processing_toast"));
        return;
      case "mark_shipped":
        setShipOpen(true);
        return;
      case "mark_delivered":
        markDelivered(order.id);
        toast.success(t("orders.mark_delivered_toast"));
        return;
    }
  }

  function handleConfirmShip(carrier: string, trackingNo: string) {
    if (!order) return;
    markShipped(order.id, carrier, trackingNo);
    setShipOpen(false);
    toast.success(t("orders.mark_shipped_toast"));
  }

  function handleConfirmReturn() {
    if (!order) return;
    returnOrCancel(order.id);
    setReturnOpen(false);
    toast.success(t(returnKind === "return" ? "orders.return_toast" : "orders.cancel_toast"));
  }

  return (
    <div className="h-full overflow-auto p-4 pb-28 lg:pb-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {isOffline && <OfflineBanner message={t("orders.offline_note")} />}

        {isStuck && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-danger-tint text-danger-text rounded border border-danger/20 text-sm">
            <FileWarning className="h-4 w-4 shrink-0" />
            <span>{t("orders.flag_stuck_payment_body")}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="icon" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/ecommerce/orders")} aria-label={t("orders.back_to_list")}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
          <span className="font-mono text-sm font-semibold text-foreground" dir="ltr">{order.code}</span>
          <StatusPill variant={ORDER_STATUS_PILL[order.status]} label={t(`orders.status_${order.status}`)} />
          {order.sync && order.sync !== "synced" && (
            <Badge variant="outline" className="text-xs font-normal border-warning/40 text-warning-text">
              {t(`orders.sync_${order.sync}`)}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground tabular-nums ms-auto">{formatDate(order.created_at)}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* START — customer/shipping/payment identity */}
          <div className="space-y-3 rounded-lg border border-border bg-card p-4 h-fit">
            <div>
              <p className="text-xs text-muted-foreground">{t("orders.customer")}</p>
              <Button
                variant="ghost" size="sm" className="h-auto p-0 text-sm font-medium text-brand-text gap-1"
                onClick={() => navigate("/customers/list")}
              >
                {customer ? customer.name_ar : order.customer_id}
                <ExternalLink className="h-3 w-3" />
              </Button>
              {customer?.phone && <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{customer.phone}</p>}
              {customer?.source === "crm" && (
                <p className="text-xs text-muted-foreground mt-0.5">{t("orders.customer_crm_note")}</p>
              )}
            </div>

            {order.shipping_address && (
              <div className="flex items-start gap-2 pt-2 border-t border-border">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{order.shipping_address}</p>
              </div>
            )}

            <div className="pt-2 border-t border-border space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                {order.payment_method === "card" ? <CreditCard className="h-4 w-4 text-muted-foreground" /> : <Truck className="h-4 w-4 text-muted-foreground" />}
                <span className="text-foreground">{t(`orders.payment_method_${order.payment_method}`)}</span>
              </div>
              <StatusPill variant={PAYMENT_STATUS_PILL[order.payment_status]} label={t(`orders.payment_status_${order.payment_status}`)} />
            </div>

            {affiliate && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Users2 className="h-3.5 w-3.5" />{t("orders.affiliate")}</p>
                <p className="text-sm text-foreground">{affiliate.name_ar} · <span className="font-mono text-xs" dir="ltr">{affiliate.code}</span></p>
              </div>
            )}

            {(order.carrier || order.tracking_no) && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">{t("orders.carrier_label")}</p>
                <p className="text-sm text-foreground">{order.carrier}</p>
                <p className="text-xs text-muted-foreground font-mono" dir="ltr">{order.tracking_no}</p>
              </div>
            )}

            {/* ERP links — READ only */}
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-xs text-muted-foreground">{t("orders.erp_links")}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("orders.invoice_label")}</span>
                {order.invoice_id ? (
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-brand-text gap-1" onClick={() => navigate(`/sales/invoices/${order.invoice_id}`)}>
                    <Receipt className="h-3.5 w-3.5" />
                    <span className="font-mono text-xs" dir="ltr">{order.invoice_id}</span>
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs">{t("orders.not_yet_generated")}</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("orders.eta_label")}</span>
                {order.eta_status ? (
                  <StatusPill variant={etaStatusPill(order.eta_status)} label={t(`orders.eta_status_${order.eta_status}`)} />
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("orders.ar_label")}</span>
                <StatusPill variant={PAYMENT_STATUS_PILL[order.payment_status]} label={t(`orders.ar_status_${order.payment_status}`)} />
              </div>
              {order.credit_note_id && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("orders.credit_note_label")}</span>
                  <span className="font-mono text-xs text-foreground" dir="ltr">{order.credit_note_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* END — items */}
          <div className="min-w-0 rounded-lg border border-border bg-card p-4 space-y-3 h-fit">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="h-4 w-4" /> {t("orders.items")}
            </div>
            <div className="rounded border border-border divide-y divide-border overflow-hidden">
              {order.items.map((line, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{productTitle(line.product_id, lang)}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.variant ? `${line.variant} · ` : ""}{t("orders.qty_label")}: {line.qty}
                    </p>
                  </div>
                  <span className="tabular-nums text-sm font-medium">{formatMoney(line.qty * line.unit_price, lang)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 pt-2 border-t border-border text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("orders.subtotal")}</span>
                <span className="tabular-nums">{formatMoney(order.subtotal, lang)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("orders.shipping_cost")}</span>
                <span className="tabular-nums">{formatMoney(order.shipping, lang)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-foreground pt-1 border-t border-border">
                <span>{t("orders.total")}</span>
                <span className="tabular-nums">{formatMoney(order.total, lang)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lifecycle action bar */}
        <div className="hidden lg:flex items-center justify-end gap-2 flex-wrap">
          <LifecycleActions
            action={action} returnAvailable={canReturnOrCancel(order.status)} returnKind={returnKind}
            canManage={canManage} canRefund={canRefund} t={t}
            onPrimary={handlePrimaryAction} onReturn={() => setReturnOpen(true)}
          />
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 p-3 bg-card border-t border-border flex items-center gap-2 overflow-x-auto">
        <LifecycleActions
          action={action} returnAvailable={canReturnOrCancel(order.status)} returnKind={returnKind}
          canManage={canManage} canRefund={canRefund} t={t}
          onPrimary={handlePrimaryAction} onReturn={() => setReturnOpen(true)}
        />
      </div>

      <MarkShippedDialog open={shipOpen} onOpenChange={setShipOpen} onConfirm={handleConfirmShip} />

      <ConfirmDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title={t(returnKind === "return" ? "orders.return_dialog_title" : "orders.cancel_dialog_title")}
        description={t(returnKind === "return" ? "orders.return_dialog_body" : "orders.cancel_dialog_body")}
        confirmTone="danger"
        confirmLabel={t(returnKind === "return" ? "orders.action_return" : "orders.action_cancel")}
        onConfirm={handleConfirmReturn}
      />
    </div>
  );
}

interface LifecycleActionsProps {
  action: ReturnType<typeof primaryAction>;
  returnAvailable: boolean;
  returnKind: "return" | "cancel";
  canManage: boolean;
  canRefund: boolean;
  t: ReturnType<typeof useTranslation<"ecommerce">>["t"];
  onPrimary: () => void;
  onReturn: () => void;
}

function LifecycleActions({ action, returnAvailable, returnKind, canManage, canRefund, t, onPrimary, onReturn }: LifecycleActionsProps) {
  return (
    <>
      {action && canManage && (
        <Button onClick={onPrimary}>
          {action === "recheck_payment" && <RefreshCw className="h-3.5 w-3.5 me-1.5" />}
          {t(`orders.action_${action}`)}
        </Button>
      )}
      {returnAvailable && canRefund && (
        <Button variant="outline" tone="danger" onClick={onReturn}>
          <Ban className="h-3.5 w-3.5 me-1.5" />
          {t(returnKind === "return" ? "orders.action_return" : "orders.action_cancel")}
        </Button>
      )}
    </>
  );
}
