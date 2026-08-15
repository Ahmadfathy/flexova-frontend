import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, FileCheck2, TrendingUp, TrendingDown } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { useCan } from "@/lib/permissions";
import { XReportDialog } from "./XReportDialog";
import { PaidInOutDialog } from "./PaidInOutDialog";

interface ShiftActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShiftActionsDialog({ open, onOpenChange }: ShiftActionsDialogProps) {
  const { t } = useTranslation("pos");
  const navigate = useNavigate();
  const can = useCan();

  const [xReportOpen, setXReportOpen] = useState(false);
  const [paidInOutType, setPaidInOutType] = useState<"in" | "out" | null>(null);

  const actions = [
    {
      key: "xreport",
      label: t("shift.xreport"),
      icon: ClipboardList,
      enabled: true,
      onClick: () => { onOpenChange(false); setXReportOpen(true); },
    },
    {
      key: "paidin",
      label: t("paidin"),
      icon: TrendingUp,
      enabled: can("pos.paidinout"),
      onClick: () => { onOpenChange(false); setPaidInOutType("in"); },
    },
    {
      key: "paidout",
      label: t("paidout"),
      icon: TrendingDown,
      enabled: can("pos.paidinout"),
      onClick: () => { onOpenChange(false); setPaidInOutType("out"); },
    },
    {
      key: "close",
      label: t("shift.close"),
      icon: FileCheck2,
      enabled: can("pos.shift.close"),
      onClick: () => { onOpenChange(false); navigate("/pos/shift/close"); },
    },
  ];

  return (
    <>
      <ModalShell open={open} onOpenChange={onOpenChange} title={t("shift.actions")} size="sm">
        <div className="grid grid-cols-2 gap-2">
          {actions.map(a => (
            <button
              key={a.key}
              type="button"
              disabled={!a.enabled}
              onClick={a.onClick}
              className="flex flex-col items-center justify-center gap-1.5 min-h-20 rounded-lg border border-border text-sm font-semibold text-foreground hover:border-brand/40 hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none py-3"
            >
              <a.icon className="h-5 w-5" />
              {a.label}
            </button>
          ))}
        </div>
      </ModalShell>

      <XReportDialog open={xReportOpen} onOpenChange={setXReportOpen} />
      <PaidInOutDialog type={paidInOutType} onOpenChange={(o) => !o && setPaidInOutType(null)} />
    </>
  );
}
