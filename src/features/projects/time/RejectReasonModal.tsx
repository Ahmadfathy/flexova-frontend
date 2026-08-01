import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RejectReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

/** Reject-reason modal (spec §8.3/§8.7) — reason is required. */
export function RejectReasonModal({ open, onOpenChange, onConfirm }: RejectReasonModalProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");

  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open) { setReason(""); setAttempted(false); }
  }, [open]);

  function handleConfirm() {
    setAttempted(true);
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("appr.reject")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button tone="danger" onClick={handleConfirm}>{t("appr.reject")}</Button>
        </>
      }
    >
      <FormField label={t("appr.reason")} required error={attempted && !reason.trim() ? t("appr.reason_required") : undefined}>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={t("appr.reason_placeholder")} />
      </FormField>
    </ModalShell>
  );
}
