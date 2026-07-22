import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, Trash2, Save, ClipboardList, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { StatusPill } from "@/components/patterns/StatusPill";
import { TierPanel } from "@/components/wholesale/TierPanel";
import { CreditBar } from "@/components/wholesale/CreditBar";
import { CreditOverrideDialog } from "@/components/wholesale/CreditOverrideDialog";
import { TierPill } from "@/components/wholesale/TierPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import { useWholesaleOrders, nextOrderNumber } from "@/stores/wholesaleOrders";
import { useWholesaleCreditReservations } from "@/stores/wholesaleCreditReservations";
import { useWholesaleStockReservations } from "@/stores/wholesaleStockReservations";
import { useWholesaleCustomers } from "@/stores/wholesaleCustomers";
import {
  getItems, getUoms, getWarehouses, getReps, getRoutes,
  getPriceListLines, getPriceLists,
} from "@/lib/mock/wholesale";
import { resolvePrice, type ResolvedPrice } from "@/lib/wholesale/pricing";
import { getCreditSnapshot } from "@/lib/wholesale/credit";
import { buildOrderSchema, getOrderBlockers } from "./orderValidation";
import type {
  SalesOrder, SalesOrderStatus, WholesaleCustomer, PriceListLine,
} from "@/types/wholesale";

/** No tax-rate lookup exists in the wholesale fixture set — every seeded order's
 * totals imply a flat 14% VAT (e.g. so_1201: 1996.93 / 14263.8 = 0.14 exactly). */
const TAX_RATE = 0.14;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface OrderLineDraft {
  _key: string;
  item_id: string;
  qty: number;
  uom_id: string;
  discount: number;
  tax_type_id: string;
  price_overridden: boolean;
  override_price: number | null;
  /** Stored, as-loaded price/total — shown until the line is touched. */
  unit_price: number;
  line_total: number;
  /** True once the user has edited this line — from then on price/total are
   * always live-recomputed via resolvePrice, never the stale stored value. */
  _dirty: boolean;
}

function initLines(order: SalesOrder | undefined): OrderLineDraft[] {
  if (!order) return [];
  return order.lines.map((l) => ({
    _key: crypto.randomUUID(),
    item_id: l.item_id,
    qty: l.qty,
    uom_id: l.uom_id,
    discount: l.discount,
    tax_type_id: l.tax_type_id,
    price_overridden: false,
    override_price: null,
    unit_price: l.unit_price,
    line_total: l.line_total,
    _dirty: false,
  }));
}

function resolveLine(
  line: OrderLineDraft,
  customer: WholesaleCustomer | undefined,
  priceListLines: PriceListLine[],
): ResolvedPrice | null {
  if (!line.item_id || !customer?.price_list_id) return null;
  return resolvePrice({
    item: { id: line.item_id },
    qty: line.qty,
    uomId: line.uom_id,
    customer: { price_list_id: customer.price_list_id },
    priceLists: priceListLines,
  });
}

