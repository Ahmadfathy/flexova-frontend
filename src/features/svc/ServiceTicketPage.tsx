import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft, Flag, Minus, Plus, Printer, Receipt, ShoppingBag, Trash2, QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill } from "@/components/patterns/StatusPill";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { formatMoney, formatDate, formatTime } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePosShift } from "@/stores/posShift";
import { usePosRegister } from "@/stores/posRegister";
import { useSvcTickets, type SvcTicketTender } from "@/stores/svcTickets";
import { useSvcProductStock } from "@/stores/svcProductStock";
import { TenderModal } from "@/features/pos/TenderModal";
import { tenderName } from "@/features/pos/tenderTypes";
import type { PosItem } from "@/features/pos/useCashierCatalog";
import inventoryFixtures from "@/lib/mock/fixtures/inventory.fixtures.json";
import { useServiceTicket } from "./useServiceTicket";
import { computeTicketTotals, round2, lineNet } from "./ticketTotals";
import { computeCommission } from "./commission";
import { simulateEtaSubmit } from "./etaSim";
import { ProductPickerDialog } from "./ProductPickerDialog";
import {
  SERVICES, clientName, eligibleProviders, findClient, findProvider, providerName, serviceName,
} from "./catalog";

const TAX_TYPES = inventoryFixtures.tax_types as { id: string; rate: number }[];
const TAX_RATES: Record<string, number> = Object.fromEntries(TAX_TYPES.map((tt) => [tt.id, tt.rate]));

function TicketSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 p-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}

