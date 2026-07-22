import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { formatMoney } from "@/lib/format";
import { getCreditSnapshot, creditTone, type CreditTone } from "@/lib/wholesale/credit";
import type { WholesaleCustomer, CreditReservation } from "@/types/wholesale";

const BAR_TONE: Record<CreditTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const TEXT_TONE: Record<CreditTone, string> = {
  success: "text-success-text",
  warning: "text-warning-text",
  danger: "text-danger-text",
};

interface CreditBarProps {
  customer: WholesaleCustomer;
  reservations: CreditReservation[];
  /** Current cart/order total, not yet reserved — projects "available after"
   * live as qty changes (FE_13 §3.2 cart header / §5 order-editor footer). */
  pendingAmount?: number;
  className?: string;
}

/** limit / used / available credit bar — live-updating, 3 tones (FE_13 §3.2/§5). */
export function CreditBar({ customer, reservations, pendingAmount = 0, className }: CreditBarProps) {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();

  const snapshot = getCreditSnapshot(customer, reservations);
  const projectedAvailable = Math.round((snapshot.available - pendingAmount) * 100) / 100;
  const projectedUsedPct = snapshot.limit > 0
    ? (snapshot.used + snapshot.reserved + pendingAmount) / snapshot.limit
    : 0;
  const tone = creditTone({ ...snapshot, available: projectedAvailable, usedPct: projectedUsedPct });
  const pct = Math.min(Math.max(projectedUsedPct, 0), 1) * 100;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{t("credit_bar.label")}</span>
        <span className={cn("font-medium tabular-nums", TEXT_TONE[tone])}>
          {formatMoney(Math.max(projectedAvailable, 0), lang)} / {formatMoney(snapshot.limit, lang)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", BAR_TONE[tone])} style={{ width: `${pct}%` }} />
      </div>
      {tone === "danger" && (
        <p className="text-xs text-danger-text">{t("credit_bar.breach")}</p>
      )}
    </div>
  );
}
