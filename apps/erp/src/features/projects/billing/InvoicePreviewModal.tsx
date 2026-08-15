import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { computeInvoiceTotals } from "@/features/projects/detail/ledger";

export interface PreviewLine {
  id: string;
  label: string;
  meta?: string;
  amount: number;
}

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: PreviewLine[];
  onConfirm: () => void;
}

/** Reused by both the Milestone and T&M generate flows (spec §9.6) — preview only, confirm posts. */
export function InvoicePreviewModal({ open, onOpenChange, lines, onConfirm }: InvoicePreviewModalProps) {
  const { t } = useTranslation(["projects", "common"]);
  const { lang } = useAppearance();
  const totals = computeInvoiceTotals(lines.map((l) => l.amount));

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("bill.generate")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={onConfirm}>{t("common:confirm")}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="divide-y divide-border rounded border border-border max-h-64 overflow-y-auto">
          {lines.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm truncate">{l.label}</p>
                {l.meta && <p className="text-xs text-muted-foreground">{l.meta}</p>}
              </div>
              <span className="text-sm tabular-nums shrink-0">{formatMoney(l.amount, lang)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bill.subtotal")}</span>
            <span className="tabular-nums">{formatMoney(totals.subtotal, lang)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bill.tax")}</span>
            <span className="tabular-nums">{formatMoney(totals.tax, lang)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-border pt-1.5">
            <span>{t("bill.grand_total")}</span>
            <span className="tabular-nums">{formatMoney(totals.grand_total, lang)}</span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
