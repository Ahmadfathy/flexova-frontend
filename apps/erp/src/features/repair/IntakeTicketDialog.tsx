import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";
import permissionsFixtures from "@/lib/mock/fixtures/permissions.fixtures.json";
import {
  findCustomer, customerName, findTechnician, technicianName, deviceLabel,
  type RprWorkOrder,
} from "./catalog";

const CURRENT_TERMINAL = posFixtures.terminals[0];
const BRANCH = permissionsFixtures.branches.find((b) => b.id === CURRENT_TERMINAL.branch_id);

interface IntakeTicketDialogProps {
  workOrder: RprWorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 80mm-styled Intake Ticket preview (custody proof) — mirrors POS's TicketReceiptDialog
 * structure exactly (ModalShell + monospace preview + simulated Print, no real print API). */
export function IntakeTicketDialog({ workOrder, open, onOpenChange }: IntakeTicketDialogProps) {
  const { t } = useTranslation("repair");
  const { lang } = useAppearance();

  if (!workOrder) return null;

  const customer = findCustomer(workOrder.customer_id);
  const technician = findTechnician(workOrder.technician_id);
  const device = workOrder.device;

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={<span dir="ltr">{workOrder.number}</span>}
      description={formatDate(workOrder.intake_at)}
      size="md"
      footer={
        <Button onClick={() => toast.info(t("intake.ticket_print_toast"))}>
          <Printer className="h-4 w-4 me-1.5" />
          {t("intake.ticket_print")}
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-[300px] rounded border border-border bg-card p-4 text-xs font-mono space-y-2">
        <div className="text-center space-y-0.5">
          <p className="font-bold text-sm">{t("intake.ticket_title")}</p>
          <p>{BRANCH ? (lang === "ar" ? BRANCH.name_ar : BRANCH.name_en) : workOrder.id}</p>
          <p dir="ltr">{workOrder.number}</p>
          <p>{formatDate(workOrder.intake_at)}</p>
        </div>

        <div className="border-t border-dashed border-border pt-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t("intake.customer")}</span>
            <span className="min-w-0 truncate">{customer ? customerName(customer, lang) : workOrder.customer_id}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t("intake.device_type")}</span>
            <span>{t(`device.${device.type}`)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{deviceLabel(device) || "—"}</span>
            <span dir="ltr">{device.serial ?? "—"}</span>
          </div>
          {device._flag === "device_no_serial" && (
            <p className="text-warning-text">{t("intake.no_serial")}</p>
          )}
          {device.accessories.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t("intake.accessories")}</span>
              <span className="min-w-0 truncate">{device.accessories.join("، ")}</span>
            </div>
          )}
          <div className="pt-1">
            <p className="text-muted-foreground">{t("intake.condition")}</p>
            <p>{device.intake_condition || "—"}</p>
          </div>
          <div className="pt-1">
            <p className="text-muted-foreground">{t("intake.faults")}</p>
            <p>{workOrder.reported_faults || "—"}</p>
          </div>
        </div>

        <div className="border-t border-dashed border-border pt-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("board.promise")}</span>
            <span className="tabular-nums">{formatDate(workOrder.promise_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("intake.technician")}</span>
            <span>{technician ? technicianName(technician, lang) : "—"}</span>
          </div>
          {workOrder.deposit && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("intake.deposit")}</span>
              <span className="tabular-nums">{workOrder.deposit.amount}</span>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground pt-1 border-t border-dashed border-border">
          {t("intake.ticket_custody_note")}
        </p>
      </div>
    </ModalShell>
  );
}
