import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { usePosShift, expectedCashOf } from "@/stores/posShift";
import { tenderName } from "./tenderTypes";

interface XReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function XReportDialog({ open, onOpenChange }: XReportDialogProps) {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const shift = usePosShift();

  const expectedCash = expectedCashOf(shift);
  const tenderEntries = Object.entries(shift.byTender).filter(([, amount]) => amount > 0);

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("shift.xreport")}
      size="sm"
      footer={
        <Button variant="outline" onClick={() => toast.info(t("shift.printed_toast"))}>
          <Printer className="h-4 w-4 me-1.5" /> {t("ticket.kebab.print")}
        </Button>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-y-1.5">
          <span className="text-muted-foreground">{t("shift.cashier")}</span>
          <span className="text-end font-medium">{lang === "ar" ? shift.cashierAr : shift.cashierEn}</span>

          <span className="text-muted-foreground">{t("shift.opened_at")}</span>
          <span className="text-end tabular-nums">{shift.openedAt ? formatDate(shift.openedAt) : "—"}</span>

          <span className="text-muted-foreground">{t("shift.opening_float")}</span>
          <span className="text-end tabular-nums">{formatMoney(shift.openingFloat, lang)}</span>

          <span className="text-muted-foreground">{t("shift.sales_count")}</span>
          <span className="text-end tabular-nums">{shift.salesCount}</span>

          <span className="text-muted-foreground">{t("shift.returns_count")}</span>
          <span className="text-end tabular-nums">{shift.returnsCount}</span>
        </div>

        <div className="border-t border-border pt-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("shift.by_tender")}</p>
          {tenderEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            tenderEntries.map(([id, amount]) => (
              <div key={id} className="flex items-center justify-between">
                <span>{tenderName(id, lang)}</span>
                <span className="tabular-nums">{formatMoney(amount, lang)}</span>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border pt-2 grid grid-cols-2 gap-y-1.5">
          <span className="text-muted-foreground">{t("shift.tax_collected")}</span>
          <span className="text-end tabular-nums">{formatMoney(shift.taxCollected, lang)}</span>

          <span className="text-muted-foreground">{t("shift.paid_in_total")}</span>
          <span className="text-end tabular-nums">{formatMoney(shift.paidIn, lang)}</span>

          <span className="text-muted-foreground">{t("shift.paid_out_total")}</span>
          <span className="text-end tabular-nums">{formatMoney(shift.paidOut, lang)}</span>
        </div>

        <div className="border-t border-border pt-2 flex items-center justify-between font-bold">
          <span>{t("shift.expected")}</span>
          <span className="tabular-nums">{formatMoney(expectedCash, lang)}</span>
        </div>
      </div>
    </ModalShell>
  );
}
