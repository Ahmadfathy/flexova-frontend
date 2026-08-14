import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { HealthcarePlaceholderPage } from "../HealthcarePlaceholderPage";

/** /healthcare/patients — Patients list. Placeholder for the FE_18 scaffold step; built in Prompt 3. */
export function PatientsListPage() {
  const { t } = useTranslation("healthcare");
  return <HealthcarePlaceholderPage icon={Users} title={t("patients.title")} note={t("placeholder.note")} />;
}
