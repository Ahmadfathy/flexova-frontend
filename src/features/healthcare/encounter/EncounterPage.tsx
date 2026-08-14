import { useTranslation } from "react-i18next";
import { Stethoscope } from "lucide-react";
import { HealthcarePlaceholderPage } from "../HealthcarePlaceholderPage";

/** /healthcare/encounter/:id — merged clinical screen. Placeholder for the FE_18 scaffold step; built in Prompt 2. */
export function EncounterPage() {
  const { t } = useTranslation("healthcare");
  return <HealthcarePlaceholderPage icon={Stethoscope} title={t("encounter.title")} note={t("placeholder.note")} />;
}
