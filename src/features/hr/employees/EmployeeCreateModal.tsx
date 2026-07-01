import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { type Employee } from "../data/useHrData";

interface EmployeeCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeCreateModal({ open, onOpenChange }: EmployeeCreateModalProps) {
  const { t, i18n } = useTranslation("hr");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";

  const [empType, setEmpType] = useState<Employee["employment_type"]>("monthly");
  const [nameAr, setNameAr]   = useState("");
  const [nameEn, setNameEn]   = useState("");
  const [phone, setPhone]     = useState("");
  const [title, setTitle]     = useState("");
  const [base, setBase]       = useState("");
  const [saving, setSaving]   = useState(false);

  const isValid = nameAr.trim() && nameEn.trim() && title.trim();

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("employees.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("employees.form_title_new")}
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
          <Label className="text-xs text-muted-foreground">{t("employees.form_name_ar")} *</Label>
          <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("employees.form_name_en")} *</Label>
          <Input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("employees.form_title_f")} *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("employees.form_phone")}</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" type="tel" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("employees.form_emp_type")} *</Label>
          <Select value={empType} onValueChange={v => setEmpType(v as Employee["employment_type"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{t("employees.type_monthly")}</SelectItem>
              <SelectItem value="daily">{t("employees.type_daily")}</SelectItem>
              <SelectItem value="commission">{t("employees.type_commission")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {empType !== "commission" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {empType === "daily" ? t("employees.form_day_rate") : t("employees.form_base")}
            </Label>
            <Input
              type="number" min={0} value={base}
              onChange={e => setBase(e.target.value)}
              className="tabular-nums text-start"
              placeholder="0"
            />
          </div>
        )}
      </div>
    </ModalShell>
  );
}
