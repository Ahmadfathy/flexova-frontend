import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";

import { cn } from "@/lib/utils";

interface PlForm { name_ar: string; name_en: string; }
const EMPTY_FORM: PlForm = { name_ar: "", name_en: "" };

interface PriceListCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceListCreateModal({ open, onOpenChange }: PriceListCreateModalProps) {
  const { t, i18n } = useTranslation("inventory");
  const lang = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";

  const [form, setForm]             = useState<PlForm>(EMPTY_FORM);
  const [formErr, setFormErr]       = useState("");
  const [formSaving, setFormSaving] = useState(false);

  function onClose() {
    setForm(EMPTY_FORM);
    setFormErr("");
    onOpenChange(false);
  }

  async function handleSave() {
    if (!form.name_ar.trim()) { setFormErr(t("price_lists.form_name_req")); return; }
    setFormSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setFormSaving(false);
    onClose();
    toast.success(lang === "ar" ? "تمت الإضافة" : "Price list created");
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={v => !v && onClose()}
      title={t("price_lists.new_form_title")}
      description={t("price_lists.new")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={formSaving}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={formSaving}>
            {formSaving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("actions.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("price_lists.form_name")} (AR) *</Label>
          <Input
            value={form.name_ar}
            onChange={e => { setForm(f => ({ ...f, name_ar: e.target.value })); setFormErr(""); }}
            placeholder={lang === "ar" ? "اسم القائمة بالعربي" : "Arabic name"}
            className={cn(formErr && "border-destructive")}
            dir="rtl"
          />
          {formErr && <p className="text-xs text-destructive">{formErr}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{t("price_lists.form_name")} (EN)</Label>
          <Input
            value={form.name_en}
            onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
            placeholder="English name"
            dir="ltr"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("price_lists.form_currency")}:</span>
          <span className="font-mono font-medium text-foreground">EGP</span>
        </div>
      </div>
    </ModalShell>
  );
}
