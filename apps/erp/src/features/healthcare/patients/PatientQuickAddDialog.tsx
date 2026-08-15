import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHealthcarePatients, EGYPT_PHONE_RE } from "@/stores/healthcarePatients";
import { useAppearance } from "@/stores/appearance";
import { patientName } from "@/lib/mock/healthcare";
import type { HcPatient } from "@/features/healthcare/types";

interface PatientQuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (patient: HcPatient) => void;
}

/**
 * Quick-add modal (spec §5.4) — phone+name only, <15s. Age/sex/blood type are
 * completed at first visit, not here. Dedupe is a soft warning (spec: "dedupe
 * warn", not block) with a one-click shortcut to reuse the matched patient
 * instead of creating a duplicate.
 */
export function PatientQuickAddDialog({ open, onOpenChange, onCreated }: PatientQuickAddDialogProps) {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const findPatientByPhone = useHealthcarePatients((s) => s.findPatientByPhone);
  const addQuickPatient = useHealthcarePatients((s) => s.addQuickPatient);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  const match = phone.length >= 10 ? findPatientByPhone(phone) : undefined;

  function reset() {
    setPhone(""); setName("");
  }

  function handleUseExisting() {
    if (!match) return;
    onCreated?.(match);
    reset();
    onOpenChange(false);
  }

  function handleSave() {
    if (!EGYPT_PHONE_RE.test(phone)) {
      toast.error(t("patients.quickadd_bad_phone"));
      return;
    }
    if (!name.trim()) {
      toast.error(t("patients.quickadd_missing_name"));
      return;
    }
    const patient = addQuickPatient(phone, name.trim());
    toast.success(t("patients.quickadd_success"));
    onCreated?.(patient);
    reset();
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      title={t("patients.quickadd_title")}
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
          <Label>{t("patients.field_phone")}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" />
        </div>

        {match && (
          <div className="rounded-lg bg-warning-tint border border-warning/20 p-3 space-y-2">
            <p className="text-xs text-warning-text flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {t("patients.dedupe_warning", { name: patientName(match, lang) })}
            </p>
            <Button size="sm" variant="outline" onClick={handleUseExisting}>
              {t("patients.dedupe_use_existing")}
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>{t("patients.field_name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("patients.field_name_placeholder")} />
        </div>
      </div>
    </ModalShell>
  );
}
