import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import { MfgPlaceholderPage } from "../MfgPlaceholderPage";

/** /mfg/orders — MO list. Placeholder for FE_14 scaffold step; table built in a later step. */
export function MoListPage() {
  const { t } = useTranslation("mfg");
  return <MfgPlaceholderPage icon={ClipboardList} title={t("orders.title")} note={t("placeholder.note")} />;
}
