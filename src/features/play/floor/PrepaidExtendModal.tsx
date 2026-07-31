import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePlaySessions } from "@/stores/playSessions";
import { usePlayChecks } from "@/stores/playChecks";
import { usePosRegister } from "@/stores/posRegister";
import { TenderModal } from "@/features/pos/TenderModal";
import { resolveRule } from "@/features/play/rate-engine";
import { remainingMsForPrepaid } from "./sessionDisplay";
import { EndBillDialog } from "./EndBillDialog";
import type { Device, DeviceType, RatePlan, Session } from "@/features/play/types";

interface PrepaidExtendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  device: Device | null;
  deviceType: DeviceType;
  ratePlan: RatePlan | undefined;
}

interface TenderSettleResult {
  syncStatus: "local" | "queued";
}

/** Prepaid Extend modal (FE_15 §5.6) — raised automatically when the shared tick sees a
 * prepaid session's remaining time hit zero (also reachable manually from the Session Card
 * drawer any time before that). Three options, all acting on the SAME session in place. */
export function PrepaidExtendModal({ open, onOpenChange, session, device, deviceType, ratePlan }: PrepaidExtendModalProps) {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const can = useCan();
  const canCollect = can("play.collect");

  const extendPrepaidBlock = usePlaySessions((s) => s.extendPrepaidBlock);
  const convertToOpenCounter = usePlaySessions((s) => s.convertToOpenCounter);
  const setPosCustomer = usePosRegister((s) => s.setCustomer);
  const check = usePlayChecks((s) => s.checks[session.check_id]);

  const blocks = useMemo(() => ratePlan?.prepaid_blocks ?? [], [ratePlan]);
  const [blockId, setBlockId] = useState(session.block_id && blocks.some((b) => b.id === session.block_id) ? session.block_id : (blocks[0]?.id ?? ""));
  const [tenderOpen, setTenderOpen] = useState(false);
  const [endBillOpen, setEndBillOpen] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === blockId);
  const targetName = device ? device.name : (lang === "ar" ? deviceType.name_ar : deviceType.name_en);
  const isZero = remainingMsForPrepaid(session, new Date()) <= 0;

  function handleOpenTender() {
    if (!selectedBlock) return;
    setPosCustomer(null); // Play sessions carry no full CRM customer object — see StartSessionSheet.
    setTenderOpen(true);
  }

  function handleTenderSettle(result: TenderSettleResult) {
    if (!selectedBlock) return;
    extendPrepaidBlock(session.id, selectedBlock.duration_min, `rcpt_${Date.now()}`);
    setTenderOpen(false);
    toast.success(t(result.syncStatus === "queued" ? "floor.receipt_queued_toast" : "floor.receipt_issued_toast"));
    onOpenChange(false);
  }

  function handleOverflow() {
    if (!ratePlan) {
      toast.error(t("floor.no_rate_rule_error"));
      return;
    }
    let rule;
    try {
      rule = resolveRule(ratePlan, new Date(), session.play_mode);
    } catch {
      toast.error(t("floor.no_rate_rule_error"));
      return;
    }
    convertToOpenCounter(session.id, { rule_id: rule.id, price_per_unit: rule.price_per_unit });
    toast.success(t("floor.overflow_toast"));
    onOpenChange(false);
  }

  function handleEnd() {
    setEndBillOpen(true);
  }

  return (
    <>
      <ModalShell
        open={open && !endBillOpen}
        onOpenChange={onOpenChange}
        title={t("floor.extend_modal_title", { name: targetName })}
        size="sm"
        footer={<Button variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>}
      >
        <div className="space-y-4">
          <p className="text-sm text-warning-text bg-warning-tint rounded px-3 py-2">
            {t(isZero ? "floor.block_ended_message" : "block_ending")}
          </p>

          <FormField label={t("pick_block")}>
            {blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("floor.no_blocks")}</p>
            ) : (
              <Select value={blockId} onValueChange={setBlockId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {(lang === "ar" ? b.name_ar : b.name_en)} — {formatMoney(b.price, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <div className="flex flex-col gap-2 pt-1">
            <Button onClick={handleOpenTender} disabled={!canCollect || !selectedBlock}>
              {t("extend")}
            </Button>
            {!canCollect && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> {t("floor.collect_permission_required")}
              </p>
            )}
            <Button variant="outline" onClick={handleOverflow}>{t("overflow")}</Button>
            <Button variant="ghost" onClick={handleEnd}>{t("end")}</Button>
          </div>
        </div>
      </ModalShell>

      {selectedBlock && (
        <TenderModal
          open={tenderOpen}
          onOpenChange={setTenderOpen}
          grandTotal={selectedBlock.price}
          tax={0}
          onSettle={handleTenderSettle}
        />
      )}

      <EndBillDialog
        open={endBillOpen}
        onOpenChange={(o) => { if (!o) setEndBillOpen(false); }}
        session={session}
        device={device}
        deviceType={deviceType}
        ratePlan={ratePlan}
        check={check}
        onDone={() => onOpenChange(false)}
      />
    </>
  );
}
