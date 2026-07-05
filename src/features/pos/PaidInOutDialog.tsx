import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCan } from "@/lib/permissions";
import { usePosShift } from "@/stores/posShift";

interface PaidInOutDialogProps {
  type: "in" | "out" | null;
  onOpenChange: (open: boolean) => void;
}

export function PaidInOutDialog({ type, onOpenChange }: PaidInOutDialogProps) {
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const can = useCan();
  const addPaidMovement = usePosShift(s => s.addPaidMovement);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (type) { setAmount(""); setReason(""); }
  }, [type]);

  if (!type) return null;

  const amountNum = parseFloat(amount) || 0;
  const canConfirm = can("pos.paidinout") && amountNum > 0 && reason.trim() !== "";

  function confirm() {
    if (!canConfirm || !type) return;
    addPaidMovement(type, amountNum, reason.trim());
    toast.success(t("paidinout.recorded_toast"));
    onOpenChange(false);
  }

  const Icon = type === "in" ? TrendingUp : TrendingDown;

  return (
    <ModalShell
      open={!!type}
      onOpenChange={onOpenChange}
      title={t(type === "in" ? "paidin" : "paidout")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button variant="solid" tone="primary" disabled={!canConfirm} onClick={confirm}>
            {tCommon("confirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="paidinout-amount">{t("tender.amount_placeholder")}</Label>
          <div className="relative">
            <Icon className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="paidinout-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              autoFocus
              placeholder={t("paidinout.amount_placeholder")}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="ps-9 h-12 text-lg tabular-nums"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paidinout-reason">{t("paidinout.reason")}</Label>
          <Input
            id="paidinout-reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t("paidinout.reason_placeholder")}
            className="h-11"
          />
        </div>
      </div>
    </ModalShell>
  );
}