export function OrderEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const can = useCan();

  const orders = useWholesaleOrders((s) => s.orders);
  const addOrder = useWholesaleOrders((s) => s.addOrder);
  const updateOrder = useWholesaleOrders((s) => s.updateOrder);
  const reservations = useWholesaleCreditReservations((s) => s.reservations);
  const addReservation = useWholesaleCreditReservations((s) => s.addReservation);
  const addStockReservation = useWholesaleStockReservations((s) => s.addForOrder);

  const existingOrder = !isNew ? orders.find((o) => o.id === id) : undefined;

  const customers = useWholesaleCustomers((s) => s.customers);
  const items = useMemo(() => getItems(), []);
  const uoms = useMemo(() => getUoms(), []);
  const warehouses = useMemo(() => getWarehouses().filter((w) => w.type === "storage"), []);
  const reps = useMemo(() => getReps(), []);
  const routes = useMemo(() => getRoutes(), []);
  const priceListLines = useMemo(() => getPriceListLines(), []);
  const priceLists = useMemo(() => getPriceLists(), []);

  const uomLabel = (uomId: string) => {
    const u = uoms.find((x) => x.id === uomId);
    return u ? (lang === "ar" ? u.name_ar : u.name_en) : uomId;
  };

  const newIdRef = useRef(crypto.randomUUID());
  const orderId = existingOrder?.id ?? newIdRef.current;
  const [isPersisted, setIsPersisted] = useState(!!existingOrder);

  const [customerId, setCustomerId] = useState(existingOrder?.customer_id ?? "");
  const [warehouseId, setWarehouseId] = useState(existingOrder?.warehouse_id ?? warehouses[0]?.id ?? "");
  const [date, setDate] = useState(existingOrder?.date ?? todayStr());
  const [deliveryDate, setDeliveryDate] = useState(existingOrder?.delivery_date ?? "");
  const [repId, setRepId] = useState(existingOrder?.rep_id ?? "");
  const [routeId, setRouteId] = useState(existingOrder?.route_id ?? "");
  const [priceListId, setPriceListId] = useState(existingOrder?.price_list_id ?? "");
  const [lines, setLines] = useState<OrderLineDraft[]>(() => initLines(existingOrder));
  const [focusedLineKey, setFocusedLineKey] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const canOverridePrice = can("pricing.line.override");
  const canManageTier = can("pricing.tier.manage");
  const isReadOnly = !!existingOrder && existingOrder.status !== "draft";

  // Customer selection loads its price list (read-only unless pricing.tier.manage).
  useEffect(() => {
    if (selectedCustomer && !canManageTier) setPriceListId(selectedCustomer.price_list_id);
  }, [selectedCustomer, canManageTier]);

  function updateLine(key: string, patch: Partial<OrderLineDraft>) {
    setLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch, _dirty: true } : l)));
  }

  function selectItemForLine(key: string, itemId: string) {
    const item = items.find((i) => i.id === itemId);
    updateLine(key, { item_id: itemId, uom_id: item?.wholesale_uom ?? item?.base_uom ?? "uom_pc", price_overridden: false, override_price: null });
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), item_id: "", qty: 1, uom_id: "uom_pc", discount: 0, tax_type_id: "tax_t1", price_overridden: false, override_price: null, unit_price: 0, line_total: 0, _dirty: true },
    ]);
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l._key !== key));
    if (focusedLineKey === key) setFocusedLineKey(null);
  }

  // ── Totals ────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    for (const l of lines) {
      const resolved = resolveLine(l, selectedCustomer, priceListLines);
      const auto = resolved?.price ?? 0;
      const applied = l.price_overridden ? (l.override_price ?? auto) : auto;
      subtotal += l._dirty ? round2(l.qty * applied) : l.line_total;
      discount += l.discount;
    }
    const taxableBase = round2(subtotal - discount);
    const tax = round2(taxableBase * TAX_RATE);
    const grandTotal = round2(taxableBase + tax);
    return { subtotal: round2(subtotal), discount: round2(discount), taxableBase, tax, grandTotal };
  }, [lines, selectedCustomer, priceListLines]);

  const creditGuard = useCreditGuard(selectedCustomer, totals.grandTotal);
  const creditSnapshot = selectedCustomer ? getCreditSnapshot(selectedCustomer, reservations) : null;
  const availableAfter = creditSnapshot ? round2(creditSnapshot.available - totals.grandTotal) : null;

  // ── Validation ────────────────────────────────────────────────────
  const schema = useMemo(
    () => buildOrderSchema({ customer: selectedCustomer, priceListLines, items, lang, t }),
    [selectedCustomer, priceListLines, items, lang, t],
  );
  const blockers = useMemo(
    () => getOrderBlockers(
      { customer_id: customerId, warehouse_id: warehouseId, date, delivery_date: deliveryDate, lines },
      schema,
    ),
    [customerId, warehouseId, date, deliveryDate, lines, schema],
  );

  const focusedLine = lines.find((l) => l._key === focusedLineKey) ?? null;
  const focusedPriceListLine = focusedLine
    ? priceListLines.find((l) => l.price_list_id === priceListId && l.item_id === focusedLine.item_id)
    : undefined;
  const focusedResolved = focusedLine ? resolveLine(focusedLine, selectedCustomer, priceListLines) : null;

  if (!isNew && !existingOrder) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("order_editor.title_edit")} />
        <EmptyState
          icon={ClipboardList}
          title={t("order_editor.not_found")}
          description=""
          action={{ label: t("order_editor.back_to_list"), onClick: () => navigate("/wholesale/orders") }}
        />
      </div>
    );
  }

  function buildOrderObject(status: SalesOrderStatus): SalesOrder {
    return {
      id: orderId,
      number: existingOrder?.number ?? nextOrderNumber(orders),
      date,
      customer_id: customerId,
      warehouse_id: warehouseId,
      delivery_date: deliveryDate,
      rep_id: repId,
      route_id: routeId,
      price_list_id: priceListId,
      status,
      credit_reservation_id: existingOrder?.credit_reservation_id ?? null,
      lines: lines.map((l) => {
        const resolved = resolveLine(l, selectedCustomer, priceListLines);
        const auto = resolved?.price ?? 0;
        const applied = l.price_overridden ? (l.override_price ?? auto) : auto;
        return {
          item_id: l.item_id,
          qty: l.qty,
          uom_id: l.uom_id,
          unit_price: l._dirty ? applied : l.unit_price,
          tier_id: resolved?.tierId ?? null,
          discount: l.discount,
          tax_type_id: l.tax_type_id,
          line_total: l._dirty ? round2(l.qty * applied - l.discount) : l.line_total,
        };
      }),
      totals: {
        subtotal: totals.subtotal, discount: totals.discount, taxable_base: totals.taxableBase,
        tax: totals.tax, grand_total: totals.grandTotal,
      },
      delivered_pct: existingOrder?.delivered_pct ?? 0,
    };
  }

  function persist(status: SalesOrderStatus): SalesOrder {
    const obj = buildOrderObject(status);
    if (isPersisted) {
      updateOrder(orderId, obj);
    } else {
      addOrder(obj);
      setIsPersisted(true);
    }
    return obj;
  }

  function saveDraft() {
    persist("draft");
    toast.success(t("order_editor.saved_draft_toast"));
    navigate(`/wholesale/orders/${orderId}`, { replace: true });
  }

  function commitApprove() {
    persist("approved");
    const reservation = addReservation({ customer_id: customerId, order_id: orderId, amount: totals.grandTotal });
    updateOrder(orderId, { credit_reservation_id: reservation.id });
    addStockReservation(orderId, warehouseId, lines.map((l) => ({ item_id: l.item_id, qty: l.qty, uom_id: l.uom_id })));
    toast.success(t("order_editor.approved_toast"));
    navigate(`/wholesale/orders/${orderId}`, { replace: true });
  }

  function handleApproveClick() {
    if (blockers.length > 0 || !customerId || !warehouseId) return;
    if (!creditGuard.allowed) {
      if (creditGuard.mode === "override") creditGuard.requestOverride();
      return;
    }
    setApproving(true);
    commitApprove();
  }

  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;
  const approveDisabled = approving || blockers.length > 0 || !customerId || !warehouseId
    || (creditGuard.mode === "block" && !creditGuard.allowed);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={existingOrder ? existingOrder.number : t("order_editor.title_new")}
        subtitle={existingOrder ? t("order_editor.title_edit") : undefined}
        actions={
          <div className="flex items-center gap-2">
            {existingOrder && <StatusPill variant="default" label={t(`orders.status_${existingOrder.status}`)} />}
            <Button variant="ghost" size="sm" onClick={() => navigate("/wholesale/orders")}>
              <BackIcon className="h-4 w-4 me-1" />
              {t("order_editor.cancel_edit")}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4 min-w-0">
          {/* Header fields */}
          <PageSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label={t("order_editor.field_customer")} required>
                <Select value={customerId} onValueChange={setCustomerId} disabled={isReadOnly}>
                  <SelectTrigger><SelectValue placeholder={t("order_editor.select_customer")} /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{lang === "ar" ? c.name_ar : c.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("order_editor.field_warehouse")} required>
                <Select value={warehouseId} onValueChange={setWarehouseId} disabled={isReadOnly}>
                  <SelectTrigger><SelectValue placeholder={t("order_editor.select_warehouse")} /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("order_editor.field_date")} required>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isReadOnly} />
              </Field>

              <Field label={t("order_editor.field_delivery_date")} required>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} disabled={isReadOnly} />
              </Field>

              <Field label={t("order_editor.field_rep")}>
                <Select value={repId} onValueChange={setRepId} disabled={isReadOnly}>
                  <SelectTrigger><SelectValue placeholder={t("order_editor.select_rep")} /></SelectTrigger>
                  <SelectContent>
                    {reps.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{lang === "ar" ? r.name_ar : r.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("order_editor.field_route")}>
                <Select value={routeId} onValueChange={setRouteId} disabled={isReadOnly}>
                  <SelectTrigger><SelectValue placeholder={t("order_editor.select_route")} /></SelectTrigger>
                  <SelectContent>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{lang === "ar" ? r.name_ar : r.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("order_editor.field_price_list")}>
                {canManageTier ? (
                  <Select value={priceListId} onValueChange={setPriceListId} disabled={isReadOnly}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priceLists.map((pl) => (
                        <SelectItem key={pl.id} value={pl.id}>{lang === "ar" ? pl.name_ar : pl.name_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-10 px-3 flex items-center rounded border border-border bg-muted/30 text-sm text-muted-foreground">
                    {(() => {
                      const pl = priceLists.find((p) => p.id === priceListId);
                      return pl ? (lang === "ar" ? pl.name_ar : pl.name_en) : t("order_editor.no_price_list");
                    })()}
                  </div>
                )}
              </Field>
            </div>
          </PageSection>

          {/* Lines */}
          <PageSection title={t("order_editor.lines_title")} padded={false}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs">{t("order_editor.col_item")}</TableHead>
                  <TableHead className="text-xs w-24">{t("order_editor.col_qty")}</TableHead>
                  <TableHead className="text-xs w-32">{t("order_editor.col_unit")}</TableHead>
                  <TableHead className="text-xs w-40">{t("order_editor.col_price")}</TableHead>
                  <TableHead className="text-xs w-24">{t("order_editor.col_discount")}</TableHead>
                  <TableHead className="text-xs w-20">{t("order_editor.col_tax")}</TableHead>
                  <TableHead className="text-xs w-28">{t("order_editor.col_total")}</TableHead>
                  {!isReadOnly && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <LineRow
                    key={line._key}
                    line={line}
                    items={items}
                    uoms={uoms}
                    priceListLines={priceListLines}
                    customer={selectedCustomer}
                    canOverride={canOverridePrice}
                    readOnly={isReadOnly}
                    focused={line._key === focusedLineKey}
                    lang={lang}
                    t={t}
                    onFocus={() => setFocusedLineKey(line._key)}
                    onChange={(patch) => updateLine(line._key, patch)}
                    onSelectItem={(itemId) => selectItemForLine(line._key, itemId)}
                    onRemove={() => removeLine(line._key)}
                  />
                ))}
              </TableBody>
            </Table>
            {!isReadOnly && (
              <div className="p-3">
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 me-1.5" />
                  {t("order_editor.add_line")}
                </Button>
              </div>
            )}
          </PageSection>

          {/* Blockers */}
          {blockers.length > 0 && (
            <div className="space-y-1.5">
              {blockers.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs bg-warning-tint text-warning-text">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {b.message}
                </div>
              ))}
            </div>
          )}

          {/* Footer totals */}
          <PageSection>
            <div className="space-y-1.5 text-sm max-w-sm ms-auto">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("order_editor.subtotal")}</span>
                <span className="tabular-nums">{formatMoney(totals.subtotal, lang)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("order_editor.discount_total")}</span>
                <span className="tabular-nums">{formatMoney(totals.discount, lang)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("order_editor.tax_total")}</span>
                <span className="tabular-nums">{formatMoney(totals.tax, lang)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{t("order_editor.grand_total")}</span>
                <span className="tabular-nums">{formatMoney(totals.grandTotal, lang)}</span>
              </div>
              {creditSnapshot && availableAfter !== null && (
                <p className="text-xs text-muted-foreground pt-1">
                  {t("order_editor.credit_projection", {
                    available: formatMoney(availableAfter, lang),
                    limit: formatMoney(creditSnapshot.limit, lang),
                  })}
                </p>
              )}
              {creditGuard.message && (
                <p className={cn(
                  "text-xs rounded px-2 py-1.5 mt-1",
                  creditGuard.mode === "block" ? "bg-danger-tint text-danger-text" : "bg-warning-tint text-warning-text",
                )}>
                  {creditGuard.message}
                </p>
              )}
            </div>
          </PageSection>

          {!isReadOnly && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={saveDraft}>
                <Save className="h-4 w-4 me-1.5" />
                {t("order_editor.save_draft")}
              </Button>
              <Button onClick={handleApproveClick} disabled={approveDisabled}>
                {t("order_editor.approve")}
              </Button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {focusedLine && focusedPriceListLine && focusedResolved && (
            <TierPanel
              line={focusedPriceListLine}
              resolved={focusedResolved}
              qty={focusedLine.qty}
              unitLabel={uomLabel(focusedLine.uom_id)}
              tierUnitLabel={uomLabel(focusedPriceListLine.tier_uom)}
            />
          )}
          {selectedCustomer && (
            <PageSection>
              <CreditBar customer={selectedCustomer} reservations={reservations} pendingAmount={totals.grandTotal} />
            </PageSection>
          )}
        </div>
      </div>

      {selectedCustomer && (
        <CreditOverrideDialog
          open={creditGuard.overrideOpen}
          onOpenChange={(o) => !o && creditGuard.cancelOverride()}
          customer={selectedCustomer}
          amount={totals.grandTotal}
          excess={creditGuard.excess}
          canOverride={creditGuard.canOverride}
          onConfirm={() => { creditGuard.confirmOverride(); commitApprove(); }}
        />
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

interface LineRowProps {
  line: OrderLineDraft;
  items: ReturnType<typeof getItems>;
  uoms: ReturnType<typeof getUoms>;
  priceListLines: PriceListLine[];
  customer: WholesaleCustomer | undefined;
  canOverride: boolean;
  readOnly: boolean;
  focused: boolean;
  lang: "ar" | "en";
  t: (key: string, options?: Record<string, unknown>) => string;
  onFocus: () => void;
  onChange: (patch: Partial<OrderLineDraft>) => void;
  onSelectItem: (itemId: string) => void;
  onRemove: () => void;
}

function LineRow({
  line, items, uoms, priceListLines, customer, canOverride, readOnly, focused, lang, t,
  onFocus, onChange, onSelectItem, onRemove,
}: LineRowProps) {
  const item = items.find((i) => i.id === line.item_id);
  const resolved = resolveLine(line, customer, priceListLines);
  const autoPrice = resolved?.price ?? 0;
  const appliedPrice = line.price_overridden ? (line.override_price ?? autoPrice) : autoPrice;
  const displayPrice = line._dirty ? appliedPrice : line.unit_price;
  const displayTotal = line._dirty ? round2(line.qty * appliedPrice - line.discount) : line.line_total;

  const matchedLine = priceListLines.find((l) => l.item_id === line.item_id && l.price_list_id === customer?.price_list_id);
  const activeTier = resolved?.tierId ? matchedLine?.tiers.find((tr) => tr.id === resolved.tierId) : undefined;

  const [flash, setFlash] = useState(false);
  const prevPriceRef = useRef(displayPrice);
  useEffect(() => {
    if (prevPriceRef.current !== displayPrice) {
      if (line._dirty) {
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), 700);
        prevPriceRef.current = displayPrice;
        return () => clearTimeout(timer);
      }
      prevPriceRef.current = displayPrice;
    }
  }, [displayPrice, line._dirty]);

  const tierUnitLabel = matchedLine
    ? (lang === "ar"
      ? uoms.find((u) => u.id === matchedLine.tier_uom)?.name_ar
      : uoms.find((u) => u.id === matchedLine.tier_uom)?.name_en) ?? matchedLine.tier_uom
    : "";

  return (
    <TableRow onClick={onFocus} className={cn("cursor-pointer", focused && "bg-brand-tint/20")}>
      <TableCell className="min-w-40">
        <Select value={line.item_id} onValueChange={onSelectItem} disabled={readOnly}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("order_editor.select_item")} /></SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.id} value={i.id}>{lang === "ar" ? i.name_ar : i.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* ETA: unchanged from FE_02 — flag-don't-block, never disables the line (FE_13 §3.3). */}
        {item?._flag === "eta_code_missing" && (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-warning-text bg-warning-tint rounded px-1.5 py-0.5">
            <AlertTriangle className="h-3 w-3" />
            {t("order_editor.no_eta_code")}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Input
          type="number" min={0.01} step="any" value={line.qty} disabled={readOnly}
          onChange={(e) => onChange({ qty: parseFloat(e.target.value) || 0 })}
          className="h-8 text-xs tabular-nums w-20"
        />
      </TableCell>
      <TableCell>
        <Select value={line.uom_id} onValueChange={(v) => onChange({ uom_id: v })} disabled={readOnly}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {uoms.map((u) => (
              <SelectItem key={u.id} value={u.id}>{lang === "ar" ? u.name_ar : u.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className={cn("align-top", flash && "animate-price-flash")}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            {line.price_overridden && (
              <span className="text-xs text-muted-foreground line-through tabular-nums">{formatMoney(autoPrice, lang)}</span>
            )}
            {canOverride && !readOnly ? (
              <Input
                type="number" min={0} step="any"
                value={line.price_overridden ? (line.override_price ?? autoPrice) : autoPrice}
                onChange={(e) => onChange({ price_overridden: true, override_price: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs tabular-nums w-24"
              />
            ) : (
              <span className="text-sm tabular-nums font-medium">{formatMoney(displayPrice, lang)}</span>
            )}
          </div>
          {activeTier && <TierPill fromQty={activeTier.from_qty} unitLabel={tierUnitLabel} className="w-fit" />}
        </div>
      </TableCell>
      <TableCell>
        <Input
          type="number" min={0} step="any" value={line.discount} disabled={readOnly}
          onChange={(e) => onChange({ discount: parseFloat(e.target.value) || 0 })}
          className="h-8 text-xs tabular-nums w-20"
        />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">{Math.round(TAX_RATE * 100)}%</TableCell>
      <TableCell className="tabular-nums font-medium text-sm">{formatMoney(displayTotal, lang)}</TableCell>
      {!readOnly && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-danger" onClick={onRemove} aria-label={t("order_editor.remove_line")}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}
