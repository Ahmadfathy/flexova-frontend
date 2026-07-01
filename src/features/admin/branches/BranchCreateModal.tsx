import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ModalShell } from "@/components/patterns/ModalShell";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";

interface BranchCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchCreateModal({ open, onOpenChange }: BranchCreateModalProps) {
  const { t, i18n } = useTranslation("admin");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code,   setCode]   = useState("");

  function onClose() {
    onOpenChange(false);
  }

  function handleSave() {
    onClose();
    toast.success(t("branches.saved_toast"));
  }

  const valid = nameAr.trim() && nameEn.trim() && code.trim();

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("branches.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!valid} onClick={handleSave}>{lang === "ar" ? "حفظ" : "Save"}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("branches.form_name_ar")} *</Label>
          <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("branches.form_name_en")} *</Label>
          <Input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("branches.form_code")} *</Label>
          <Input value={code} onChange={e => setCode(e.target.value)} dir="ltr" className="font-mono" />
        </div>
      </div>
    </ModalShell>
  );
}
