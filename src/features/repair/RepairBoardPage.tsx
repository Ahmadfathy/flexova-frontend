import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import { RepairPlaceholder } from "./RepairPlaceholder";

/** /repair/board — Work Orders board. Placeholder for FE_12 Step 1; kanban/list built in a later step. */
export default function RepairBoardPage() {
  const { t } = useTranslation("repair");
  return <RepairPlaceholder icon={ClipboardList} title={t("board.title")} note={t("placeholder.note")} />;
}
