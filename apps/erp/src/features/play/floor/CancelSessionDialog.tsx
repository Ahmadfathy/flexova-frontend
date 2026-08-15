import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { Textarea } from "@/components/ui/textarea";

import { usePlaySessions } from "@/stores/playSessions";
import { usePlayChecks } from "@/stores/playChecks";
import { usePlayDevices } from "@/stores/playDevices";
import { usePlayDocuments, nextReversalId } from "@/stores/playDocuments";
import { usePlayAudit } from "@/stores/playAudit";
import { getShift } from "@/lib/mock/play";
import type { Check, Device, Session } from "@/features/play/types";

interface CancelSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  device: Device | null;
  check: Check | undefined;
  onDone: () => void;
}

/**
 * Cancel session (§5.9, `AlertDialog`, gated by `play.cancel` — the trigger button in
 * `SessionCardDrawer` already disables/hides itself without the permission, this dialog only
 * ever opens when it's held). Golden rule: reversal, never delete. The only way THIS session
 * could already have an issued e-receipt while still active/paused is prepaid's pay-to-start
 * (`prepaid_receipt_id`) — postpaid never issues anything before End & Bill, and a `paid`
 * session has already left the drawer entirely (device freed, no session card to cancel from).
 */
export function CancelSessionDialog({ open, onOpenChange, session, device, check, onDone }: CancelSessionDialogProps) {
  const { t } = useTranslation("play");
  const [reason, setReason] = useState("");

  const cancelSession = usePlaySessions((s) => s.cancelSession);
  const closeCheck = usePlayChecks((s) => s.closeCheck);
  const updateDevice = usePlayDevices((s) => s.updateDevice);
  const fileReversal = usePlayDocuments((s) => s.fileReversal);
  const appendAudit = usePlayAudit((s) => s.append);

  function handleClose(o: boolean) {
    if (!o) setReason("");
    onOpenChange(o);
  }

  function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) return;

    const issuedRef = session.prepaid_receipt_id ?? session.document_id;
    let reversalId: string | undefined;

    if (issuedRef) {
      reversalId = nextReversalId();
      fileReversal({
        id: reversalId,
        session_id: session.id,
        reversed_ref: issuedRef,
        reason: trimmed,
        issued_at: new Date().toISOString(),
      });
    }

    cancelSession(session.id, trimmed, reversalId);
    if (check) closeCheck(check.id);
    if (device) {
      updateDevice(device.id, {
        name: device.name, device_type_id: device.device_type_id, branch_id: device.branch_id,
        state: "free", notes: device.notes,
      });
    }

    appendAudit({
      user: getShift().cashier_id,
      action: "play.session.cancel",
      entity: session.id,
      detail_ar: issuedRef
        ? `إلغاء جلسة رقم ${session.id} مع إصدار إشعار عكسي رقم ${reversalId} — السبب: ${trimmed}`
        : `إلغاء جلسة رقم ${session.id} — السبب: ${trimmed}`,
      detail_en: issuedRef
        ? `Cancelled session ${session.id} with reversal ${reversalId} issued — reason: ${trimmed}`
        : `Cancelled session ${session.id} — reason: ${trimmed}`,
    });

    toast.success(t("floor.cancel_session_toast"));
    setReason("");
    onOpenChange(false);
    onDone();
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleClose}
      title={t("floor.cancel_session_title")}
      description={t("floor.cancel_session_body")}
      confirmTone="danger"
      confirmLabel={t("floor.cancel_session_confirm")}
      confirmDisabled={!reason.trim()}
      onConfirm={handleConfirm}
    >
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("cancel_reason")}
        rows={3}
      />
    </ConfirmDialog>
  );
}
