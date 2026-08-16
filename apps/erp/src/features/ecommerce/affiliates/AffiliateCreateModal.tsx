import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEcommerceAffiliates } from "@/stores/ecommerceAffiliates";

interface AffiliateCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = { name_ar: "", phone: "", commission_pct: "10" };

/** spec §6.2 "Add affiliate: data + commission_pct → auto-generate unique
 * link/code" — same shape `WarehouseCreateModal` established. */
export function AffiliateCreateModal({ open, onOpenChange }: AffiliateCreateModalProps) {
  const { t } = useTranslation("ecommerce");
  const createAffiliate = useEcommerceAffiliates((s) => s.createAffiliate);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  function onClose() {
    setForm(EMPTY);
    setError("");
    onOpenChange(false);
  }

  function handleSave() {
    if (!form.name_ar.trim()) {
      setError(t("affiliates.form_name_required"));
      return;
    }
    const pct = Number(form.commission_pct);
    if (!(pct > 0 && pct <= 100)) {
      setError(t("affiliates.form_commission_invalid"));
      return;
    }
    createAffiliate({ name_ar: form.name_ar.trim(), phone: form.phone.trim(), commission_pct: pct });
    toast.success(t("affiliates.created_toast"));
    onClose();
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={t("affiliates.new_title")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("affiliates.cancel")}</Button>
          <Button onClick={handleSave}>{t("affiliates.save")}</Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="aff-name">{t("affiliates.field_name")} <span className="text-destructive ms-0.5">*</span></Label>
          <Input id="aff-name" value={form.name_ar} onChange={(e) => { setForm((f) => ({ ...f, name_ar: e.target.value })); setError(""); }} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aff-phone">{t("affiliates.field_phone")}</Label>
          <Input id="aff-phone" dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="01xxxxxxxxx" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aff-pct">{t("affiliates.field_commission")}</Label>
          <Input id="aff-pct" type="number" min={1} max={100} className="tabular-nums" value={form.commission_pct} onChange={(e) => { setForm((f) => ({ ...f, commission_pct: e.target.value })); setError(""); }} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">{t("affiliates.auto_generate_note")}</p>
      </div>
    </ModalShell>
  );
}
