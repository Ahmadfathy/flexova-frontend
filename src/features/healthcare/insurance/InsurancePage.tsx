import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { HealthcarePlaceholderPage } from "../HealthcarePlaceholderPage";

/** /healthcare/insurance — Payers & Plans (admin). Placeholder for the FE_18 scaffold step; built in Prompt 6. */
export function InsurancePage() {
  const { t } = useTranslation("healthcare");
  return <HealthcarePlaceholderPage icon={ShieldCheck} title={t("insurance.title")} note={t("placeholder.note")} />;
}
