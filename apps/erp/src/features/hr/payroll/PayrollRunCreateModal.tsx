import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PayrollRunCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollRunCreateModal({ open, onOpenChange }: PayrollRunCreateModalProps) {
  const { t, i18n } = useTranslation("hr");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";

  const [period, setPeriod] = useState("2026-06");
  const [saving, setSaving] = useState(false);

  function onClose() {
    onOpenChange(false);
  }

  async function handleRun() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onClose();
    toast.success(t("payroll.run_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("payroll.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!period || saving} onClick={handleRun}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("payroll.new")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("payroll.form_period")} *</Label>
          <Input
            value={period}
            onChange={e => setPeriod(e.target.value)}
            placeholder="YYYY-MM"
            dir="ltr"
          />
        </div>
      </div>
    </ModalShell>
  );
}
