import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MarkShippedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (carrier: string, trackingNo: string) => void;
}

/** Order detail's "shipped" contextual action (spec §5.2) — collects carrier + tracking no. before advancing status. */
export function MarkShippedDialog({ open, onOpenChange, onConfirm }: MarkShippedDialogProps) {
  const { t } = useTranslation("ecommerce");
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");

  function handleConfirm() {
    if (!carrier.trim() || !trackingNo.trim()) return;
    onConfirm(carrier.trim(), trackingNo.trim());
    setCarrier(""); setTrackingNo("");
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) { setCarrier(""); setTrackingNo(""); } }}
      title={t("orders.ship_dialog_title")}
      description={t("orders.ship_dialog_body")}
      confirmTone="primary"
      confirmLabel={t("orders.action_mark_shipped")}
      confirmDisabled={!carrier.trim() || !trackingNo.trim()}
      onConfirm={handleConfirm}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ec-carrier">{t("orders.carrier_label")}</Label>
        <Input id="ec-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={t("orders.carrier_placeholder")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ec-tracking">{t("orders.tracking_no_label")}</Label>
        <Input id="ec-tracking" value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} dir="ltr" placeholder={t("orders.tracking_no_placeholder")} />
      </div>
    </ConfirmDialog>
  );
}
