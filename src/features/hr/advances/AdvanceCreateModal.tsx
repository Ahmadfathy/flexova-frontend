import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/patterns/DatePicker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { useHrData, type Advance } from "../data/useHrData";

interface AdvanceCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdvanceCreateModal({ open, onOpenChange }: AdvanceCreateModalProps) {
  const { t, i18n } = useTranslation("hr");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data } = useHrData();
  const employees = data?.employees ?? [];

  const [empId, setEmpId]       = useState("");
  const [type, setType]         = useState<Advance["type"]>("advance");
  const [amount, setAmount]     = useState("");
  const [date, setDate]         = useState("");
  const [installment, setInst]  = useState("");
  const [saving, setSaving]     = useState(false);

  const isValid = empId && amount && date;

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("advances.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("advances.form_title")}
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
          <Label className="text-xs text-muted-foreground">{t("advances.form_employee")} *</Label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue placeholder={t("advances.form_employee_ph")} /></SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {lang === "ar" ? e.name_ar : e.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("advances.form_type")} *</Label>
          <Select value={type} onValueChange={v => setType(v as Advance["type"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="advance">{t("advances.type_advance")}</SelectItem>
              <SelectItem value="loan">{t("advances.type_loan")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("advances.form_amount")} *</Label>
          <Input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} className="tabular-nums text-start" placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("advances.form_date")} *</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        {type === "loan" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("advances.form_installment")}</Label>
            <Input type="number" min={0} value={installment} onChange={e => setInst(e.target.value)} className="tabular-nums text-start" placeholder="0" />
          </div>
        )}
      </div>
    </ModalShell>
  );
}
