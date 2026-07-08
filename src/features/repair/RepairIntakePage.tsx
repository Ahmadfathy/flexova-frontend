import { useTranslation } from "react-i18next";
import { Smartphone } from "lucide-react";
import { RepairPlaceholder } from "./RepairPlaceholder";

/** /repair/new — Intake (new work order). Placeholder for FE_12 Step 1; real form built in a later step. */
export default function RepairIntakePage() {
  const { t } = useTranslation("repair");
  return <RepairPlaceholder icon={Smartphone} title={t("intake.new")} note={t("placeholder.note")} />;
}
