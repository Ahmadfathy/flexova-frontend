import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCan } from "@/lib/permissions";
import { usePosShift } from "@/stores/posShift";

interface OpenShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenShiftDialog({ open, onOpenChange }: OpenShiftDialogProps) {
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const can = useCan();
  const openShift = usePosShift(s => s.openShift);
  const [float, setFloat] = useState("");

  const floatNum = parseFloat(float) || 0;
  const canConfirm = can("pos.shift.open") && floatNum >= 0 && float.trim() !== "";

  function confirm() {
    if (!canConfirm) return;
    openShift(floatNum);
    toast.success(t("shift.opened_toast"));
    setFloat("");
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={(o) => { if (!o) setFloat(""); onOpenChange(o); }}
      title={t("shift.open")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button variant="solid" tone="primary" disabled={!canConfirm} onClick={confirm}>
            {t("shift.open")}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="opening-float">{t("shift.float")}</Label>
        <div className="relative">
          <Banknote className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="opening-float"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            autoFocus
            placeholder={t("shift.float_placeholder")}
            value={float}
            onChange={e => setFloat(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") confirm(); }}
            className="ps-9 h-12 text-lg tabular-nums"
          />
        </div>
      </div>
    </ModalShell>
  );
}
