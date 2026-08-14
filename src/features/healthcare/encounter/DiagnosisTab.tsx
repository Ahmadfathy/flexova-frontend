import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormGrid } from "@/components/patterns/FormLayout";
import type { HcEncounter } from "@/features/healthcare/types";

interface DiagnosisTabProps {
  encounter: HcEncounter;
  readOnly: boolean;
  onChange: (patch: Partial<Pick<HcEncounter, "complaint" | "diagnosis" | "clinical_note">>) => void;
}

/** Diagnosis tab (spec §4.3.1) — PHI, gated behind healthcare.clinical.view by the parent. */
export function DiagnosisTab({ encounter, readOnly, onChange }: DiagnosisTabProps) {
  const { t } = useTranslation("healthcare");

  return (
    <FormGrid cols={1}>
      <FormField label={t("encounter.field_complaint")}>
        <Input
          value={encounter.complaint ?? ""}
          onChange={(e) => onChange({ complaint: e.target.value })}
          disabled={readOnly}
          placeholder={t("encounter.field_complaint_placeholder")}
        />
      </FormField>
      <FormField label={t("encounter.field_diagnosis")}>
        <Textarea
          value={encounter.diagnosis ?? ""}
          onChange={(e) => onChange({ diagnosis: e.target.value })}
          disabled={readOnly}
          placeholder={t("encounter.field_diagnosis_placeholder")}
          rows={3}
        />
      </FormField>
      <FormField label={t("encounter.field_clinical_note")}>
        <Textarea
          value={encounter.clinical_note ?? ""}
          onChange={(e) => onChange({ clinical_note: e.target.value })}
          disabled={readOnly}
          placeholder={t("encounter.field_clinical_note_placeholder")}
          rows={2}
        />
      </FormField>
    </FormGrid>
  );
}
