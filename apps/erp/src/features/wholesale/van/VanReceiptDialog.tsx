import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Printer, AlertTriangle } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/format";
import { getItems, getUoms } from "@/lib/mock/wholesale";
import { tenderName } from "@/features/pos/tenderTypes";
import type { VanSale } from "@/stores/wholesaleVanSales";
import type { WholesaleCustomer } from "@/types/wholesale";

interface VanReceiptDialogProps {
  sale: VanSale | null;
  customer: WholesaleCustomer | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: "ar" | "en";
}

/** e-receipt view + mocked 80mm print (FE_13 §3.3) — mirrors TicketReceiptDialog's
 * receipt block; there is no reusable ReceiptPreview component in this codebase
 * to call into (confirmed via reuse survey), so this replicates the same markup. */
export function VanReceiptDialog({ sale, customer, open, onOpenChange, lang }: VanReceiptDialogProps) {
  const { t } = useTranslation("van");
  if (!sale) return null;

  const items = getItems();
  const uoms = getUoms();
  const itemName = (id: string) => {
    const it = items.find((i) => i.id === id);
    return it ? (lang === "ar" ? it.name_ar : it.name_en) : id;
  };
  const uomName = (id: string) => {
    const u = uoms.find((x) => x.id === id);
    return u ? (lang === "ar" ? u.name_ar : u.name_en) : id;
  };

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={<span dir="ltr">{sale.number}</span>}
      description={formatDate(sale.date)}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("visit.receipt_close")}</Button>
          <Button onClick={() => toast.info(t("visit.receipt_print_toast"))}>
            <Printer className="h-4 w-4 me-1.5" />
            {t("visit.receipt_print")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {sale.needs_eta_fix && (
          <div className="flex items-center gap-2 rounded px-3 py-2 text-sm bg-warning-tint text-warning-text">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("visit.receipt_needs_eta_fix")}
          </div>
        )}

        <div className="mx-auto w-full max-w-[300px] rounded border border-border bg-card p-4 text-xs font-mono space-y-2">
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm">{customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : sale.customer_id}</p>
            <p dir="ltr">{sale.number}</p>
          </div>

          <div className="border-t border-dashed border-border pt-2 space-y-1">
            {sale.lines.map((line, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate flex items-center gap-1">
                  {itemName(line.item_id)}
                  {line.eta_code_missing && <AlertTriangle className="h-3 w-3 text-warning-text shrink-0" />}
                </span>
                <span className="tabular-nums shrink-0">
                  {line.qty} {uomName(line.uom_id)} × {formatMoney(line.price, lang)} = {formatMoney(line.line_total, lang)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border pt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span>{t("visit.subtotal")}</span>
              <span className="tabular-nums">{formatMoney(sale.totals.subtotal, lang)}</span>
            </div>
            {sale.totals.discount > 0 && (
              <div className="flex items-center justify-between">
                <span>{t("visit.discount_total")}</span>
                <span className="tabular-nums">-{formatMoney(sale.totals.discount, lang)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>{t("visit.tax_total")}</span>
              <span className="tabular-nums">{formatMoney(sale.totals.tax, lang)}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-sm pt-1 border-t border-dashed border-border">
              <span>{t("visit.grand_total")}</span>
              <span className="tabular-nums">{formatMoney(sale.totals.grand_total, lang)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-border pt-2 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("visit.receipt_tenders")}</p>
            {Object.entries(sale.tenders).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between">
                <span>{tenderName(method, lang)}</span>
                <span className="tabular-nums">{formatMoney(amount, lang)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
