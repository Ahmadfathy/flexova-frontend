import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FormActions, FormSection } from "@/components/patterns/FormLayout";
import { useHealthcarePatients, EGYPT_PHONE_RE } from "@/stores/healthcarePatients";
import { ownerName } from "@/lib/mock/healthcare";
import { PatientFormFields, patientToFormValues, type PatientFormValues } from "../PatientFormFields";
import type { HcPatient, HcOwner } from "@/features/healthcare/types";

const SPECIALTY_LABEL_AR: Record<string, string> = {
  species: "النوع", breed: "السلالة", weight_kg: "الوزن (كجم)",
};

interface DataTabProps {
  patient: HcPatient;
  owner: HcOwner | undefined;
  lang: "ar" | "en";
  canClinical: boolean;
}

/** Data tab (spec §6.2) — basic + specialty_ext + Owner/Guarantor, self transparent (shown, not hidden). */
export function DataTab({ patient, owner, lang, canClinical }: DataTabProps) {
  const { t } = useTranslation("healthcare");
  const updatePatient = useHealthcarePatients((s) => s.updatePatient);
  const findPatientByPhone = useHealthcarePatients((s) => s.findPatientByPhone);

  const [form, setForm] = useState<PatientFormValues>(() => patientToFormValues(patient));
  const [saving, setSaving] = useState(false);

  const dedupeMatch = form.phone.length >= 10 && form.phone !== patient.phone ? findPatientByPhone(form.phone) : undefined;
  const dedupeWarning = dedupeMatch ? t("patients.dedupe_warning", { name: dedupeMatch.name_ar }) : undefined;

  const specialtyEntries = Object.entries(patient.specialty_ext ?? {});

  function handleSave() {
    if (!form.name_ar.trim()) { toast.error(t("patients.quickadd_missing_name")); return; }
    if (!EGYPT_PHONE_RE.test(form.phone)) { toast.error(t("patients.quickadd_bad_phone")); return; }

    setSaving(true);
    updatePatient(patient.id, {
      name_ar: form.name_ar.trim(), name_en: form.name_ar.trim(), phone: form.phone,
      dob: form.dob || null, sex: form.sex || null, blood_type: form.blood_type || null,
      allergies: canClinical ? form.allergies : patient.allergies,
      chronic: canClinical ? form.chronic : patient.chronic,
      insurance: form.payer_id && form.plan_id ? { payer_id: form.payer_id, plan_id: form.plan_id } : null,
    });
    setSaving(false);
    toast.success(t("patient360.data_saved"));
  }

  return (
    <div className="space-y-6">
      <PatientFormFields
        value={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        canClinical={canClinical}
        dedupeWarning={dedupeWarning}
        showGuardianSection={false}
      />
      <FormActions onSave={handleSave} saveLabel={t("common:save")} saving={saving} />

      {(specialtyEntries.length > 0 || owner) && (
        <FormSection title={t("encounter.rail_specialty")}>
          <div className="space-y-1.5">
            {specialtyEntries.map(([key, value]) => (
              <p key={key} className="text-sm text-foreground flex justify-between gap-2">
                <span className="text-muted-foreground">{SPECIALTY_LABEL_AR[key] ?? key}</span>
                <span className="font-medium">{String(value)}</span>
              </p>
            ))}
            {owner && (
              <p className="text-sm text-foreground flex justify-between gap-2 pt-1.5 border-t border-border mt-1.5">
                <span className="text-muted-foreground">
                  {owner.relationship === "self" ? t("patient360.owner_self") : owner.relationship === "owner" ? t("encounter.rail_owner") : t("encounter.rail_guardian")}
                </span>
                <span className="font-medium">{owner.relationship === "self" ? t("patient360.owner_self_value") : ownerName(owner, lang)}</span>
              </p>
            )}
          </div>
        </FormSection>
      )}
    </div>
  );
}
