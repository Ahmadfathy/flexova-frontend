import { useTranslation } from "react-i18next";
import { ShieldOff } from "lucide-react";
import { EmptyState } from "@/components/patterns/EmptyState";
import { formatMoney } from "@/lib/format";
import type { HcPayer, HcPlan, HcInvoice } from "@/features/healthcare/types";

interface InsuranceTabProps {
  payer: HcPayer | undefined;
  plan: HcPlan | undefined;
  invoices: HcInvoice[];
  lang: "ar" | "en";
}

/**
 * Insurance tab (spec §6.2, administrative — "remaining cap"). v1 approximation
 * (same caveat as the Encounter split engine in Prompt 2): annual caps aren't
 * backed by a running per-patient ledger with real period boundaries, so this
 * reads it as "cap minus insurer_portion already used on this patient's own
 * invoice history" rather than a true billing-cycle balance.
 */
export function InsuranceTab({ payer, plan, invoices, lang }: InsuranceTabProps) {
  const { t } = useTranslation("healthcare");

  if (!payer || !plan) {
    return <EmptyState icon={ShieldOff} title={t("encounter.uninsured_badge")} />;
  }

  const usedThisPeriod = invoices.filter((i) => i.plan_id === plan.id).reduce((sum, i) => sum + i.insurer_portion, 0);
  const remaining = plan.cap_type === "annual" ? Math.max(0, plan.cap_amount - usedThisPeriod) : plan.cap_amount;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">{payer.name_ar} — {plan.name_ar}</p>
        <p className="text-xs text-muted-foreground">
          {t("insurance.field_coverage_pct")}: {plan.coverage_pct}% · {t("insurance.field_copay")}: {plan.co_pay_type === "fixed" ? formatMoney(plan.co_pay_value, lang) : `${plan.co_pay_value}%`}
        </p>
      </div>
      <div className="rounded-lg bg-brand-tint border border-brand/20 p-3 flex items-center justify-between">
        <span className="text-sm font-medium text-brand-text">
          {t(plan.cap_type === "annual" ? "patient360.cap_remaining_annual" : "patient360.cap_per_visit")}
        </span>
        <span className="text-lg font-bold tabular-nums text-brand-text">{formatMoney(remaining, lang)}</span>
      </div>
      {plan.exclusions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{t("insurance.field_exclusions")}</p>
          <p className="text-sm text-foreground">{plan.exclusions.join("، ")}</p>
        </div>
      )}
    </div>
  );
}
