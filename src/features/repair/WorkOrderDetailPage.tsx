import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import { RepairPlaceholder } from "./RepairPlaceholder";
import { findWorkOrder } from "./catalog";

/** /repair/:id — Work Order detail (central screen). Placeholder for FE_12 Step 1; lifecycle UI built in a later step. */
export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("repair");
  const wo = findWorkOrder(id);

  return (
    <RepairPlaceholder
      icon={Wrench}
      title={wo ? wo.number : (id ?? "")}
      note={t("placeholder.note")}
    />
  );
}
