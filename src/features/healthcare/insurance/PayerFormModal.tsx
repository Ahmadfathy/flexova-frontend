import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useHealthcareInsurance } from "@/stores/healthcareInsurance";

interface PayerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Add payer (spec §8.2 — "Add/edit: name + contract data + contact"). */
export function PayerFormModal({ open, onOpenChange }: PayerFormModalProps) {
  const { t } = useTranslation("healthcare");
  const addPayer = useHealthcareInsurance((s) => s.addPayer);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  function reset() { setName(""); setContact(""); }

  function handleSave() {
    if (!name.trim()) { toast.error(t("insurance.payer_missing_name")); return; }
    addPayer({ name_ar: name.trim(), contact: contact.trim() });
    toast.success(t("insurance.payer_added"));
    reset();
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      title={t("insurance.new_payer")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave}>{t("common:save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("insurance.field_payer_name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("insurance.field_contact")}</Label>
          <Input value={contact} onChange={(e) => setContact(e.target.value)} dir="ltr" />
        </div>
      </div>
    </ModalShell>
  );
}
