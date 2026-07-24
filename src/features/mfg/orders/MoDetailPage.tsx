import { useTranslation } from "react-i18next";
import { Factory } from "lucide-react";
import { MfgPlaceholderPage } from "../MfgPlaceholderPage";

/** /mfg/orders/:id — MO detail (hybrid). Placeholder for FE_14 scaffold step; sticky header + tabs built in a later step. */
export function MoDetailPage() {
  const { t } = useTranslation("mfg");
  return <MfgPlaceholderPage icon={Factory} title={t("mo.title")} note={t("placeholder.note")} />;
}
