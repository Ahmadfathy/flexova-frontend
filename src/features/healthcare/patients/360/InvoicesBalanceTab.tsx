import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { formatMoney } from "@/lib/format";
import type { HcInvoice } from "@/features/healthcare/types";

interface InvoicesBalanceTabProps {
  invoices: HcInvoice[];
  lang: "ar" | "en";
}

/**
 * Invoices & Balance tab (spec §6.2, administrative — "read from Accounting").
 * This mock layer doesn't have a separate Accounting fixture to join against,
 * so it reads straight off `useHealthcareClinical`'s invoices (the same
 * single source Today Board's collect flow reads) — it never recomputes a
 * split here, only aggregates the `patient_portion`/`collected` each invoice
 * already carries, honoring the golden rule in spirit.
 */
export function InvoicesBalanceTab({ invoices, lang }: InvoicesBalanceTabProps) {
  const { t } = useTranslation("healthcare");

  if (invoices.length === 0) {
    return <EmptyState icon={Receipt} title={t("patient360.invoices_empty")} />;
  }

  const balance = invoices.filter((i) => !i.collected).reduce((sum, i) => sum + i.patient_portion, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-brand-tint border border-brand/20 p-3 flex items-center justify-between">
        <span className="text-sm font-medium text-brand-text">{t("patient360.balance_due")}</span>
        <span className="text-lg font-bold tabular-nums text-brand-text">{formatMoney(balance, lang)}</span>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        {invoices.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{formatMoney(inv.total, lang)}</p>
              {inv.insured && (
                <p className="text-xs text-muted-foreground">{t("encounter.invoice_patient_portion")}: {formatMoney(inv.patient_portion, lang)}</p>
              )}
            </div>
            <StatusPill variant={inv.collected ? "approved" : "pending"} label={t(inv.collected ? "today.action_done" : "patient360.status_due")} />
          </li>
        ))}
      </ul>
    </div>
  );
}
