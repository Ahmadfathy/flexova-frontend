import { useTranslation } from "react-i18next";
import { UserSquare2 } from "lucide-react";
import { HealthcarePlaceholderPage } from "../HealthcarePlaceholderPage";

/** /healthcare/patients/:id — Patient 360 (medical). Placeholder for the FE_18 scaffold step; built in Prompt 4. */
export function Patient360Page() {
  const { t } = useTranslation("healthcare");
  return <HealthcarePlaceholderPage icon={UserSquare2} title={t("patient360.title")} note={t("placeholder.note")} />;
}
