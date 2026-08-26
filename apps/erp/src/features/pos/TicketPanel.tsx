import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  MoreVertical, Printer, Share2, RotateCcw, RefreshCw, User, Trash2,
  Plus, Minus, Percent, ChevronUp, ChevronDown, Scale, Flag, X, CheckCircle2, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusPill } from "@/components/patterns/StatusPill";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePosRegister, type PosCartLine } from "@/stores/posRegister";
import { computeCartTotals, lineTotal } from "./posTotals";
import { WeightEntryDialog } from "./WeightEntryDialog";
import { TenderModal } from "./TenderModal";
import { CustomerPickerDialog } from "./CustomerPickerDialog";
import { ParkedTicketsDialog } from "./ParkedTicketsDialog";
import type { PosItem } from "./useCashierCatalog";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";
import inventoryFixtures from "@/lib/mock/fixtures/Inventory.fixtures.json";

const LOYALTY = posFixtures.loyalty;

const TAX_TYPES = inventoryFixtures.tax_types as { id: string; name_ar: string; name_en: string; rate: number }[];
const TAX_RATES: Record<string, number> = Object.fromEntries(TAX_TYPES.map(tt => [tt.id, tt.rate]));
const TERMINAL_PREFIX = posFixtures.terminals[0].number_prefix;

function taxTypeName(id: string, lang: "ar" | "en") {
  const tt = TAX_TYPES.find(x => x.id === id);
  return tt ? (lang === "ar" ? tt.name_ar : tt.name_en) : id;
}

