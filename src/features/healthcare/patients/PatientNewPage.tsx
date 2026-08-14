import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { FormActions } from "@/components/patterns/FormLayout";
import { useCan } from "@/lib/permissions";
import { useAppearance } from "@/stores/appearance";
import { useHealthcarePatients, EGYPT_PHONE_RE } from "@/stores/healthcarePatients";
import { patientName } from "@/lib/mock/healthcare";
import { PatientFormFields, EMPTY_PATIENT_FORM, type PatientFormValues } from "./PatientFormFields";

/** /healthcare/patients/new — full Add patient page (spec §5.2). Quick-add (§5.4) is the modal fast-path. */
export function PatientNewPage() {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const findPatientByPhone = useHealthcarePatients((s) => s.findPatientByPhone);
  const addPatient = useHealthcarePatients((s) => s.addPatient);

  const [form, setForm] = useState<PatientFormValues>(EMPTY_PATIENT_FORM);
  const [saving, setSaving] = useState(false);

  const dedupeMatch = form.phone.length >= 10 ? findPatientByPhone(form.phone) : undefined;
  const dedupeWarning = dedupeMatch ? t("patients.dedupe_warning", { name: patientName(dedupeMatch, lang) }) : undefined;

  function handleChange(patch: Partial<PatientFormValues>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function handleSave() {
    if (!form.name_ar.trim()) {
      toast.error(t("patients.quickadd_missing_name"));
      return;
    }
    if (!EGYPT_PHONE_RE.test(form.phone)) {
      toast.error(t("patients.quickadd_bad_phone"));
      return;
    }
    if (form.isPediatric && !form.guardian_name.trim()) {
      toast.error(t("patients.vet_missing_owner_name"));
      return;
    }

    setSaving(true);
    addPatient({
      name_ar: form.name_ar.trim(),
      phone: form.phone,
      dob: form.dob || null,
      sex: form.sex || null,
      blood_type: form.blood_type || null,
      allergies: can("healthcare.clinical.view") ? form.allergies : [],
      chronic: can("healthcare.clinical.view") ? form.chronic : [],
      insurance: form.payer_id && form.plan_id ? { payer_id: form.payer_id, plan_id: form.plan_id } : null,
      guardian: form.isPediatric ? { name_ar: form.guardian_name.trim(), phone: form.guardian_phone } : undefined,
    });
    toast.success(t("patients.add_success"));
    navigate("/healthcare/patients");
  }

  return (
    <div>
      <PageHeader title={t("patients.new")} />
      <PageSection>
        <PatientFormFields
          value={form}
          onChange={handleChange}
          canClinical={can("healthcare.clinical.view")}
          dedupeWarning={dedupeWarning}
        />
        <FormActions
          className="mt-6"
          onCancel={() => navigate("/healthcare/patients")}
          onSave={handleSave}
          saving={saving}
        />
      </PageSection>
    </div>
  );
}
