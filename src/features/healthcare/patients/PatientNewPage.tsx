import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { HealthcarePlaceholderPage } from "../HealthcarePlaceholderPage";

/** /healthcare/patients/new — Add patient. Placeholder for the FE_18 scaffold step; built in Prompt 3. */
export function PatientNewPage() {
  const { t } = useTranslation("healthcare");
  return <HealthcarePlaceholderPage icon={UserPlus} title={t("patients.new")} note={t("placeholder.note")} />;
}
