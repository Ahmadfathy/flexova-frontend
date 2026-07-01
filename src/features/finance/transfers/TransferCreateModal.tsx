import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

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

interface TransferCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferCreateModal({ open, onOpenChange }: TransferCreateModalProps) {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data } = useFinanceData();

  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");
  const [amount, setAmount]   = useState("");
  const [date, setDate]       = useState(today());
  const [memo, setMemo]       = useState("");
  const [saving, setSaving]   = useState(false);

  const sameError = from && to && from === to;
  const isValid   = from && to && !sameError && parseFloat(amount) > 0 && date;

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("transfers.saved_toast"));
  }

  if (!data) return null;

  const ArrowIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("transfers.form_title")}
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
          <Label className="text-xs text-muted-foreground">{t("transfers.from_label")} *</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className={cn(!from && "border-muted-foreground/40")}>
              <SelectValue placeholder={t("transfers.from_ph")} />
            </SelectTrigger>
            <SelectContent>
              {data.treasuries.map(tr => (
                <SelectItem key={tr.id} value={tr.id} disabled={tr.id === to}>
                  {lang === "ar" ? tr.name_ar : tr.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-center">
          <ArrowIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("transfers.to_label")} *</Label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className={cn(!to && "border-muted-foreground/40", sameError && "border-danger")}>
              <SelectValue placeholder={t("transfers.to_ph")} />
            </SelectTrigger>
            <SelectContent>
              {data.treasuries.map(tr => (
                <SelectItem key={tr.id} value={tr.id} disabled={tr.id === from}>
                  {lang === "ar" ? tr.name_ar : tr.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sameError && (
            <p className="text-xs text-danger">{t("transfers.same_treasury")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("transfers.amount_label")} *</Label>
          <Input
            type="number" min={0.01} step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="tabular-nums text-start"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("transfers.date_label")} *</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("transfers.memo_label")}</Label>
          <Input value={memo} onChange={e => setMemo(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
}
