import { useTranslation } from "react-i18next";
import { ListTree } from "lucide-react";
import { MfgPlaceholderPage } from "../MfgPlaceholderPage";

/** /mfg/bom — BOM templates list. Placeholder for FE_14 scaffold step; table built in a later step. */
export function BomListPage() {
  const { t } = useTranslation("mfg");
  return <MfgPlaceholderPage icon={ListTree} title={t("bom.title")} note={t("placeholder.note")} />;
}
