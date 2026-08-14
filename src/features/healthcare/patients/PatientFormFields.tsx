import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormField, FormGrid, FormSection } from "@/components/patterns/FormLayout";
import { useHealthcareInsurance } from "@/stores/healthcareInsurance";
import type { HcPatient } from "@/features/healthcare/types";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export interface PatientFormValues {
  name_ar: string;
  phone: string;
  dob: string;
  sex: "male" | "female" | "";
  blood_type: string;
  allergies: string[];
  chronic: string[];
  payer_id: string;
  plan_id: string;
  isPediatric: boolean;
  guardian_name: string;
  guardian_phone: string;
}

export const EMPTY_PATIENT_FORM: PatientFormValues = {
  name_ar: "", phone: "", dob: "", sex: "", blood_type: "",
  allergies: [], chronic: [], payer_id: "", plan_id: "",
  isPediatric: false, guardian_name: "", guardian_phone: "",
};

/** Existing patient → editable form values (Patient 360's Data tab). Owner/guardian
 * fields aren't populated here — that tab shows Owner/Guarantor as its own
 * read-only section instead (see `showGuardianSection`). */
export function patientToFormValues(p: HcPatient): PatientFormValues {
  return {
    name_ar: p.name_ar, phone: p.phone ?? "", dob: p.dob ?? "", sex: p.sex ?? "",
    blood_type: p.blood_type ?? "", allergies: p.allergies, chronic: p.chronic,
    payer_id: p.insurance?.payer_id ?? "", plan_id: p.insurance?.plan_id ?? "",
    isPediatric: false, guardian_name: "", guardian_phone: "",
  };
}

/** Small local chip input — no shared multi-value component exists yet in the pattern library. */
function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        onBlur={commit}
        placeholder={placeholder}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs font-normal">
              {v}
              <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} aria-label="remove">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface PatientFormFieldsProps {
  value: PatientFormValues;
  onChange: (patch: Partial<PatientFormValues>) => void;
  /** allergies/chronic are PHI (spec §5.6) — hidden entirely without clinical.view. */
  canClinical: boolean;
  dedupeWarning?: string;
  /** Patient 360's Data tab (Prompt 4) edits an *existing* owner binding, which
   * the pediatric on/off toggle here isn't built to convert — that tab renders
   * Owner/Guarantor as its own read-only section instead, per spec §6.2. */
  showGuardianSection?: boolean;
}

export function PatientFormFields({ value, onChange, canClinical, dedupeWarning, showGuardianSection = true }: PatientFormFieldsProps) {
  const { t } = useTranslation("healthcare");
  const allPayers = useHealthcareInsurance((s) => s.payers);
  const allPlans = useHealthcareInsurance((s) => s.plans);
  const payers = Object.values(allPayers).filter((p) => p.contract_status === "active");
  const plans = Object.values(allPlans).filter((p) => p.payer_id === value.payer_id);

  return (
    <div className="space-y-6">
      <FormSection title={t("patients.section_basic")}>
        <FormGrid cols={2}>
          <FormField label={t("patients.field_name")} required>
            <Input value={value.name_ar} onChange={(e) => onChange({ name_ar: e.target.value })} placeholder={t("patients.field_name_placeholder")} />
          </FormField>
          <FormField label={t("patients.field_phone")} required error={dedupeWarning}>
            <Input value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" />
          </FormField>
          <FormField label={t("patients.field_dob")}>
            <Input type="date" value={value.dob} onChange={(e) => onChange({ dob: e.target.value })} />
          </FormField>
          <FormField label={t("patients.field_sex")}>
            <Select value={value.sex || "__unset__"} onValueChange={(v) => onChange({ sex: v === "__unset__" ? "" : (v as "male" | "female") })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset__">—</SelectItem>
                <SelectItem value="male">{t("sex.male")}</SelectItem>
                <SelectItem value="female">{t("sex.female")}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t("patients.field_blood_type")}>
            <Select value={value.blood_type || "__unset__"} onValueChange={(v) => onChange({ blood_type: v === "__unset__" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset__">—</SelectItem>
                {BLOOD_TYPES.map((bt) => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      {canClinical && (
        <FormSection title={t("patients.section_clinical")} subtitle={t("patients.section_clinical_sub")}>
          <FormGrid cols={2}>
            <FormField label={t("patients.field_allergies")}>
              <TagInput value={value.allergies} onChange={(v) => onChange({ allergies: v })} placeholder={t("patients.field_allergies_placeholder")} />
            </FormField>
            <FormField label={t("patients.field_chronic")}>
              <TagInput value={value.chronic} onChange={(v) => onChange({ chronic: v })} placeholder={t("patients.field_chronic_placeholder")} />
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      <FormSection title={t("patients.section_insurance")}>
        <FormGrid cols={2}>
          <FormField label={t("patients.field_payer")}>
            <Select value={value.payer_id || "__none__"} onValueChange={(v) => onChange({ payer_id: v === "__none__" ? "" : v, plan_id: "" })}>
              <SelectTrigger><SelectValue placeholder={t("patients.field_payer_placeholder")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("encounter.uninsured_badge")}</SelectItem>
                {payers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name_ar}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t("patients.field_plan")}>
            <Select value={value.plan_id || "__none__"} disabled={!value.payer_id} onValueChange={(v) => onChange({ plan_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder={t("patients.field_plan_placeholder")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name_ar}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      {showGuardianSection && (
      <FormSection title={t("patients.section_guardian")} subtitle={t("patients.section_guardian_sub")}>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Switch checked={value.isPediatric} onCheckedChange={(v) => onChange({ isPediatric: v })} />
          {t("patients.field_pediatric_toggle")}
        </label>
        {value.isPediatric && (
          <FormGrid cols={2} className="mt-3">
            <FormField label={t("patients.vet_owner_name")}>
              <Input value={value.guardian_name} onChange={(e) => onChange({ guardian_name: e.target.value })} placeholder={t("patients.field_name_placeholder")} />
            </FormField>
            <FormField label={t("patients.field_phone")}>
              <Input value={value.guardian_phone} onChange={(e) => onChange({ guardian_phone: e.target.value })} dir="ltr" inputMode="tel" />
            </FormField>
          </FormGrid>
        )}
      </FormSection>
      )}
    </div>
  );
}
