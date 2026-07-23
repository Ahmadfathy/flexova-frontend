import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Package, Plus, Minus, Trash2, AlertTriangle,
} from "lucide-react";

import { EmptyState } from "@/components/patterns/EmptyState";
import { CreditBar } from "@/components/wholesale/CreditBar";
import { TierPill } from "@/components/wholesale/TierPill";
import { TierHintBanner } from "@/components/wholesale/TierHintBanner";
import { CreditOverrideDialog } from "@/components/wholesale/CreditOverrideDialog";
import { VanReceiptDialog } from "./VanReceiptDialog";
import { GridDensity } from "@/features/pos/GridDensity";
import { TenderModal } from "@/features/pos/TenderModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import { usePosRegister, type PosCustomer } from "@/stores/posRegister";
import { GRID_DENSITY_MIN, GRID_DENSITY_MAX } from "@/stores/posTerminalSettings";
import { useVanSession } from "@/stores/vanSession";
import { useWholesaleVisits } from "@/stores/wholesaleVisits";
import { useWholesaleCustomers } from "@/stores/wholesaleCustomers";
import { useWholesaleCreditReservations } from "@/stores/wholesaleCreditReservations";
import { useWholesaleSyncQueue } from "@/stores/wholesaleSyncQueue";
import { useWholesaleVanSales, nextVanSaleNumber, type VanSale, type VanSaleLine } from "@/stores/wholesaleVanSales";
import {
  getItems, getUoms, getPriceListLines, getVanStock, getNoOrderReasons,
} from "@/lib/mock/wholesale";
import { resolvePrice, fromBase, type ResolvedPrice } from "@/lib/wholesale/pricing";
import type {
  WholesaleCustomer, WholesaleItem, Uom, PriceListLine, VanStockEntry,
} from "@/types/wholesale";

/** No tax-rate lookup exists in the wholesale fixture set — every seeded order's
 * totals imply a flat 14% VAT (matches OrderEditorPage's own assumption). */
const TAX_RATE = 0.14;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CartLine {
  _key: string;
  item_id: string;
  qty: number;
  uom_id: string;
  discount: number;
}

function resolveCartLine(
  line: CartLine,
  customer: WholesaleCustomer | undefined,
  priceListLines: PriceListLine[],
): ResolvedPrice | null {
  if (!customer?.price_list_id) return null;
  return resolvePrice({
    item: { id: line.item_id },
    qty: line.qty,
    uomId: line.uom_id,
    customer: { price_list_id: customer.price_list_id },
    priceLists: priceListLines,
  });
}

function toPosCustomer(c: WholesaleCustomer): PosCustomer {
  return { id: c.id, type: "company", name_ar: c.name_ar, name_en: c.name_en, credit_limit: c.credit_limit, ar_balance: c.ar_balance };
}

interface TenderSettleResult {
  tenders: Record<string, number>;
  paymentStatus: "paid" | "credit";
  syncStatus: "local" | "queued";
  loyaltyEarned: number;
  pointsRedeemed: number;
}

