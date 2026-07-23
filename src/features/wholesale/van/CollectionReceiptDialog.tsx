import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Printer, AlertTriangle } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/format";
import type { Collection } from "@/types/wholesale";
import type { WholesaleCustomer } from "@/types/wholesale";
import type { CollectionCommission } from "@/lib/wholesale/commission";
import { isFlagEnabled } from "@/lib/flags";
import salesFixtures from "@/lib/mock/fixtures/sales.fixtures.json";

interface PaymentMethod { id: string; name_ar: string; name_en: string; }
const PAYMENT_METHODS = salesFixtures.payment_methods as PaymentMethod[];

function methodName(id: string, lang: "ar" | "en"): string {
  const pm = PAYMENT_METHODS.find((m) => m.id === id);
  return pm ? (lang === "ar" ? pm.name_ar : pm.name_en) : id;
}

interface CollectionReceiptDialogProps {
  collection: Collection | null;
  customer: WholesaleCustomer | undefined;
  commission: CollectionCommission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: "ar" | "en";
}

/** e-receipt view + mocked 80mm print for a collection (FE_13 §3.4) — mirrors
 * VanReceiptDialog's markup, no reusable ReceiptPreview component exists. */
export function CollectionReceiptDialog({ collection, customer, commission, open, onOpenChange, lang }: CollectionReceiptDialogProps) {
  const { t } = useTranslation("van");
  if (!collection) return null;

  const onAccount = collection.unallocated > 0;

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={<span dir="ltr">{collection.number}</span>}
      description={formatDate(collection.date)}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("collect.receipt_close")}</Button>
          <Button onClick={() => toast.info(t("collect.receipt_print_toast"))}>
            <Printer className="h-4 w-4 me-1.5" />
            {t("collect.receipt_print")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {onAccount && (
          <div className="flex items-center gap-2 rounded px-3 py-2 text-sm bg-warning-tint text-warning-text">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("collect.receipt_on_account", { amount: formatMoney(collection.unallocated, lang) })}
          </div>
        )}

        <div className="mx-auto w-full max-w-[300px] rounded border border-border bg-card p-4 text-xs font-mono space-y-2">
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm">{customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : collection.customer_id}</p>
            <p dir="ltr">{collection.number}</p>
          </div>

          <div className="border-t border-dashed border-border pt-2 space-y-1">
            {collection.allocations.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate" dir="ltr">{a.invoice_id}</span>
                <span className="tabular-nums shrink-0">{formatMoney(a.amount, lang)}</span>
              </div>
            ))}
            {onAccount && (
              <div className="flex items-center justify-between gap-2 text-warning-text">
                <span>{t("collect.on_account_label")}</span>
                <span className="tabular-nums">{formatMoney(collection.unallocated, lang)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-border pt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span>{t("collect.col_method")}</span>
              <span>{methodName(collection.payment_method, lang)}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-sm pt-1 border-t border-dashed border-border">
              <span>{t("collect.field_amount")}</span>
              <span className="tabular-nums">{formatMoney(collection.amount, lang)}</span>
            </div>
          </div>

          {isFlagEnabled("hr") && commission && (
            <div className="border-t border-dashed border-border pt-2 flex items-center justify-between text-muted-foreground">
              <span>{t("collect.commission_basis")}</span>
              <span className="tabular-nums">{formatMoney(commission.amount, lang)}</span>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
