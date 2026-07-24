import { useTranslation } from "react-i18next";
import { PlusSquare } from "lucide-react";
import { MfgPlaceholderPage } from "../MfgPlaceholderPage";

/** /mfg/orders/new — New MO. Placeholder for FE_14 scaffold step; drawer form built in a later step. */
export function MoEditorPage() {
  const { t } = useTranslation("mfg");
  return <MfgPlaceholderPage icon={PlusSquare} title={t("new.title")} note={t("placeholder.note")} />;
}