export default function ServiceTicketPage() {
  const { t } = useTranslation("svc");
  const { t: tPos } = useTranslation("pos");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();

  const { ticket, notFound, loading, error, isOffline, reload } = useServiceTicket(id);
  const shiftOpen = usePosShift((s) => s.status === "open");
  const recordSale = usePosShift((s) => s.recordSale);
  const setCustomer = usePosRegister((s) => s.setCustomer);

  const addServiceLine = useSvcTickets((s) => s.addServiceLine);
  const addProductLine = useSvcTickets((s) => s.addProductLine);
  const setLineProvider = useSvcTickets((s) => s.setLineProvider);
  const setLineQty = useSvcTickets((s) => s.setLineQty);
  const removeLine = useSvcTickets((s) => s.removeLine);
  const setTicketDiscount = useSvcTickets((s) => s.setTicketDiscount);
  const settleTicket = useSvcTickets((s) => s.settleTicket);
  const depleteStock = useSvcProductStock((s) => s.deplete);

  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [tenderOpen, setTenderOpen] = useState(false);

  const forceRejectEta = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "eta_reject",
    []
  );

  const canSettle = can("svc.ticket.settle");
  const canOverrideDiscount = can("svc.discount.override");

  const totals = ticket ? computeTicketTotals(ticket.lines, ticket.ticket_discount, TAX_RATES) : null;
  const client = ticket ? findClient(ticket.client_id) : undefined;
  const clientLabel = ticket ? (ticket.walk_in_name || clientName(client, lang)) : "";
  const hasTrn = !!client?.trn;

  const qtyInTicket = useMemo(() => {
    const map: Record<string, number> = {};
    if (!ticket) return map;
    for (const l of ticket.lines) if (l.type === "product") map[l.ref] = (map[l.ref] ?? 0) + l.qty;
    return map;
  }, [ticket]);

  if (loading) return <TicketSkeleton />;
  if (error) {
    return <div className="p-4"><ErrorState title={t("ticket.error_title")} description={t("ticket.error_body")} onRetry={reload} /></div>;
  }
  if (notFound || !ticket || !totals) {
    return (
      <div className="p-4">
        <EmptyState icon={Receipt} title={t("ticket.not_found_title")} description={t("ticket.not_found_body")}
          action={{ label: t("ticket.back_to_calendar"), onClick: () => navigate("/svc/calendar") }} />
      </div>
    );
  }

  const isOpen = ticket.status === "open";
  const serviceLines = ticket.lines.filter((l) => l.type === "service");
  const productLines = ticket.lines.filter((l) => l.type === "product");
  const allServicesHaveProvider = serviceLines.every((l) => !!l.provider_id);
  const availableServicesToAdd = SERVICES;

  function handlePickProduct(item: PosItem) {
    addProductLine(ticket.id, {
      item_id: item.item_id,
      name: lang === "ar" ? item.name_ar : item.name_en,
      price: item.price ?? 0,
      tax_type_id: item.tax_type_id,
      eta_code_missing: item.eta_code === "",
    });
  }

  function finalizeSettle(tenders: SvcTicketTender[], changeDue: number, paymentStatus: "paid" | "credit") {
    if (!ticket || !totals) return;
    const commission = computeCommission(ticket.lines);
    const sim = simulateEtaSubmit({ hasTrn, isOnline: navigator.onLine, forceReject: forceRejectEta });

    recordSale(Object.fromEntries(tenders.map((td) => [td.type, td.amount])), totals.tax);
    for (const l of productLines) depleteStock(l.ref, l.qty);

    settleTicket(ticket.id, {
      tenders,
      changeDue,
      paymentStatus: paymentStatus === "credit" ? "unpaid" : "paid",
      syncStatus: sim.syncStatus,
      channel: sim.channel,
      commission,
      eta: sim.eta,
      totals: {
        subtotal: totals.subtotal,
        discount: round2(totals.lineDiscounts + totals.ticketDiscount + totals.coverage),
        taxable_base: totals.taxableBase,
        tax: totals.tax,
        rounding: 0,
        grand_total: totals.grandTotal,
      },
    });

    toast.success(t("ticket.settled_toast"));
    if (sim.syncStatus === "rejected") toast.error(t("ticket.eta_rejected_toast"));
    else if (sim.syncStatus === "queued") toast.info(t("ticket.eta_queued_toast"));
  }

  function handleSettleClick() {
    if (!totals) return;
    if (client) {
      setCustomer({
        id: client.id,
        type: "individual",
        name_ar: client.name_ar,
        name_en: client.name_en,
        credit_limit: 0,
        ar_balance: 0,
      });
    } else {
      setCustomer(null);
    }
    if (totals.payable <= 0) {
      finalizeSettle([], 0, "paid");
      return;
    }
    setTenderOpen(true);
  }

  function handleTenderSettle(result: { tenders: Record<string, number>; paymentStatus: "paid" | "credit"; syncStatus: "local" | "queued" }) {
    void result.syncStatus; // recomputed via simulateEtaSubmit for the doc/channel-aware outcome
    const tenders: SvcTicketTender[] = Object.entries(result.tenders).map(([tType, amount]) => ({ type: tType, amount }));
    const totalTendered = tenders.reduce((sum, td) => sum + td.amount, 0);
    const cash = result.tenders.pm_cash ?? 0;
    const overpay = Math.max(0, round2(totalTendered - (totals?.payable ?? 0)));
    const changeDue = Math.min(overpay, cash);
    finalizeSettle(tenders, changeDue, result.paymentStatus);
    setTenderOpen(false);
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-2xl mx-auto space-y-4 pb-8">
        {isOffline && <OfflineBanner message={t("ticket.offline_note")} />}

        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="icon" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/svc/calendar")} aria-label={t("ticket.back_to_calendar")}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground shrink-0">
            <Receipt className="h-4 w-4" />
            {ticket.number}
          </span>
          <StatusPill variant={isOpen ? "pending" : "approved"} label={t(`ticket.status.${ticket.status}`)} />
          {!isOpen && (
            <>
              <StatusPill variant={ticket.payment_status === "paid" ? "paid" : "credit"} label={t(`ticket.payment.${ticket.payment_status}`)} />
              <StatusPill
                variant={ticket.sync_status === "valid" ? "approved" : ticket.sync_status === "rejected" ? "rejected" : "pending"}
                label={t(`ticket.sync.${ticket.sync_status}`)}
              />
            </>
          )}
          <span className="flex-1" />
          <span className="text-xs text-muted-foreground">{ticket.channel === "e-invoice" ? t("ticket.channel_b2b") : t("ticket.channel_b2c")}</span>
        </div>

        <p className="text-sm text-muted-foreground">{clientLabel}</p>

        {/* Service lines */}
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {serviceLines.map((line) => {
            const eligible = eligibleProviders([line.ref]);
            return (
              <div key={line.id} className="flex items-center gap-2 p-2.5 bg-card flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground flex items-center gap-1.5">
                    {line.name}
                    {line.eta_code_missing && (
                      <span title={tPos("grid.no_eta_code_hint")}><Flag className="h-3 w-3 text-warning shrink-0" /></span>
                    )}
                    {line.package_covered && <StatusPill variant="active" label={t("appointment.coverage_label")} />}
                  </p>
                  {isOpen ? (
                    <Select value={line.provider_id ?? ""} onValueChange={(v) => setLineProvider(ticket.id, line.id, v)}>
                      <SelectTrigger className="h-9 mt-1 w-full sm:w-56"><SelectValue placeholder={t("appointment.provider_placeholder")} /></SelectTrigger>
                      <SelectContent>
                        {eligible.map((p) => <SelectItem key={p.id} value={p.id}>{providerName(p, lang)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">{providerName(findProvider(line.provider_id), lang)}</p>
                  )}
                </div>
                <span className={`tabular-nums text-sm font-semibold shrink-0 ${line.package_covered ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {formatMoney(lineNet(line), lang)}
                </span>
                {isOpen && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeLine(ticket.id, line.id)} aria-label={t("ticket.remove_line")}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </div>
            );
          })}

          {isOpen && (
            <div className="p-2.5 bg-card">
              <Select value="" onValueChange={(v) => addServiceLine(ticket.id, v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder={t("ticket.add_service")} /></SelectTrigger>
                <SelectContent>
                  {availableServicesToAdd.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{serviceName(s, lang)} · {formatMoney(s.price, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Product lines */}
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {productLines.length === 0 && !isOpen ? null : (
            <>
              {productLines.map((line) => (
                <div key={line.id} className="flex items-center gap-2 p-2.5 bg-card flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground flex items-center gap-1.5">
                      {line.name}
                      {line.eta_code_missing && (
                      <span title={tPos("grid.no_eta_code_hint")}><Flag className="h-3 w-3 text-warning shrink-0" /></span>
                    )}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatMoney(line.price, lang)} × {line.qty}</p>
                  </div>
                  {isOpen && (
                    <div className="inline-flex items-center gap-1 rounded border border-border h-9 shrink-0">
                      <button type="button" onClick={() => setLineQty(ticket.id, line.id, line.qty - 1)} className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="-">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.qty}</span>
                      <button type="button" onClick={() => setLineQty(ticket.id, line.id, line.qty + 1)} className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="+">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="tabular-nums text-sm font-semibold text-foreground shrink-0 w-20 text-end">{formatMoney(lineNet(line), lang)}</span>
                  {isOpen && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeLine(ticket.id, line.id)} aria-label={t("ticket.remove_line")}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  )}
                </div>
              ))}
              {productLines.length === 0 && (
                <p className="text-sm text-muted-foreground p-2.5 bg-card">{t("ticket.no_products")}</p>
              )}
            </>
          )}

          {isOpen && (
            <div className="p-2.5 bg-card">
              <Button variant="outline" className="w-full h-11" onClick={() => setProductPickerOpen(true)}>
                <ShoppingBag className="h-4 w-4 me-1.5" />
                {t("ticket.add_product")}
              </Button>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="rounded-lg border border-border p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{tPos("subtotal")}</span>
            <span className="tabular-nums font-medium">{formatMoney(totals.subtotal, lang)}</span>
          </div>

          {totals.coverage > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("appointment.coverage_label")}</span>
              <span className="tabular-nums font-medium text-brand-text">-{formatMoney(totals.coverage, lang)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm gap-2">
            <span className="text-muted-foreground shrink-0">{tPos("ticket.discount")}</span>
            <Input
              type="number" min="0" step="1" inputMode="decimal"
              disabled={!isOpen || !canOverrideDiscount}
              value={ticket.ticket_discount}
              onChange={(e) => setTicketDiscount(ticket.id, parseFloat(e.target.value) || 0)}
              className="h-9 w-24 text-end tabular-nums"
            />
          </div>
          {!canOverrideDiscount && isOpen && (
            <p className="text-xs text-muted-foreground">{t("ticket.discount_gated_note")}</p>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{tPos("tax_total")}</span>
            <span className="tabular-nums font-medium">{formatMoney(totals.tax, lang)}</span>
          </div>

          <div className="flex items-center justify-between font-bold text-foreground pt-2 border-t border-border text-base">
            <span>{tPos("layout.grand_total")}</span>
            <span className="tabular-nums">{formatMoney(totals.grandTotal, lang)}</span>
          </div>
        </div>

        {/* Commission summary — post-settle */}
        {!isOpen && ticket.commission.length > 0 && (
          <div className="rounded-lg border border-border p-3.5 space-y-2">
            <p className="text-sm font-semibold text-foreground">{t("ticket.commission_title")}</p>
            {ticket.commission.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{providerName(findProvider(c.provider_id), lang)} · {c.pct}%</span>
                <span className="tabular-nums font-medium text-success-text">{formatMoney(c.amount, lang)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Settle / receipt */}
        {isOpen ? (
          <div className="space-y-2">
            {!allServicesHaveProvider && (
              <p className="text-xs text-danger-text">{t("ticket.provider_required_note")}</p>
            )}
            {!shiftOpen && (
              <p className="text-xs text-danger-text">{t("ticket.no_shift_note")}</p>
            )}
            <Button
              variant="solid" tone="primary" className="w-full h-12"
              disabled={!canSettle || !shiftOpen || !allServicesHaveProvider || totals.grandTotal < 0}
              onClick={handleSettleClick}
            >
              {totals.payable <= 0 ? t("ticket.settle_by_balance") : t("ticket.settle")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-end">
              <Button variant="outline" onClick={() => toast.info(t("ticket.print_toast"))}>
                <Printer className="h-4 w-4 me-1.5" />
                {t("ticket.print")}
              </Button>
            </div>

            {ticket.tenders.length > 0 && (
              <div className="rounded-lg border border-border p-3.5 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">{t("ticket.tenders_title")}</p>
                {ticket.tenders.map((td, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{tenderName(td.type, lang)}</span>
                    <span className="tabular-nums">{formatMoney(td.amount, lang)}</span>
                  </div>
                ))}
                {ticket.change_due > 0 && (
                  <div className="flex items-center justify-between text-sm text-success-text">
                    <span>{tPos("receipt.change_due")}</span>
                    <span className="tabular-nums">{formatMoney(ticket.change_due, lang)}</span>
                  </div>
                )}
              </div>
            )}

            {ticket.sync_status === "rejected" && ticket.eta && (
              <div className="rounded-lg border border-danger/20 bg-danger-tint p-3 text-sm text-danger-text">
                {lang === "ar" ? ticket.eta.reason_ar : ticket.eta.reason_en}
              </div>
            )}
            {ticket.sync_status === "queued" && ticket.eta?.window_remaining_hours !== undefined && (
              <div className="rounded-lg border border-warning/20 bg-warning-tint p-3 text-sm text-warning-text">
                {t("ticket.window_note", { h: ticket.eta.window_remaining_hours })}
              </div>
            )}
            {ticket.sync_status === "valid" && ticket.eta?.uuid && (
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground flex items-center gap-1.5" dir="ltr">
                <QrCode className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{ticket.eta.uuid}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {formatDate(new Date())} · {formatTime(new Date())}
            </p>
          </>
        )}
      </div>

      <TenderModal
        open={tenderOpen}
        onOpenChange={(o) => !o && setTenderOpen(false)}
        grandTotal={totals.payable}
        tax={totals.tax}
        onSettle={handleTenderSettle}
      />

      <ProductPickerDialog
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        lang={lang}
        qtyInTicket={qtyInTicket}
        onPick={handlePickProduct}
      />
    </div>
  );
}
