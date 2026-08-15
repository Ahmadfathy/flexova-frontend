import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { DatePicker } from "@/components/patterns/DatePicker";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { useFinanceData } from "../data/useFinanceData";

function today() { return new Date().toISOString().split("T")[0]; }

interface PaymentVoucherCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentVoucherCreateModal({ open, onOpenChange }: PaymentVoucherCreateModalProps) {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data } = useFinanceData();

  const [supplierId, setSupp] = useState("");
  const [date, setDate]       = useState(today());
  const [amount, setAmount]   = useState("");
  const [treasuryId, setTr]   = useState("");
  const [memo, setMemo]       = useState("");
  const [saving, setSaving]   = useState(false);

  const isValid = supplierId && date && parseFloat(amount) > 0 && treasuryId;

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("payments.saved_toast"));
  }

  if (!data) return null;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("payments.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!isValid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("payments.supplier_label")} *</Label>
          <Select value={supplierId} onValueChange={setSupp}>
            <SelectTrigger className={cn(!supplierId && "border-muted-foreground/40")}>
              <SelectValue placeholder={t("payments.supplier_ph")} />
            </SelectTrigger>
            <SelectContent>
              {data.suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {lang === "ar" ? s.name_ar : s.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("payments.date_label")} *</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("payments.amount_label")} *</Label>
          <Input
            type="number" min={0.01} step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="tabular-nums text-start"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("payments.treasury_label")} *</Label>
          <Select value={treasuryId} onValueChange={setTr}>
            <SelectTrigger className={cn(!treasuryId && "border-muted-foreground/40")}>
              <SelectValue placeholder={t("payments.treasury_ph")} />
            </SelectTrigger>
            <SelectContent>
              {data.treasuries.map(tr => (
                <SelectItem key={tr.id} value={tr.id}>
                  {lang === "ar" ? tr.name_ar : tr.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("payments.memo_label")}</Label>
          <Input value={memo} onChange={e => setMemo(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
}
