import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/format";
import type { InvoiceLine } from "@/stores/healthcareClinical";

interface InvoiceTabProps {
  lines: InvoiceLine[];
  total: number;
  insured: boolean;
  /** The plan's own coverage_pct (spec §4.7 wording quotes the plan rate, not the
   * post-co-pay effective %, which reads lower and would look like it contradicts
   * the split note right below it). */
  coveragePct: number;
  patientPortion: number;
  insurerPortion: number;
  splitNote: string;
  lang: "ar" | "en";
  /** Live preview (not yet finished) vs. the invoice's own persisted split. */
  isPreview: boolean;
}

/** Invoice tab (spec §4.3.4) — administrative, always visible regardless of clinical.view. */
export function InvoiceTab({ lines, total, insured, coveragePct, patientPortion, insurerPortion, splitNote, lang, isPreview }: InvoiceTabProps) {
  const { t } = useTranslation("healthcare");

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-foreground">{l.label_ar}</span>
            <span className="tabular-nums text-foreground">{formatMoney(l.amount, lang)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold bg-muted/40">
          <span>{t("encounter.invoice_total")}</span>
          <span className="tabular-nums">{formatMoney(total, lang)}</span>
        </li>
      </ul>

      {insured ? (
        <div className="rounded-lg bg-brand-tint border border-brand/20 p-3 space-y-1">
          <p className="text-sm font-medium text-brand-text">
            {t("encounter.invoice_covers", { pct: coveragePct, amount: formatMoney(patientPortion, lang) })}
          </p>
          <p className="text-xs text-brand-text/80">{splitNote}</p>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground">{t("encounter.invoice_insurer_portion")}</span>
            <span className="tabular-nums font-medium">{formatMoney(insurerPortion, lang)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("encounter.invoice_patient_portion")}</span>
            <span className="tabular-nums font-medium">{formatMoney(patientPortion, lang)}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm text-muted-foreground">{t("encounter.invoice_no_insurance")}</p>
        </div>
      )}

      {isPreview && (
        <p className="text-xs text-muted-foreground">{t("encounter.invoice_preview_note")}</p>
      )}
    </div>
  );
}
