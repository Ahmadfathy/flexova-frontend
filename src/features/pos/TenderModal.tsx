import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Banknote, CreditCard, Wallet, Smartphone, FileClock, Gift, Star, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePosRegister, type PosCustomer } from "@/stores/posRegister";
import { round2 } from "./posTotals";
import { CustomerPickerDialog } from "./CustomerPickerDialog";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";

interface TenderType {
  id: string;
  name_ar: string;
  name_en: string;
  gives_change: boolean;
  requires_customer?: boolean;
  credit_check?: boolean;
  requires_balance?: boolean;
}

interface StoreCreditVoucher {
  id: string;
  code: string;
  customer_id: string | null;
  balance: number;
  status: string;
}

const TENDER_TYPES = posFixtures.tender_types as TenderType[];
const VOUCHERS = posFixtures.store_credit_vouchers as StoreCreditVoucher[];
const LOYALTY = posFixtures.loyalty;

const METHOD_ICON: Record<string, LucideIcon> = {
  pm_cash: Banknote,
  pm_card: CreditCard,
  pm_wallet: Wallet,
  pm_fawry: Smartphone,
  pm_credit: FileClock,
  pm_store_credit: Gift,
  pm_loyalty: Star,
};

interface TenderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grandTotal: number;
}

export function TenderModal({ open, onOpenChange, grandTotal }: TenderModalProps) {
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();
  const can = useCan();
  const canOverrideCredit = can("crm.credit.override");

  const customer = usePosRegister(s => s.customer);
  const setCustomer = usePosRegister(s => s.setCustomer);
  const closeTicket = usePosRegister(s => s.closeTicket);

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [voucherCode, setVoucherCode] = useState("");
  const [resolvedVoucher, setResolvedVoucher] = useState<StoreCreditVoucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<string | null>(null);

  const reset = () => {
    setAmounts({});
    setVoucherCode("");
    setResolvedVoucher(null);
    setVoucherError(null);
    setPendingMethod(null);
  };

  const availableCredit = customer ? Math.max(0, customer.credit_limit - customer.ar_balance) : 0;
  const customerVoucher = customer
    ? VOUCHERS.find(v => v.customer_id === customer.id && v.status !== "used" && v.balance > 0)
    : undefined;
  const loyaltyMember = customer ? LOYALTY.members.find(m => m.customer_id === customer.id) : undefined;
  const loyaltyEligible = LOYALTY.enabled && !!customer && !!loyaltyMember && loyaltyMember.points_balance >= LOYALTY.min_redeem_points;

  const amountOf = (id: string) => parseFloat(amounts[id] || "0") || 0;
  const totalTendered = round2(Object.keys(amounts).reduce((s, id) => s + amountOf(id), 0));
  const cashAmount = amountOf("pm_cash");
  const creditAmount = amountOf("pm_credit");
  const overpay = Math.max(0, round2(totalTendered - grandTotal));
  const changeDue = Math.min(overpay, cashAmount);
  const remaining = Math.max(0, round2(grandTotal - totalTendered));
  const creditOverLimit = creditAmount > availableCredit + 0.005;
  const creditBlocked = creditOverLimit && !canOverrideCredit;

  const canConfirm = grandTotal > 0 && totalTendered >= grandTotal - 0.005 && !creditBlocked;

  function remainingExcluding(id: string) {
    const others = Object.keys(amounts).filter(k => k !== id).reduce((s, k) => s + amountOf(k), 0);
    return Math.max(0, round2(grandTotal - others));
  }

  function removeMethod(id: string) {
    setAmounts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (id === "pm_store_credit") {
      setVoucherCode("");
      setResolvedVoucher(null);
      setVoucherError(null);
    }
  }

  function activateMethod(tt: TenderType) {
    if (amounts[tt.id] != null) { removeMethod(tt.id); return; }

    if (tt.id === "pm_credit" && !customer) {
      setPendingMethod("pm_credit");
      setCustomerPickerOpen(true);
      return;
    }
    if (tt.id === "pm_loyalty" && !loyaltyEligible) return;

    const cap = remainingExcluding(tt.id);
    let amount = cap;
    if (tt.id === "pm_credit") amount = canOverrideCredit ? cap : Math.min(cap, availableCredit);
    if (tt.id === "pm_store_credit") amount = 0; // needs a resolved voucher first
    if (tt.id === "pm_loyalty" && loyaltyMember) amount = Math.min(cap, loyaltyMember.redeemable_value_egp);

    setAmounts(prev => ({ ...prev, [tt.id]: amount > 0 ? amount.toFixed(2) : "" }));
  }

  function checkVoucher(code?: string) {
    const search = (code ?? voucherCode).trim().toUpperCase();
    const voucher = VOUCHERS.find(v => v.code.toUpperCase() === search);
    if (!voucher || voucher.balance <= 0 || voucher.status === "used") {
      setResolvedVoucher(null);
      setVoucherError(t("tender.voucher_invalid"));
      setAmounts(prev => ({ ...prev, pm_store_credit: "" }));
      return;
    }
    setResolvedVoucher(voucher);
    setVoucherError(null);
    const cap = Math.min(remainingExcluding("pm_store_credit"), voucher.balance);
    setAmounts(prev => ({ ...prev, pm_store_credit: cap > 0 ? cap.toFixed(2) : "" }));
  }

  function handleCustomerPicked(c: PosCustomer) {
    setCustomer(c);
    if (pendingMethod === "pm_credit") {
      const cap = remainingExcluding("pm_credit");
      const avail = Math.max(0, c.credit_limit - c.ar_balance);
      const amount = canOverrideCredit ? cap : Math.min(cap, avail);
      setAmounts(prev => ({ ...prev, pm_credit: amount > 0 ? amount.toFixed(2) : "" }));
    }
    setPendingMethod(null);
  }

  function handleConfirm() {
    if (!canConfirm) return;

    const loyaltyAmount = amountOf("pm_loyalty");
    const pointsRedeemed = loyaltyMember && loyaltyAmount > 0
      ? Math.round(loyaltyAmount / LOYALTY.point_value_egp)
      : 0;
    const earnedPoints = customer && LOYALTY.enabled ? Math.floor(grandTotal / 100) : 0;
    const isOnline = navigator.onLine;
    const paymentStatus: "paid" | "credit" = creditAmount > 0 ? "credit" : "paid";
    const syncStatus: "local" | "queued" = isOnline ? "local" : "queued";

    closeTicket({ paymentStatus, syncStatus, grandTotal, loyaltyEarned: earnedPoints });

    toast.success(t("tender.closed_toast", { total: formatMoney(grandTotal, lang) }));
    if (earnedPoints > 0) toast.info(t("tender.earned_toast", { n: earnedPoints }));
    if (pointsRedeemed > 0) toast.info(t("tender.redeemed_toast", { n: pointsRedeemed }));

    reset();
    onOpenChange(false);
  }

  return (
    <>
      <ModalShell
        open={open}
        onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
        title={t("tender.title")}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {t("remaining")}: <span className="font-bold text-foreground tabular-nums">{formatMoney(remaining, lang)}</span>
              </span>
              {changeDue > 0 && (
                <span className="text-success-text">
                  {t("change_due")}: <span className="font-bold tabular-nums">{formatMoney(changeDue, lang)}</span>
                </span>
              )}
            </div>
            <Button size="lg" className="h-12 px-8" disabled={!canConfirm} onClick={handleConfirm}>
              {tCommon("confirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">{t("layout.grand_total")}</p>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(grandTotal, lang)}</p>
          </div>

          {/* Method grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {TENDER_TYPES.map(tt => {
              const Icon = METHOD_ICON[tt.id] ?? Banknote;
              const active = amounts[tt.id] != null;
              const disabled = tt.id === "pm_loyalty" && !loyaltyEligible;

              let hint: string | undefined;
              if (tt.id === "pm_loyalty" && disabled) {
                hint = !customer
                  ? t("tender.loyalty_no_customer")
                  : t("tender.loyalty_below_min", { min: LOYALTY.min_redeem_points });
              }

              return (
                <button
                  key={tt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => activateMethod(tt)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 min-h-20 rounded-lg border text-sm font-semibold transition-colors px-1 py-2",
                    disabled
                      ? "border-border bg-muted text-muted-foreground/50 cursor-not-allowed"
                      : active
                        ? "border-brand bg-brand-tint text-brand-text"
                        : "border-border hover:border-brand/40 hover:bg-muted text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="leading-tight text-center">{lang === "ar" ? tt.name_ar : tt.name_en}</span>
                  {hint && <span className="text-[10px] font-normal leading-tight text-center">{hint}</span>}
                </button>
              );
            })}
          </div>

          {/* Active method rows — mixed/split tender */}
          {Object.keys(amounts).length > 0 && (
            <div className="space-y-2">
              {TENDER_TYPES.filter(tt => amounts[tt.id] != null).map(tt => (
                <div key={tt.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{lang === "ar" ? tt.name_ar : tt.name_en}</span>
                    <button
                      type="button"
                      onClick={() => removeMethod(tt.id)}
                      className="flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:bg-danger-tint hover:text-danger-text"
                      aria-label="remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {tt.id === "pm_credit" && customer && (
                    <p className={cn(
                      "text-xs",
                      creditOverLimit ? (creditBlocked ? "text-danger-text" : "text-warning-text") : "text-muted-foreground"
                    )}>
                      {t("tender.available_credit", { amount: formatMoney(availableCredit, lang) })}
                      {creditOverLimit && ` — ${t(creditBlocked ? "tender.over_limit_blocked" : "tender.over_limit_warning")}`}
                    </p>
                  )}

                  {tt.id === "pm_store_credit" && (
                    <div className="space-y-1.5">
                      {customerVoucher && resolvedVoucher?.id !== customerVoucher.id && (
                        <button
                          type="button"
                          onClick={() => { setVoucherCode(customerVoucher.code); checkVoucher(customerVoucher.code); }}
                          className="block text-xs text-brand-text underline underline-offset-2"
                        >
                          {t("tender.voucher_use_customer", { amount: formatMoney(customerVoucher.balance, lang) })}
                        </button>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={voucherCode}
                          onChange={e => setVoucherCode(e.target.value)}
                          placeholder={t("tender.voucher_code_placeholder")}
                          className="h-9"
                        />
                        <Button type="button" size="sm" variant="outline" className="h-9 shrink-0" onClick={() => checkVoucher()}>
                          {t("tender.voucher_check")}
                        </Button>
                      </div>
                      {resolvedVoucher && (
                        <p className="text-xs text-success-text">
                          {t("tender.voucher_balance", { amount: formatMoney(resolvedVoucher.balance, lang) })}
                        </p>
                      )}
                      {voucherError && <p className="text-xs text-danger-text">{voucherError}</p>}
                    </div>
                  )}

                  {tt.id === "pm_loyalty" && loyaltyMember && (
                    <p className="text-xs text-muted-foreground">
                      {t("tender.loyalty_balance", {
                        points: loyaltyMember.points_balance,
                        value: formatMoney(loyaltyMember.redeemable_value_egp, lang),
                      })}
                    </p>
                  )}

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    disabled={tt.id === "pm_store_credit" && !resolvedVoucher}
                    value={amounts[tt.id]}
                    onChange={e => {
                      const raw = e.target.value;
                      if (raw === "") { setAmounts(prev => ({ ...prev, [tt.id]: "" })); return; }
                      let v = parseFloat(raw) || 0;
                      if (tt.id !== "pm_cash") v = Math.min(v, remainingExcluding(tt.id));
                      if (tt.id === "pm_credit" && !canOverrideCredit) v = Math.min(v, availableCredit);
                      if (tt.id === "pm_store_credit" && resolvedVoucher) v = Math.min(v, resolvedVoucher.balance);
                      if (tt.id === "pm_loyalty" && loyaltyMember) v = Math.min(v, loyaltyMember.redeemable_value_egp);
                      setAmounts(prev => ({ ...prev, [tt.id]: String(v) }));
                    }}
                    placeholder={t("tender.amount_placeholder")}
                    className="h-11 text-end tabular-nums text-base font-semibold"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalShell>

      <CustomerPickerDialog
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        onPick={handleCustomerPicked}
      />
    </>
  );
}
