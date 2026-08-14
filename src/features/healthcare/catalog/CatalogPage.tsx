import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import { HealthcarePlaceholderPage } from "../HealthcarePlaceholderPage";

/** /healthcare/catalog — Service & Test catalog (admin). Placeholder for the FE_18 scaffold step; built in Prompt 6. */
export function CatalogPage() {
  const { t } = useTranslation("healthcare");
  return <HealthcarePlaceholderPage icon={ClipboardList} title={t("catalog.title")} note={t("placeholder.note")} />;
}
