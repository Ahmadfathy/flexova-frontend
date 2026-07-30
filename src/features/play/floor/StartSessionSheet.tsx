import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { User, X, Lock } from "lucide-react";

import { DrawerShell } from "@/components/patterns/DrawerShell";
import { FormField } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { getEmployees } from "@/lib/mock/hr";
import { usePlayRatePlans } from "@/stores/playRatePlans";
import { usePlaySectorSettings } from "@/stores/playSectorSettings";
import { usePlaySessions } from "@/stores/playSessions";
import { usePlayChecks, nextCheckId } from "@/stores/playChecks";
import { usePlayDevices } from "@/stores/playDevices";
import { usePosRegister } from "@/stores/posRegister";
import { TenderModal } from "@/features/pos/TenderModal";
import { resolveRule } from "@/features/play/rate-engine";
import type { Device, DeviceType, PlayMode, SessionCustomer, SessionMode } from "@/features/play/types";
import { PlayCustomerPicker } from "./PlayCustomerPicker";

interface StartSessionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null when starting a ticket/pool session (occupancy='ticket') — no physical device. */
  device: Device | null;
  deviceType: DeviceType;
}

interface TenderSettleResult {
  syncStatus: "local" | "queued";
}

/** Start Session sheet (FE_15 §5.2). Postpaid defaults to a 2-tap flow (tap device → tap
 * Start); prepaid delegates to the existing TenderModal — reused exactly as
 * `ReleaseWorkOrderDialog` reuses it — as a single inline "Start & pay" step. */