export function VanVisitPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("van");
  const { lang } = useAppearance();
  const can = useCan();

  const session = useVanSession();
  const visits = useWholesaleVisits((s) => s.visits);
  const updateVisit = useWholesaleVisits((s) => s.updateVisit);
  const customers = useWholesaleCustomers((s) => s.customers);
  const reservations = useWholesaleCreditReservations((s) => s.reservations);
  const enqueueSync = useWholesaleSyncQueue((s) => s.enqueue);
  const sales = useWholesaleVanSales((s) => s.sales);
  const addSale = useWholesaleVanSales((s) => s.addSale);

  const items = useMemo(() => getItems(), []);
  const uoms = useMemo(() => getUoms(), []);
  const priceListLines = useMemo(() => getPriceListLines(), []);
  const noOrderReasons = useMemo(() => getNoOrderReasons(), []);
  const vanStock = useMemo(
    () => getVanStock().filter((s) => s.warehouse_id === session.vanWarehouseId),
    [session.vanWarehouseId],
  );

  const visit = visits.find((v) => v.id === visitId);
  const customer = visit ? customers.find((c) => c.id === visit.customer_id) : undefined;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [density, setDensity] = useState(6);
  const [tenderOpen, setTenderOpen] = useState(false);
  const [noOrderOpen, setNoOrderOpen] = useState(false);
  const [noOrderReason, setNoOrderReason] = useState("");
  const [pendingSettle, setPendingSettle] = useState<TenderSettleResult | null>(null);
  const [receiptSale, setReceiptSale] = useState<VanSale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const creditCheckAmount = pendingSettle ? (pendingSettle.tenders.pm_credit ?? 0) : 0;
  const creditGuard = useCreditGuard(customer, creditCheckAmount);

  // Reset POS's shared "current ticket customer" (read internally by TenderModal)
  // when leaving so we never leak a wholesale customer into the retail register.
  useEffect(() => {
    return () => { usePosRegister.getState().setCustomer(null); };
  }, []);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    for (const l of cart) {
      const resolved = resolveCartLine(l, customer, priceListLines);
      subtotal += round2(l.qty * (resolved?.price ?? 0));
      discount += l.discount;
    }
    const taxableBase = round2(subtotal - discount);
    const tax = round2(taxableBase * TAX_RATE);
    const grandTotal = round2(taxableBase + tax);
    return { subtotal: round2(subtotal), discount: round2(discount), taxableBase, tax, grandTotal };
  }, [cart, customer, priceListLines]);

  useEffect(() => {
    if (!pendingSettle) return;
    const creditAmount = pendingSettle.tenders.pm_credit ?? 0;
    if (creditAmount <= 0) return;
    if (creditGuard.mode === "block" && !creditGuard.allowed) {
      toast.error(creditGuard.message ?? t("visit.credit_blocked_toast"));
      setPendingSettle(null);
      return;
    }
    if (creditGuard.mode === "override" && !creditGuard.allowed) {
      if (!creditGuard.overrideOpen) creditGuard.requestOverride();
      return;
    }
    if (creditGuard.allowed) {
      commitSale(pendingSettle);
      setPendingSettle(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSettle, creditGuard.mode, creditGuard.allowed]);

  if (!visit) {
    return (
      <div className="h-full overflow-auto p-4">
        <EmptyState icon={Package} title={t("visit.not_found")} description="" />
      </div>
    );
  }

  const activeVisit = visit;
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  function activateItem(itemId: string, qtyBase: number) {
    if (qtyBase <= 0) return;
    const item = items.find((i) => i.id === itemId);
    const uom = item?.wholesale_uom ?? item?.base_uom ?? "uom_pc";
    setCart((prev) => {
      const existing = prev.find((l) => l.item_id === itemId && l.uom_id === uom);
      if (existing) return prev.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { _key: crypto.randomUUID(), item_id: itemId, qty: 1, uom_id: uom, discount: 0 }];
    });
    setFocusedKey((prev) => prev ?? itemId);
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l._key !== key));
  }

  function handleCollect() {
    navigate(`/van/customer/${activeVisit.customer_id}/collect`);
  }

  function handleReturn() {
    toast.info(t("visit.return_stub_toast"));
  }

  function confirmNoOrder() {
    if (!noOrderReason) return;
    updateVisit(activeVisit.id, { status: "no_order", no_order_reason: noOrderReason });
    enqueueSync({ op: "visit_update", shift_id: session.vanWarehouseId ?? "", client_uuid: crypto.randomUUID() });
    toast.success(t("visit.no_order_success"));
    navigate("/van/today");
  }

  function openTender() {
    if (cart.length === 0) {
      toast.error(t("visit.cart_empty_error"));
      return;
    }
    usePosRegister.getState().setCustomer(customer ? toPosCustomer(customer) : null);
    setTenderOpen(true);
  }

  function handleSettle(result: TenderSettleResult) {
    const creditAmount = result.tenders.pm_credit ?? 0;
    if (creditAmount > 0) {
      setPendingSettle(result);
      return;
    }
    commitSale(result);
  }

  function commitSale(result: TenderSettleResult) {
    const lines: VanSaleLine[] = cart.map((l) => {
      const resolved = resolveCartLine(l, customer, priceListLines);
      const item = items.find((i) => i.id === l.item_id);
      const price = resolved?.price ?? 0;
      return {
        item_id: l.item_id,
        qty: l.qty,
        uom_id: l.uom_id,
        price,
        discount: l.discount,
        line_total: round2(l.qty * price - l.discount),
        eta_code_missing: !item?.eta_code,
      };
    });
    const needsEtaFix = lines.some((l) => l.eta_code_missing);

    const sale: VanSale = {
      id: crypto.randomUUID(),
      number: nextVanSaleNumber(sales),
      visit_id: activeVisit.id,
      customer_id: activeVisit.customer_id,
      rep_id: activeVisit.rep_id,
      date: todayStr(),
      lines,
      totals: { subtotal: totals.subtotal, discount: totals.discount, taxable_base: totals.taxableBase, tax: totals.tax, grand_total: totals.grandTotal },
      tenders: result.tenders,
      needs_eta_fix: needsEtaFix,
    };

    addSale(sale);
    updateVisit(activeVisit.id, { status: "sold", doc_id: sale.id });
    enqueueSync({ op: "sale", shift_id: session.vanWarehouseId ?? "", client_uuid: crypto.randomUUID() });

    setCart([]);
    setReceiptSale(sale);
    setReceiptOpen(true);
    toast.success(t("visit.sale_success_toast"));
  }

  const focusedLine = cart.find((l) => l._key === focusedKey) ?? null;
  const focusedResolved = focusedLine ? resolveCartLine(focusedLine, customer, priceListLines) : null;

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Inline-start pane (~62%) — product grid, sourced from van stock */}
      <div className="flex-[62] min-w-0 min-h-0 flex flex-col border-e border-border overflow-hidden">
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card">
          <Button variant="ghost" size="sm" onClick={() => navigate("/van/today")}>
            <BackIcon className="h-4 w-4 me-1" />
            {t("visit.back_to_today")}
          </Button>
          <GridDensity value={density} onChange={(n) => setDensity(Math.min(GRID_DENSITY_MAX, Math.max(GRID_DENSITY_MIN, n)))} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-3">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))` }}>
            {vanStock.map((stock) => {
              const item = items.find((i) => i.id === stock.item_id);
              if (!item) return null;
              return (
                <VanProductTile
                  key={item.id}
                  item={item}
                  stock={stock}
                  uoms={uoms}
                  customer={customer}
                  priceListLines={priceListLines}
                  lang={lang}
                  cartQty={cart.filter((l) => l.item_id === item.id).reduce((s, l) => s + l.qty, 0)}
                  onActivate={() => activateItem(item.id, stock.qty_base)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Inline-end pane (~38%) — cart */}
      <div className="flex-[38] min-w-0 min-h-0 flex flex-col overflow-hidden bg-card">
        <div className="shrink-0 p-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : "—"}
            </span>
            {customer && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {t(`visit.type_${customer.type}`, { defaultValue: customer.type })}
              </Badge>
            )}
          </div>
          {customer && <CreditBar customer={customer} reservations={reservations} pendingAmount={totals.grandTotal} />}
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("visit.cart_empty")}</p>
          ) : (
            cart.map((line) => (
              <VanCartLineRow
                key={line._key}
                line={line}
                item={items.find((i) => i.id === line.item_id)}
                uoms={uoms}
                priceListLines={priceListLines}
                customer={customer}
                focused={line._key === focusedKey}
                canDiscount={can("pricing.line.discount")}
                lang={lang}
                t={t}
                onFocus={() => setFocusedKey(line._key)}
                onChange={(patch) => updateLine(line._key, patch)}
                onRemove={() => removeLine(line._key)}
              />
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-border p-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("visit.subtotal")}</span>
            <span className="tabular-nums">{formatMoney(totals.subtotal, lang)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("visit.discount_total")}</span>
            <span className="tabular-nums">{formatMoney(totals.discount, lang)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("visit.tax_total")}</span>
            <span className="tabular-nums">{formatMoney(totals.tax, lang)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-1 border-t border-border">
            <span>{t("visit.grand_total")}</span>
            <span className="tabular-nums">{formatMoney(totals.grandTotal, lang)}</span>
          </div>
        </div>

        <div className="shrink-0 grid grid-cols-2 gap-2 p-3 border-t border-border">
          <Button variant="outline" onClick={handleCollect}>{t("visit.action_collect")}</Button>
          <Button variant="outline" onClick={handleReturn}>{t("visit.action_return")}</Button>
          <Button variant="outline" onClick={() => setNoOrderOpen(true)}>{t("visit.action_no_order")}</Button>
          <Button onClick={openTender} disabled={cart.length === 0}>{t("visit.action_settle")}</Button>
        </div>
      </div>

      {focusedLine && focusedResolved?.nextTier && (
        <div className="hidden">{/* placeholder to keep TS happy if unused in some branch */}</div>
      )}

      <TenderModal open={tenderOpen} onOpenChange={setTenderOpen} grandTotal={totals.grandTotal} tax={totals.tax} onSettle={handleSettle} />

      {customer && (
        <CreditOverrideDialog
          open={creditGuard.overrideOpen}
          onOpenChange={(o) => !o && creditGuard.cancelOverride()}
          customer={customer}
          amount={creditCheckAmount}
          excess={creditGuard.excess}
          canOverride={creditGuard.canOverride}
          onConfirm={() => creditGuard.confirmOverride()}
        />
      )}

      <VanReceiptDialog sale={receiptSale} customer={customer} open={receiptOpen} onOpenChange={setReceiptOpen} lang={lang} />

      <ConfirmDialog
        open={noOrderOpen}
        onOpenChange={(o) => { setNoOrderOpen(o); if (!o) setNoOrderReason(""); }}
        title={t("visit.action_no_order")}
        confirmLabel={t("visit.no_order_confirm")}
        confirmDisabled={!noOrderReason}
        onConfirm={confirmNoOrder}
      >
        <Select value={noOrderReason} onValueChange={setNoOrderReason}>
          <SelectTrigger><SelectValue placeholder={t("visit.no_order_reason_placeholder")} /></SelectTrigger>
          <SelectContent>
            {noOrderReasons.map((r) => (
              <SelectItem key={r.id} value={r.id}>{lang === "ar" ? r.name_ar : r.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ConfirmDialog>
    </div>
  );
}

// ── Product tile ──────────────────────────────────────────────────────

interface VanProductTileProps {
  item: WholesaleItem;
  stock: VanStockEntry;
  uoms: Uom[];
  customer: WholesaleCustomer | undefined;
  priceListLines: PriceListLine[];
  lang: "ar" | "en";
  cartQty: number;
  onActivate: () => void;
}

function VanProductTile({ item, stock, uoms, customer, priceListLines, lang, cartQty, onActivate }: VanProductTileProps) {
  const { t } = useTranslation("van");
  const sellUom = item.wholesale_uom ?? item.base_uom;
  const qtyInSellUom = fromBase(stock.qty_base, sellUom);
  const disabled = stock.qty_base <= 0;
  const etaMissing = !item.eta_code;

  const resolved = customer?.price_list_id
    ? resolvePrice({ item: { id: item.id }, qty: 1, uomId: sellUom, customer: { price_list_id: customer.price_list_id }, priceLists: priceListLines })
    : null;
  const unitLabel = (lang === "ar" ? uoms.find((u) => u.id === sellUom)?.name_ar : uoms.find((u) => u.id === sellUom)?.name_en) ?? sellUom;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onActivate}
      className={cn(
        "group relative flex h-[168px] w-full flex-col overflow-hidden rounded-lg border border-border bg-card p-2 text-start transition-colors",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:border-brand/40 hover:shadow-sm",
      )}
    >
      <div className="relative h-14 w-full shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
        <Package className="h-6 w-6 text-muted-foreground" />
        {disabled && (
          <span className="absolute inset-x-0 bottom-0 bg-muted text-muted-foreground text-[9px] font-semibold text-center py-0.5">
            {t("visit.oos_label")}
          </span>
        )}
      </div>

      <div className="flex h-4 shrink-0 items-center gap-1 mt-1 overflow-hidden">
        {etaMissing && (
          <span className="inline-flex items-center gap-0.5 rounded bg-warning-tint text-warning-text text-[10px] font-medium px-1 py-0.5 shrink-0">
            <AlertTriangle className="h-2.5 w-2.5" />
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{lang === "ar" ? item.name_ar : item.name_en}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {disabled ? t("visit.oos_label") : `${qtyInSellUom} ${unitLabel}`}
        </p>
      </div>

      <div className="mt-auto flex shrink-0 items-center justify-between gap-1 pt-1.5">
        <span className="min-w-0 flex-1 text-sm font-bold tabular-nums text-foreground truncate">
          {resolved ? formatMoney(resolved.price, lang) : "—"}
        </span>
        {cartQty > 0 ? (
          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold tabular-nums text-on-brand">
            {cartQty}
          </span>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-brand-tint group-hover:text-brand-text">
            <Plus className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </button>
  );
}

// ── Cart line row ─────────────────────────────────────────────────────

interface VanCartLineRowProps {
  line: CartLine;
  item: WholesaleItem | undefined;
  uoms: Uom[];
  priceListLines: PriceListLine[];
  customer: WholesaleCustomer | undefined;
  focused: boolean;
  canDiscount: boolean;
  lang: "ar" | "en";
  t: (key: string, options?: Record<string, unknown>) => string;
  onFocus: () => void;
  onChange: (patch: Partial<CartLine>) => void;
  onRemove: () => void;
}

function VanCartLineRow({
  line, item, uoms, priceListLines, customer, focused, canDiscount, lang, t,
  onFocus, onChange, onRemove,
}: VanCartLineRowProps) {
  const resolved = resolveCartLine(line, customer, priceListLines);
  const price = resolved?.price ?? 0;
  const lineTotal = round2(line.qty * price - line.discount);

  const matchedLine = priceListLines.find((l) => l.item_id === line.item_id && l.price_list_id === customer?.price_list_id);
  const activeTier = resolved?.tierId ? matchedLine?.tiers.find((tr) => tr.id === resolved.tierId) : undefined;
  const tierUnitLabel = matchedLine
    ? ((lang === "ar" ? uoms.find((u) => u.id === matchedLine.tier_uom)?.name_ar : uoms.find((u) => u.id === matchedLine.tier_uom)?.name_en) ?? matchedLine.tier_uom)
    : "";
  const sellUnitLabel = (lang === "ar" ? uoms.find((u) => u.id === line.uom_id)?.name_ar : uoms.find((u) => u.id === line.uom_id)?.name_en) ?? line.uom_id;

  const [flash, setFlash] = useState(false);
  const prevPriceRef = useRef(price);
  useEffect(() => {
    if (prevPriceRef.current !== price) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 700);
      prevPriceRef.current = price;
      return () => clearTimeout(timer);
    }
  }, [price]);

  return (
    <div
      onClick={onFocus}
      className={cn("rounded border border-border p-2 space-y-1.5 cursor-pointer", focused && "bg-brand-tint/20 border-brand/30")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate flex items-center gap-1">
          {item ? (lang === "ar" ? item.name_ar : item.name_en) : line.item_id}
          {item && !item.eta_code && <AlertTriangle className="h-3 w-3 text-warning-text shrink-0" />}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-danger shrink-0" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center rounded border border-border h-8">
          <button type="button" className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted" onClick={() => onChange({ qty: Math.max(1, round2(line.qty - 1)) })}>
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-10 text-center text-xs tabular-nums">{line.qty}</span>
          <button type="button" className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted" onClick={() => onChange({ qty: round2(line.qty + 1) })}>
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <Select value={line.uom_id} onValueChange={(v) => onChange({ uom_id: v })}>
          <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {uoms.map((u) => (
              <SelectItem key={u.id} value={u.id}>{lang === "ar" ? u.name_ar : u.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className={cn("flex items-center gap-1.5 rounded px-1", flash && "animate-price-flash")}>
          <span className="text-sm font-medium tabular-nums">{formatMoney(price, lang)}</span>
          {activeTier && <TierPill fromQty={activeTier.from_qty} unitLabel={tierUnitLabel} />}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        {canDiscount ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">{t("visit.col_discount")}</span>
            <Input
              type="number" min={0} step="any" value={line.discount}
              onChange={(e) => onChange({ discount: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs tabular-nums w-16"
            />
          </div>
        ) : (
          <span />
        )}
        <span className="text-sm font-semibold tabular-nums">{formatMoney(lineTotal, lang)}</span>
      </div>

      {resolved?.nextTier && (
        <div onClick={(e) => e.stopPropagation()}>
          <TierHintBanner
            currentQty={line.qty}
            nextTier={resolved.nextTier}
            unitLabel={sellUnitLabel}
            onApply={(newQty) => onChange({ qty: newQty })}
          />
        </div>
      )}
    </div>
  );
}
