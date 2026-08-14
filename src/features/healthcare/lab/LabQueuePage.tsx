import { useTranslation } from "react-i18next";
import { FlaskConical } from "lucide-react";
import { HealthcarePlaceholderPage } from "../HealthcarePlaceholderPage";

/** /healthcare/lab — Lab/Radiology queue & results. Placeholder for the FE_18 scaffold step; built in Prompt 5. */
export function LabQueuePage() {
  const { t } = useTranslation("healthcare");
  return <HealthcarePlaceholderPage icon={FlaskConical} title={t("lab.title")} note={t("placeholder.note")} />;
}
