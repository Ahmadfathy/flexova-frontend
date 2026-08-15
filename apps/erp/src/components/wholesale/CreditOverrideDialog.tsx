import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { useAppearance } from "@/stores/appearance";
import { formatMoney } from "@/lib/format";
import type { WholesaleCustomer } from "@/types/wholesale";

interface CreditOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: WholesaleCustomer;
  amount: number;
  excess: number;
  /** `sales.credit.override` — confirm is disabled without it. */
  canOverride: boolean;
  onConfirm: () => void;
}

/**
 * Override path of the credit guard (FE_13 §3.3) — AlertDialog gated on
 * `sales.credit.override`; the caller's onConfirm writes the audit entry.
 */
export function CreditOverrideDialog({
  open, onOpenChange, customer, amount, excess, canOverride, onConfirm,
}: CreditOverrideDialogProps) {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const name = lang === "ar" ? customer.name_ar : customer.name_en;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("credit_guard.override_dialog_title")}
      description={t("credit_guard.override_dialog_body", {
        name,
        excess: formatMoney(excess, lang),
        amount: formatMoney(amount, lang),
      })}
      confirmTone="warning"
      confirmLabel={t("credit_guard.override_confirm")}
      confirmDisabled={!canOverride}
      onConfirm={onConfirm}
    >
      {!canOverride && (
        <p className="text-xs text-danger-text bg-danger-tint rounded px-2 py-1.5">
          {t("credit_guard.no_permission")}
        </p>
      )}
    </ConfirmDialog>
  );
}