export function StartSessionSheet({ open, onOpenChange, device, deviceType }: StartSessionSheetProps) {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const can = useCan();
  const canCollect = can("play.collect");

  const ratePlan = usePlayRatePlans((s) => s.ratePlans[deviceType.rate_plan_id]);
  const hrCommissionEnabled = usePlaySectorSettings((s) => s.hrCommissionEnabled);
  const startSession = usePlaySessions((s) => s.startSession);
  const createCheck = usePlayChecks((s) => s.createCheck);
  const updateDevice = usePlayDevices((s) => s.updateDevice);
  const setPosCustomer = usePosRegister((s) => s.setCustomer);

  const employees = useMemo(() => (hrCommissionEnabled ? getEmployees() : []), [hrCommissionEnabled]);
  const blocks = useMemo(() => ratePlan?.prepaid_blocks ?? [], [ratePlan]);
  const hasPlayModes = deviceType.play_mode_tags.length > 0;

  const [mode, setMode] = useState<SessionMode>("postpaid");
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? "");
  const [blockError, setBlockError] = useState(false);
  const [customer, setCustomer] = useState<SessionCustomer | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [supervisorId, setSupervisorId] = useState("");
  const [playMode, setPlayMode] = useState<PlayMode | "">(deviceType.play_mode_tags[0] ?? "");
  const [tenderOpen, setTenderOpen] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === blockId);
  const targetName = device ? device.name : (lang === "ar" ? deviceType.name_ar : deviceType.name_en);

  function resolvedPlayMode(): PlayMode | null {
    return playMode === "" ? null : playMode;
  }

  function markDeviceBusy() {
    if (!device) return;
    updateDevice(device.id, {
      name: device.name,
      device_type_id: device.device_type_id,
      branch_id: device.branch_id,
      state: "busy",
      notes: device.notes,
    });
  }

  function handleStartPostpaid() {
    if (!ratePlan) {
      toast.error(t("floor.no_rate_rule_error"));
      return;
    }
    let rule;
    try {
      rule = resolveRule(ratePlan, new Date(), resolvedPlayMode());
    } catch {
      toast.error(t("floor.no_rate_rule_error"));
      return;
    }

    const checkId = nextCheckId();
    const session = startSession({
      device_id: device?.id ?? null,
      device_type_id: deviceType.id,
      mode: "postpaid",
      customer,
      supervisor_id: supervisorId || null,
      play_mode: resolvedPlayMode(),
      check_id: checkId,
      firstSegment: { rule_id: rule.id, price_per_unit: rule.price_per_unit },
    });
    createCheck(checkId, session.id);
    markDeviceBusy();
    toast.success(t("floor.session_started_toast"));
    onOpenChange(false);
  }

  function handleOpenTender() {
    if (!selectedBlock) {
      setBlockError(true);
      return;
    }
    setBlockError(false);
    // Play sessions don't carry a full CRM customer object (only name/phone) — cash/card
    // tender works regardless, matching `ReleaseWorkOrderDialog`'s reuse of TenderModal.
    setPosCustomer(null);
    setTenderOpen(true);
  }

  function handleTenderSettle(result: TenderSettleResult) {
    if (!selectedBlock) return;
    const checkId = nextCheckId();
    const receiptId = `rcpt_${Date.now()}`;
    const session = startSession({
      device_id: device?.id ?? null,
      device_type_id: deviceType.id,
      mode: "prepaid",
      customer,
      supervisor_id: supervisorId || null,
      play_mode: resolvedPlayMode(),
      check_id: checkId,
      firstSegment: { rule_id: null, price_per_unit: 0 },
      block_id: selectedBlock.id,
      block_duration_min: selectedBlock.duration_min,
      prepaid_receipt_id: receiptId,
    });
    createCheck(checkId, session.id);
    markDeviceBusy();
    setTenderOpen(false);
    toast.success(t(result.syncStatus === "queued" ? "floor.receipt_queued_toast" : "floor.receipt_issued_toast"));
    onOpenChange(false);
  }

  return (
    <>
      <DrawerShell
        open={open}
        onOpenChange={onOpenChange}
        title={t("floor.start_sheet_title", { name: targetName })}
        size="md"
        footer={
          mode === "postpaid" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
              <Button onClick={handleStartPostpaid}>{t("start")}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
              <Button onClick={handleOpenTender} disabled={!canCollect}>{t("start_pay")}</Button>
            </>
          )
        }
      >
        <div className="space-y-5">
          <FormField label={t("floor.mode_label")}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("postpaid")}
                className={cn(
                  "h-11 rounded border-2 text-sm font-medium transition-colors",
                  mode === "postpaid" ? "border-brand bg-brand-tint text-brand-text" : "border-input text-muted-foreground hover:border-foreground"
                )}
              >
                {t("mode.postpaid")}
              </button>
              <button
                type="button"
                onClick={() => canCollect && setMode("prepaid")}
                disabled={!canCollect}
                className={cn(
                  "h-11 rounded border-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  mode === "prepaid" ? "border-brand bg-brand-tint text-brand-text" : "border-input text-muted-foreground hover:border-foreground"
                )}
              >
                {t("mode.prepaid")}
              </button>
            </div>
            {!canCollect && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> {t("floor.collect_permission_required")}
              </p>
            )}
          </FormField>

          {mode === "prepaid" && (
            <FormField label={t("pick_block")} error={blockError ? t("floor.block_required") : undefined}>
              {blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("floor.no_blocks")}</p>
              ) : (
                <Select value={blockId} onValueChange={(v) => { setBlockId(v); setBlockError(false); }}>
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
          )}

          <FormField label={t("floor.customer_label")}>
            {customer ? (
              <div className="flex items-center justify-between gap-2 rounded border border-border px-3 h-11">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  {customer.phone && <p className="text-xs text-muted-foreground" dir="ltr">{customer.phone}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setCustomer(null)} aria-label={t("floor.customer_clear")}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-muted-foreground rounded border border-dashed border-border px-3 h-11 flex items-center">
                  {t("floor.customer_walkin")}
                </span>
                <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => setCustomerPickerOpen(true)} aria-label={t("floor.customer_pick")}>
                  <User className="h-4 w-4" />
                </Button>
              </div>
            )}
          </FormField>

          {hrCommissionEnabled && (
            <FormField label={t("floor.supervisor_label")}>
              <Select value={supervisorId || "__none__"} onValueChange={(v) => setSupervisorId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("floor.supervisor_none")}</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{lang === "ar" ? e.name_ar : e.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {hasPlayModes && (
            <FormField label={t("floor.play_mode_label")}>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${deviceType.play_mode_tags.length}, minmax(0, 1fr))` }}>
                {deviceType.play_mode_tags.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPlayMode(m)}
                    className={cn(
                      "h-11 rounded border-2 text-sm font-medium transition-colors",
                      playMode === m ? "border-brand bg-brand-tint text-brand-text" : "border-input text-muted-foreground hover:border-foreground"
                    )}
                  >
                    {t(`dt.play_mode_${m}`)}
                  </button>
                ))}
              </div>
            </FormField>
          )}
        </div>
      </DrawerShell>

      <PlayCustomerPicker
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        onPick={setCustomer}
      />

      {mode === "prepaid" && selectedBlock && (
        <TenderModal
          open={tenderOpen}
          onOpenChange={setTenderOpen}
          grandTotal={selectedBlock.price}
          tax={0}
          onSettle={handleTenderSettle}
        />
      )}
    </>
  );
}
