import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Printer, AlertTriangle } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/format";
import { isFlagEnabled } from "@/lib/flags";
import { getItems } from "@/lib/mock/wholesale";
import type { VanShift } from "@/types/wholesale";
import type { CollectionCommission } from "@/lib/wholesale/commission";

interface ZReportDialogProps {
  shift: VanShift | null;
  commission: CollectionCommission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: "ar" | "en";
}

/** Z report (FE_13 §3.5) — goods + cash + estimated commission, print + view.
 * Commission block is flag-gated (`hr` off → hidden, settlement unaffected,
 * per FE_13 §13's own table). */
export function ZReportDialog({ shift, commission, open, onOpenChange, lang }: ZReportDialogProps) {
  const { t } = useTranslation("van");
  if (!shift) return null;

  const items = getItems();
  const itemName = (id: string) => {
    const it = items.find((i) => i.id === id);
    return it ? (lang === "ar" ? it.name_ar : it.name_en) : id;
  };

  const goodsVariance = shift.goods_variance ?? [];
  const hasCashVariance = Math.abs(shift.cash_variance ?? 0) > 0.005;

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("shift_close.z_report_title")}
      description={shift.closed_at ? formatDate(shift.closed_at) : undefined}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("shift_close.receipt_close")}</Button>
          <Button onClick={() => toast.info(t("shift_close.receipt_print_toast"))}>
            <Printer className="h-4 w-4 me-1.5" />
            {t("shift_close.receipt_print")}
          </Button>
        </>
      }
    >
      <div className="mx-auto w-full max-w-[320px] rounded border border-border bg-card p-4 text-xs font-mono space-y-3">
        <div className="text-center space-y-0.5">
          <p className="font-bold text-sm" dir="ltr">{shift.id}</p>
          <p>{t(shift.status === "closed_with_variance" ? "shift_close.status_variance" : "shift_close.status_clean")}</p>
        </div>

        <div className="border-t border-dashed border-border pt-2 space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("shift_close.goods_title")}</p>
          {goodsVariance.length === 0 ? (
            <p className="text-muted-foreground">{t("shift_close.no_goods_variance")}</p>
          ) : (
            goodsVariance.map((g, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-warning-text shrink-0" />
                  {itemName(g.item_id)}
                </span>
                <span className="tabular-nums shrink-0">
                  {g.variance_base > 0 ? "+" : ""}{g.variance_base} · {t(`shift_close.reason_${g.reason}`, { defaultValue: g.reason })}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-dashed border-border pt-2 space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("shift_close.cash_title")}</p>
          <div className="flex items-center justify-between">
            <span>{t("shift_close.field_float")}</span>
            <span className="tabular-nums">{formatMoney(shift.opening_float, lang)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("shift_close.cash_sales")}</span>
            <span className="tabular-nums">{formatMoney(shift.cash_sales, lang)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("shift_close.collections")}</span>
            <span className="tabular-nums">{formatMoney(shift.collections, lang)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("shift_close.expected")}</span>
            <span className="tabular-nums">{formatMoney(shift.expected_cash, lang)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("shift_close.declared")}</span>
            <span className="tabular-nums">{formatMoney(shift.declared_cash ?? 0, lang)}</span>
          </div>
          <div className={`flex items-center justify-between font-bold pt-1 border-t border-dashed border-border ${hasCashVariance ? "text-warning-text" : "text-success-text"}`}>
            <span>{t("shift_close.variance")}</span>
            <span className="tabular-nums">{formatMoney(shift.cash_variance ?? 0, lang)}</span>
          </div>
        </div>

        {isFlagEnabled("hr") && commission && (
          <div className="border-t border-dashed border-border pt-2 flex items-center justify-between text-muted-foreground">
            <span>{t("shift_close.commission_estimate")}</span>
            <span className="tabular-nums">{formatMoney(commission.amount, lang)}</span>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