function LineDiscountPopover({ line, disabled }: { line: PosCartLine; disabled: boolean }) {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const setLineDiscount = usePosRegister(s => s.setLineDiscount);
  const [value, setValue] = useState(String(line.line_discount || ""));

  if (disabled) return null;

  return (
    <Popover onOpenChange={(o) => { if (o) setValue(String(line.line_discount || "")); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] rounded px-1.5 h-6 shrink-0",
            line.line_discount > 0 ? "bg-warning-tint text-warning-text" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Percent className="h-3 w-3" />
          {line.line_discount > 0 && <span className="tabular-nums">{formatMoney(line.line_discount, lang)}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("discount")}</p>
        <div className="flex items-center gap-1.5">
          <Input
            type="number" min="0" inputMode="decimal" className="h-8"
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <Button size="sm" className="h-8 shrink-0" onClick={() => setLineDiscount(line.id, parseFloat(value) || 0)}>
            {t("discount")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CartLineRow({ line, canDiscount, onEditWeight }: {
  line: PosCartLine;
  canDiscount: boolean;
  onEditWeight: (line: PosCartLine) => void;
}) {
  const { lang } = useAppearance();
  const updateQty = usePosRegister(s => s.updateQty);
  const removeLine = usePosRegister(s => s.removeLine);

  return (
    <div className="py-2 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate flex items-center gap-1">
            {line.name}
            {line.eta_code_missing && <Flag className="h-3 w-3 text-warning-text shrink-0" />}
          </p>
          {line.variant_label && <p className="text-[11px] text-muted-foreground">{line.variant_label}</p>}
        </div>
        <span className="tabular-nums text-sm font-semibold text-foreground shrink-0">
          {formatMoney(lineTotal(line), lang)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1.5">
        {line.sold_by === "weight" ? (
          <button
            type="button"
            onClick={() => onEditWeight(line)}
            className="inline-flex items-center gap-1 h-7 px-2 rounded border border-border text-xs font-medium text-foreground hover:bg-muted"
          >
            <Scale className="h-3 w-3" />
            <span className="tabular-nums">{line.weight_kg} {lang === "ar" ? "كجم" : "kg"}</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 rounded border border-border h-7">
            <button
              type="button"
              onClick={() => updateQty(line.id, (line.qty ?? 1) - 1)}
              className="flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="-"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-6 text-center text-xs font-semibold tabular-nums">{line.qty}</span>
            <button
              type="button"
              onClick={() => updateQty(line.id, (line.qty ?? 1) + 1)}
              className="flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="+"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          <LineDiscountPopover line={line} disabled={!canDiscount} />
          <button
            type="button"
            onClick={() => removeLine(line.id)}
            className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-danger-tint hover:text-danger-text"
            aria-label="delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TicketPanel() {
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();
  const can = useCan();

  const lines = usePosRegister(s => s.lines);
  const ticketDiscount = usePosRegister(s => s.ticketDiscount);
  const setTicketDiscount = usePosRegister(s => s.setTicketDiscount);
  const updateWeight = usePosRegister(s => s.updateWeight);
  const customer = usePosRegister(s => s.customer);
  const setCustomer = usePosRegister(s => s.setCustomer);
  const lastClosedTicket = usePosRegister(s => s.lastClosedTicket);
  const parkedTickets = usePosRegister(s => s.parkedTickets);
  const parkTicket = usePosRegister(s => s.parkTicket);

  const [expanded, setExpanded] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [parkedTicketsOpen, setParkedTicketsOpen] = useState(false);
  const [editingWeightLine, setEditingWeightLine] = useState<PosCartLine | null>(null);
  const [ticketDiscountInput, setTicketDiscountInput] = useState(String(ticketDiscount || ""));

  const canDiscount = can("pos.discount.override");
  const totals = useMemo(() => computeCartTotals(lines, ticketDiscount, TAX_RATES), [lines, ticketDiscount]);
  const hasLines = lines.length > 0;
  const loyaltyMember = customer ? LOYALTY.members.find(m => m.customer_id === customer.id) : undefined;
  const availableCredit = customer ? Math.max(0, customer.credit_limit - customer.ar_balance) : 0;

  const stub = (message: string) => toast.info(message);

  const editingItem: PosItem | null = editingWeightLine ? {
    item_id: editingWeightLine.item_id,
    name_ar: editingWeightLine.name,
    name_en: editingWeightLine.name,
    price_per_kg: editingWeightLine.price,
    tax_type_id: editingWeightLine.tax_type_id,
    uom_id: editingWeightLine.uom_id,
    eta_code: editingWeightLine.eta_code_missing ? "" : "x",
    sold_by: "weight",
    category: "",
  } : null;

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 border-border bg-card z-20",
        "fixed inset-x-0 bottom-0 border-t rounded-t-xl shadow-lg overflow-hidden",
        "transition-[max-height] duration-200 ease-brand",
        expanded ? "max-h-[70vh]" : "max-h-16",
        "lg:static lg:inset-auto lg:rounded-none lg:shadow-none lg:border-t-0 lg:border-s",
        "lg:w-[380px] lg:max-h-none lg:overflow-visible"
      )}
    >
      {/* Peek bar — small screens only, collapsed state */}
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="lg:hidden flex items-center justify-between h-16 px-4 shrink-0 w-full"
        >
          <span className="text-sm font-semibold text-foreground">{t("layout.ticket_placeholder_title")}</span>
          <span className="flex items-center gap-3">
            <span className="tabular-nums font-bold text-foreground">{formatMoney(totals.grandTotal, lang)}</span>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </span>
        </button>
      )}

      <div className={cn("flex-col min-h-0", expanded ? "flex flex-1" : "hidden lg:flex lg:flex-1")}>
        {/* Header — ticket no + kebab */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="lg:hidden shrink-0 text-muted-foreground"
              aria-label={tCommon("close")}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-foreground truncate">
              {TERMINAL_PREFIX} · {t("ticket.draft")}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="icon" size="icon" className="h-8 w-8 relative"
              onClick={() => setParkedTicketsOpen(true)}
              aria-label={t("parked.title")}
              title={t("parked.title")}
            >
              <Timer className="h-4 w-4" />
              {parkedTickets.length > 0 && (
                <span className="absolute -top-1 -end-1 flex items-center justify-center h-4 min-w-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tabular-nums">
                  {parkedTickets.length}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="icon" size="icon" className="h-8 w-8 shrink-0" disabled={!hasLines} aria-label="menu">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => stub(t("ticket.stub_action"))}>
                  <Printer className="h-4 w-4 me-2" /> {t("ticket.kebab.print")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => stub(t("ticket.stub_action"))}>
                  <Share2 className="h-4 w-4 me-2" /> {t("ticket.kebab.share")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => stub(t("ticket.stub_action"))}>
                  <RotateCcw className="h-4 w-4 me-2" /> {t("ticket.kebab.return")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => stub(t("ticket.stub_action"))}>
                  <RefreshCw className="h-4 w-4 me-2" /> {t("ticket.kebab.resend_eta")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Customer chip — walk-in default, or linked customer with loyalty/credit context */}
        <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCustomerPickerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent min-w-0"
          >
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : t("walk_in")}</span>
          </button>

          {customer ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex flex-col items-end text-[10px] text-muted-foreground leading-tight">
                {loyaltyMember && (
                  <span>{t("customer_chip.loyalty", { points: loyaltyMember.points_balance, value: formatMoney(loyaltyMember.redeemable_value_egp, lang) })}</span>
                )}
                <span>{t("customer_chip.available_credit", { amount: formatMoney(availableCredit, lang) })}</span>
              </div>
              <button
                type="button"
                onClick={() => setCustomer(null)}
                className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:bg-danger-tint hover:text-danger-text shrink-0"
                aria-label={t("customer_chip.change")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Lines */}
        <div className="flex-1 min-h-0 overflow-auto px-4">
          {hasLines ? (
            lines.map(line => (
              <CartLineRow key={line.id} line={line} canDiscount={canDiscount} onEditWeight={setEditingWeightLine} />
            ))
          ) : lastClosedTicket ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-2">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm font-semibold text-foreground">{t("closed.title")}</p>
              <p className="text-lg font-bold tabular-nums">{formatMoney(lastClosedTicket.grandTotal, lang)}</p>
              <div className="flex items-center gap-1.5">
                <StatusPill variant={lastClosedTicket.paymentStatus} label={t(`ticket.status.${lastClosedTicket.paymentStatus}`)} />
                <StatusPill variant={lastClosedTicket.syncStatus === "queued" ? "pending" : "default"} label={t(`ticket.status.${lastClosedTicket.syncStatus}`)} />
              </div>
              {lastClosedTicket.loyaltyEarned > 0 && (
                <p className="text-xs text-success-text">{t("tender.earned_toast", { n: lastClosedTicket.loyaltyEarned })}</p>
              )}
              <p className="text-xs text-muted-foreground pt-2">{t("closed.new_ticket_hint")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-1">
              <p className="text-sm font-medium text-foreground">{t("ticket.empty_title")}</p>
              <p className="text-xs text-muted-foreground">{t("ticket.empty_body")}</p>
            </div>
          )}
        </div>

        {/* Totals */}
        {hasLines && (
          <div className="px-4 py-2 border-t border-border shrink-0 space-y-1 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t("subtotal")}</span>
              <span className="tabular-nums">{formatMoney(totals.subtotal, lang)}</span>
            </div>

            {totals.lineDiscounts > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("discount")}</span>
                <span className="tabular-nums">-{formatMoney(totals.lineDiscounts, lang)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-muted-foreground">
              <Popover onOpenChange={(o) => { if (o) setTicketDiscountInput(String(ticketDiscount || "")); }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={!canDiscount}
                    className="hover:text-foreground disabled:pointer-events-none"
                  >
                    {t("ticket.discount")} ▾
                  </button>
                </PopoverTrigger>
                {canDiscount && (
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number" min="0" inputMode="decimal" className="h-8"
                        value={ticketDiscountInput}
                        onChange={e => setTicketDiscountInput(e.target.value)}
                      />
                      <Button size="sm" className="h-8 shrink-0" onClick={() => setTicketDiscount(parseFloat(ticketDiscountInput) || 0)}>
                        {tCommon("save")}
                      </Button>
                    </div>
                  </PopoverContent>
                )}
              </Popover>
              <span className="tabular-nums">-{formatMoney(totals.ticketDiscount, lang)}</span>
            </div>

            {totals.taxByType.map(g => (
              <div key={g.tax_type_id} className="flex items-center justify-between text-muted-foreground">
                <span>{taxTypeName(g.tax_type_id, lang)}</span>
                <span className="tabular-nums">{formatMoney(g.amount, lang)}</span>
              </div>
            ))}

            <div className="flex items-center justify-between font-bold text-foreground pt-1 border-t border-border">
              <span>{t("layout.grand_total")}</span>
              <span className="tabular-nums">{formatMoney(totals.grandTotal, lang)}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-border shrink-0 space-y-2">
          <Button
            variant="solid" tone="primary" size="lg" className="w-full h-11"
            disabled={!hasLines}
            onClick={() => setPayOpen(true)}
          >
            {t("pay")}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline" size="sm" className="h-11" disabled={!hasLines}
              onClick={() => { parkTicket(); toast.success(t("parked.parked_toast")); }}
            >
              {t("park")}
            </Button>
            <Button variant="outline" size="sm" className="h-11" onClick={() => setCustomerPickerOpen(true)}>
              {t("customer")}
            </Button>
          </div>
        </div>
      </div>

      <TenderModal open={payOpen} onOpenChange={setPayOpen} grandTotal={totals.grandTotal} tax={totals.tax} />

      <CustomerPickerDialog
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        onPick={setCustomer}
      />

      <ParkedTicketsDialog
        open={parkedTicketsOpen}
        onOpenChange={setParkedTicketsOpen}
        hasActiveTicket={hasLines}
      />

      <WeightEntryDialog
        item={editingItem}
        open={!!editingWeightLine}
        initialWeight={editingWeightLine?.weight_kg}
        onOpenChange={(o) => !o && setEditingWeightLine(null)}
        onConfirm={(weightKg) => {
          if (editingWeightLine) updateWeight(editingWeightLine.id, weightKg);
        }}
      />
    </aside>
  );
}
