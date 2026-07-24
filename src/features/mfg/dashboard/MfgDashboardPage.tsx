import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import { MfgPlaceholderPage } from "../MfgPlaceholderPage";

/** /mfg/dashboard — Manufacturing dashboard. Placeholder for FE_14 scaffold step; KPIs built in a later step. */
export function MfgDashboardPage() {
  const { t } = useTranslation("mfg");
  return <MfgPlaceholderPage icon={LayoutDashboard} title={t("dash.title")} note={t("placeholder.note")} />;
}
