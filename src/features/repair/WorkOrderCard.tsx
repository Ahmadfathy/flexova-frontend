import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { StatusPill } from "@/components/patterns/StatusPill";
import { formatDate } from "@/lib/format";
import type { Lang } from "@/stores/appearance";
import {
  findCustomer, customerName, findTechnician, technicianName, deviceLabel,
  statusPillVariant, isOverdue, type RprWorkOrder,
} from "./catalog";

interface WorkOrderCardProps {
  workOrder: RprWorkOrder;
  lang: Lang;
  onClick: () => void;
}

export function WorkOrderCard({ workOrder, lang, onClick }: WorkOrderCardProps) {
  const { t } = useTranslation("repair");
  const customer = findCustomer(workOrder.customer_id);
  const technician = findTechnician(workOrder.technician_id);
  const overdue = isOverdue(workOrder);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-start rounded-lg border border-border bg-card p-3 space-y-2 hover:border-brand/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-foreground" dir="ltr">{workOrder.number}</span>
        <StatusPill variant={statusPillVariant(workOrder.status)} label={t(`status.${workOrder.status}`)} />
      </div>

      <p className="text-sm font-medium text-foreground truncate">
        {customer ? customerName(customer, lang) : workOrder.customer_id}
      </p>
      <p className="text-xs text-muted-foreground truncate">{deviceLabel(workOrder.device) || "—"}</p>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
        <span className="text-xs text-muted-foreground truncate">
          {technician ? technicianName(technician, lang) : "—"}
        </span>
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground shrink-0">
          {overdue && <AlertTriangle className="h-3 w-3 text-danger" />}
          {formatDate(workOrder.promise_at)}
        </span>
      </div>

      {overdue && (
        <StatusPill variant="rejected" label={t("board.overdue")} className="w-fit" />
      )}
    </button>
  );
}
