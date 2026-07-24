import { useTranslation } from "react-i18next";
import { ListTree } from "lucide-react";
import { MfgPlaceholderPage } from "../MfgPlaceholderPage";

/** /mfg/bom/new + /mfg/bom/:id — BOM template editor. Placeholder for FE_14 scaffold step; two-tab editor built in a later step. */
export function BomEditorPage() {
  const { t } = useTranslation("mfg");
  return <MfgPlaceholderPage icon={ListTree} title={t("bom.title")} note={t("placeholder.note")} />;
}
