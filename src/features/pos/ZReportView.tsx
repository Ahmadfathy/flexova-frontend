import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, Printer, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/patterns/StatusPill";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import type { ClosedShiftSummary } from "@/stores/posShift";
import { tenderName } from "./tenderTypes";

const VARIANCE_VARIANT = {
  balanced: "approved",
  short: "rejected",
  over: "pending",
} as const;

interface ZReportViewProps {
  summary: ClosedShiftSummary;
  onStartNewShift: () => void;
}

export function ZReportView({ summary, onStartNewShift }: ZReportViewProps) {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();

  const tenderEntries = Object.entries(summary.byTender).filter(([, amount]) => amount > 0);

  return (
    <div className="max-w-lg w-full mx-auto space-y-4">
      <div className="flex flex-col items-center text-center gap-1.5">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-base font-semibold text-foreground">{t("shift.zreport")}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{summary.zReportNo}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-y-1.5">
          <span className="text-muted-foreground">{t("shift.cashier")}</span>
          <span className="text-end font-medium">{lang === "ar" ? summary.cashierAr : summary.cashierEn}</span>

          <span className="text-muted-foreground">{t("shift.opened_at")}</span>
          <span className="text-end tabular-nums">{formatDate(summary.openedAt)}</span>

          <span className="text-muted-foreground">{t("shift.closed_at")}</span>
          <span className="text-end tabular-nums">{formatDate(summary.closedAt)}</span>

          <span className="text-muted-foreground">{t("shift.opening_float")}</span>
          <span className="text-end tabular-nums">{formatMoney(summary.openingFloat, lang)}</span>

          <span className="text-muted-foreground">{t("shift.sales_count")}</span>
          <span className="text-end tabular-nums">{summary.salesCount}</span>

          <span className="text-muted-foreground">{t("shift.returns_count")}</span>
          <span className="text-end tabular-nums">{summary.returnsCount}</span>
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
          <span className="text-end tabular-nums">{formatMoney(summary.taxCollected, lang)}</span>

          <span className="text-muted-foreground">{t("shift.paid_in_total")}</span>
          <span className="text-end tabular-nums">{formatMoney(summary.paidIn, lang)}</span>

          <span className="text-muted-foreground">{t("shift.paid_out_total")}</span>
          <span className="text-end tabular-nums">{formatMoney(summary.paidOut, lang)}</span>
        </div>

        <div className="border-t border-border pt-2 grid grid-cols-2 gap-y-1.5">
          <span className="text-muted-foreground">{t("shift.expected")}</span>
          <span className="text-end tabular-nums">{formatMoney(summary.expectedCash, lang)}</span>

          <span className="text-muted-foreground">{t("shift.counted")}</span>
          <span className="text-end tabular-nums">{formatMoney(summary.countedCash, lang)}</span>

          <span className="text-muted-foreground">{t("shift.variance")}</span>
          <span className="text-end">
            <StatusPill
              variant={VARIANCE_VARIANT[summary.varianceState]}
              label={`${t(`shift.${summary.varianceState}`)} · ${formatMoney(summary.variance, lang)}`}
            />
          </span>
        </div>

        <div className="border-t border-border pt-2 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Landmark className="h-3 w-3" /> {t("shift.treasury_entry")}
          </p>
          <div className="flex items-center justify-between">
            <span>{lang === "ar" ? summary.treasuryEntry.treasuryNameAr : summary.treasuryEntry.treasuryNameEn}</span>
            <span className="tabular-nums font-semibold">{formatMoney(summary.treasuryEntry.amount, lang)}</span>
          </div>
          <StatusPill
            variant={summary.treasuryEntry.status === "posted" ? "approved" : "pending"}
            label={t(`shift.${summary.treasuryEntry.status}`)}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2">
        <Button
          variant="outline"
          className="w-full sm:w-auto h-11"
          onClick={() => toast.info(t("shift.printed_toast"))}
        >
          <Printer className="h-4 w-4 me-1.5" /> {t("ticket.kebab.print")}
        </Button>
        <Button variant="solid" tone="primary" className="w-full sm:w-auto h-11 flex-1" onClick={onStartNewShift}>
          {t("shift.start_new_shift")}
        </Button>
      </div>
    </div>
  );
}
