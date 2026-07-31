import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Flag, Lock, Printer } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePlayDevices } from "@/stores/playDevices";
import { usePlaySessions } from "@/stores/playSessions";
import { usePlayChecks } from "@/stores/playChecks";
import { usePlayDocuments, nextDocumentId, type PlayDocument, type PlayDocumentLine } from "@/stores/playDocuments";
import { usePosRegister } from "@/stores/posRegister";
import { TenderModal } from "@/features/pos/TenderModal";
import { sessionTotal } from "@/features/play/rate-engine";
import { getServiceItem } from "@/lib/mock/play";
import { simulateEta } from "./playEta";
import { cafeteriaTotal } from "./sessionDisplay";
import type { Check, Device, DeviceType, RatePlan, Session } from "@/features/play/types";

interface EndBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  device: Device | null;
  deviceType: DeviceType;
  ratePlan: RatePlan | undefined;
  check: Check | undefined;
  /** Called once the session has actually ended (not on a plain cancel) — lets the parent
   * Session Card drawer close itself too, since there's nothing left to show. */
  onDone: () => void;
}

interface TenderSettleResult {
  tenders: Record<string, number>;
  paymentStatus: "paid" | "credit";
}

/**
 * End & Bill (FE_15 §5.7). No shared "invoice preview" component exists anywhere in the
 * codebase to reuse (Sales' preview panes are hard-bound to Sales' own invoice/line types) —
 * confirmed the established convention instead is each module builds its own small inline
 * preview (mirrors `ReleaseWorkOrderDialog`'s line list + totals, not a shared component).
 * Tender is the real, already-reused `TenderModal` (delegated `onSettle`, same as every other
 * Play money flow). 80mm print is — everywhere in this codebase — a toast simulation, never a
 * real print call (`TicketReceiptDialog`'s `Printer` button pattern), so that's what this does.
 */
