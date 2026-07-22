import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppearance } from "@/stores/appearance";
import { useAuthStore } from "@/stores/auth";
import { useCan } from "@/lib/permissions";
import { formatMoney } from "@/lib/format";
import { useWholesaleAudit } from "@/stores/wholesaleAudit";
import { getCreditReservations } from "@/lib/mock/wholesale";
import { evaluateCreditPolicy } from "@/lib/wholesale/credit";
import type { WholesaleCustomer, CreditPolicy } from "@/types/wholesale";

export interface CreditGuardResult {
  allowed: boolean;
  mode: CreditPolicy;
  message: string | null;
  /** amount - availableCredit. Positive = insufficient. */
  excess: number;
  availableCredit: number;
  /** `sales.credit.override` — gates the override dialog's confirm action. */
  canOverride: boolean;
  overrideOpen: boolean;
  /** Opens the override AlertDialog (no-op unless mode==='override' and insufficient). */
  requestOverride: () => void;
  cancelOverride: () => void;
  /** Confirms the override — writes the audit entry, then unblocks the tender. */
  confirmOverride: () => void;
}

/**
 * Credit guard for credit/mixed-credit tender (FE_13 §3.3) and order approval (§5).
 * `warn` always allows with an inline message; `block` disallows outright with a
 * reason; `override` disallows until a permissioned user confirms, at which point
 * an audit entry is written (user, amount, excess) and the tender unblocks.
 */
export function useCreditGuard(customer: WholesaleCustomer | null | undefined, amount: number): CreditGuardResult {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const can = useCan();
  const authUser = useAuthStore((s) => s.user);
  const appendAudit = useWholesaleAudit((s) => s.append);

  const reservations = useMemo(() => getCreditReservations(), []);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overridden, setOverridden] = useState(false);

  const canOverride = can("sales.credit.override");

  const evaluation = customer
    ? evaluateCreditPolicy(customer, amount, reservations, overridden)
    : { allowed: true, mode: "warn" as CreditPolicy, excess: 0, availableCredit: 0, requiresOverrideConfirm: false };

  let message: string | null = null;
  if (customer && evaluation.excess > 0) {
    const excessLabel = formatMoney(evaluation.excess, lang);
    if (evaluation.mode === "warn") {
      message = t("credit_guard.warn_message", { excess: excessLabel });
    } else if (evaluation.mode === "block") {
      message = t("credit_guard.block_message");
    } else if (evaluation.mode === "override" && !overridden) {
      message = t("credit_guard.override_message", { excess: excessLabel });
    }
  }

  function requestOverride() {
    if (customer && evaluation.mode === "override" && evaluation.requiresOverrideConfirm) {
      setOverrideOpen(true);
    }
  }

  function cancelOverride() {
    setOverrideOpen(false);
  }

  function confirmOverride() {
    if (!customer || !canOverride) return;
    appendAudit({
      user: authUser?.id ?? "u_dev",
      action: "sales.credit.override",
      entity: customer.id,
      detail_ar: t("credit_guard.audit_detail_ar", { name: customer.name_ar, excess: formatMoney(evaluation.excess, "ar") }),
      detail_en: t("credit_guard.audit_detail_en", { name: customer.name_en, excess: formatMoney(evaluation.excess, "en") }),
    });
    setOverridden(true);
    setOverrideOpen(false);
  }

  return {
    allowed: evaluation.allowed,
    mode: evaluation.mode,
    message,
    excess: evaluation.excess,
    availableCredit: evaluation.availableCredit,
    canOverride,
    overrideOpen,
    requestOverride,
    cancelOverride,
    confirmOverride,
  };
}
