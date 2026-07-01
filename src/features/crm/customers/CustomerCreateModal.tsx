import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface CustomerCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerCreateModal({ open, onOpenChange }: CustomerCreateModalProps) {
  const { t, i18n } = useTranslation("crm");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const [type, setType]     = useState<"company" | "individual">("company");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [phone, setPhone]   = useState("");
  const [trn, setTrn]       = useState("");
  const [limit, setLimit]   = useState("");
  const [saving, setSaving] = useState(false);

  const isValid = nameAr.trim() && nameEn.trim();

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("list.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("list.form_title_new")}
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
          <Label className="text-xs text-muted-foreground">{t("list.form_type")} *</Label>
          <Select value={type} onValueChange={v => setType(v as "company" | "individual")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="company">{t("list.type_company")}</SelectItem>
              <SelectItem value="individual">{t("list.type_individual")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("list.form_name_ar")} *</Label>
          <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("list.form_name_en")} *</Label>
          <Input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("list.form_phone")}</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" type="tel" />
        </div>
        {type === "company" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("list.form_trn")}</Label>
            <Input value={trn} onChange={e => setTrn(e.target.value)} dir="ltr" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("list.form_credit_limit")}</Label>
          <Input
            type="number" min={0} step="100"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            className="tabular-nums text-start"
            placeholder="0"
          />
        </div>
      </div>
    </ModalShell>
  );
}