export function EndBillDialog({ open, onOpenChange, session, device, deviceType, ratePlan, check, onDone }: EndBillDialogProps) {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const can = useCan();
  const canCollect = can("play.collect");

  const devices = usePlayDevices((s) => s.devices);
  const updateDevice = usePlayDevices((s) => s.updateDevice);
  const endSession = usePlaySessions((s) => s.endSession);
  const closeCheck = usePlayChecks((s) => s.closeCheck);
  const fileDocument = usePlayDocuments((s) => s.fileDocument);
  const setPosCustomer = usePosRegister((s) => s.setCustomer);

  const [tenderOpen, setTenderOpen] = useState(false);
  const [resultDoc, setResultDoc] = useState<PlayDocument | null>(null);

  const now = new Date();
  const priced = ratePlan ? sessionTotal(session, ratePlan, now) : null;
  const timeTotal = priced?.timeTotal ?? 0;
  const cafeTotal = cafeteriaTotal(check);
  const grandTotal = timeTotal + cafeTotal;

  const serviceItem = getServiceItem(deviceType.service_item_id);
  const missingEtaCode = !serviceItem?.eta_code;

  function deviceNameFor(deviceId: string | null) {
    if (!deviceId) return lang === "ar" ? deviceType.name_ar : deviceType.name_en;
    return devices[deviceId]?.name ?? deviceId;
  }

  function buildLines(): PlayDocumentLine[] {
    // Step 2/3: one line per segment (device engine's sessionTotal already prices each
    // segment against ITS OWN device/rate — a transferred session bills every leg correctly)
    // plus any cafeteria lines already sitting on the same check.
    const timeLines: PlayDocumentLine[] = (priced?.segments ?? []).map((piece) => ({
      label: deviceNameFor(piece.segment.device_id),
      qty: piece.units,
      unit_price: piece.pricePerUnit,
      line_total: piece.subtotal,
      ...(missingEtaCode && { _flag: "missing_eta_code" as const }),
    }));
    const cafeLines: PlayDocumentLine[] = (check?.cafeteria_lines ?? []).map((l) => ({
      label: l.name_ar,
      qty: l.qty,
      unit_price: l.unit_price,
      line_total: l.line_total,
    }));
    return [...timeLines, ...cafeLines];
  }

  function handleOpenTender() {
    // Play sessions carry no full CRM customer object — see StartSessionSheet/PrepaidExtendModal.
    setPosCustomer(null);
    setTenderOpen(true);
  }

  function handleTenderSettle(result: TenderSettleResult) {
    const hasTrn = !!session.customer?.trn;
    const eta = simulateEta({ hasTrn, isOnline: navigator.onLine, missingEtaCode });

    const doc: PlayDocument = {
      id: nextDocumentId(),
      session_id: session.id,
      type: eta.channel,
      lines: buildLines(),
      time_total: timeTotal,
      cafeteria_total: cafeTotal,
      grand_total: grandTotal,
      eta,
      tender: result.tenders,
      payment_status: result.paymentStatus,
      posted: true,
      issued_at: new Date().toISOString(),
    };
    fileDocument(doc);
    // flag-don't-block: the session ends regardless of `eta.syncStatus` — a missing eta_code
    // blocks the electronic ISSUE only (reflected in `doc.eta`), never the session itself.
    endSession(session.id, doc.id, eta.syncStatus);
    if (check) closeCheck(check.id);
    if (device) {
      updateDevice(device.id, {
        name: device.name, device_type_id: device.device_type_id, branch_id: device.branch_id,
        state: "free", notes: device.notes,
      });
    }
    setTenderOpen(false);
    setResultDoc(doc);

    if (eta.syncStatus === "valid") toast.success(t("floor.end_bill_issued"));
    else if (eta.syncStatus === "queued") toast.success(t("floor.end_bill_queued", { hours: eta.window_remaining_hours }));
    else toast.warning(t("floor.end_bill_flagged"));
  }

  function handlePrint() {
    toast.info(t("floor.print_toast"));
  }

  function handleClose() {
    const wasCompleted = resultDoc !== null;
    onOpenChange(false);
    if (wasCompleted) onDone();
  }

  return (
    <>
      <ModalShell
        open={open}
        onOpenChange={(o) => { if (!o) handleClose(); }}
        title={t("floor.end_bill_title", { name: deviceNameFor(session.device_id) })}
        size="md"
        footer={
          resultDoc ? (
            <>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 me-1.5" />
                {t("floor.print_80mm")}
              </Button>
              <Button onClick={handleClose}>{t("floor.done")}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>{t("cancel")}</Button>
              <Button onClick={handleOpenTender} disabled={!canCollect}>{t("floor.end_bill_confirm")}</Button>
            </>
          )
        }
      >
        {resultDoc ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">{t("floor.end_bill_receipt_title")}</p>
            <p className="text-xs text-muted-foreground">
              {t(resultDoc.type === "e_invoice" ? "floor.doc_type_e_invoice" : "floor.doc_type_e_receipt")}
              {" · "}
              <span dir="ltr">{resultDoc.id}</span>
            </p>

            <div className="rounded border border-border p-3 space-y-1 text-sm">
              {resultDoc.lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate">{l.label} × {l.qty}</span>
                  <span className="tabular-nums shrink-0">{formatMoney(l.line_total, lang)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-border">
                <span>{t("floor.end_bill_grand_total")}</span>
                <span className="tabular-nums">{formatMoney(resultDoc.grand_total, lang)}</span>
              </div>
            </div>

            {resultDoc.eta.syncStatus === "valid" && (
              <p className="text-xs text-success-text bg-success-tint rounded px-3 py-2">{t("floor.end_bill_issued")}</p>
            )}
            {resultDoc.eta.syncStatus === "queued" && (
              <p className="text-xs text-warning-text bg-warning-tint rounded px-3 py-2">
                {t("floor.end_bill_queued", { hours: resultDoc.eta.window_remaining_hours })}
              </p>
            )}
            {resultDoc.eta.syncStatus === "flagged_missing_code" && (
              <p className="text-xs text-warning-text bg-warning-tint rounded px-3 py-2 flex items-center gap-1.5">
                <Flag className="h-3 w-3 shrink-0" /> {t("floor.end_bill_flagged")}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded border border-border p-3 space-y-1 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1">
                {t("floor.end_bill_lines_title")}
              </p>
              {buildLines().map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate">{l.label} × {l.qty}</span>
                  <span className="tabular-nums shrink-0">{formatMoney(l.line_total, lang)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border text-muted-foreground">
                <span>{t("floor.end_bill_time_total")}</span>
                <span className="tabular-nums">{formatMoney(timeTotal, lang)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("floor.cafeteria_total")}</span>
                <span className="tabular-nums">{formatMoney(cafeTotal, lang)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-border">
                <span>{t("floor.end_bill_grand_total")}</span>
                <span className="tabular-nums">{formatMoney(grandTotal, lang)}</span>
              </div>
            </div>

            {missingEtaCode && (
              <p className="text-xs text-warning-text bg-warning-tint rounded px-3 py-2 flex items-center gap-1.5">
                <Flag className="h-3 w-3 shrink-0" /> {t("floor.end_bill_missing_eta_warning")}
              </p>
            )}
            {!canCollect && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> {t("floor.collect_permission_required")}
              </p>
            )}
          </div>
        )}
      </ModalShell>

      <TenderModal
        open={tenderOpen}
        onOpenChange={setTenderOpen}
        grandTotal={grandTotal}
        tax={0}
        onSettle={handleTenderSettle}
      />
    </>
  );
}
