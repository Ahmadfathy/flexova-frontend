import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Coffee, ArrowLeftRight, Pause, Play, Receipt, XCircle, Lock } from "lucide-react";

import { DrawerShell } from "@/components/patterns/DrawerShell";
import { Button } from "@/components/ui/button";

import { formatMoney, formatTime } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePlayDevices } from "@/stores/playDevices";
import { usePlaySessions } from "@/stores/playSessions";
import { resolveRule, sessionTotal } from "@/features/play/rate-engine";
import type { Check, Device, DeviceType, RatePlan, Session } from "@/features/play/types";
import {
  cafeteriaTotal, computeRunningTotal, elapsedMs, formatDuration, remainingMsForPrepaid,
} from "./sessionDisplay";

interface SessionCardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  device: Device | null;
  deviceType: DeviceType;
  ratePlan: RatePlan | undefined;
  check: Check | undefined;
}

/** Session Card drawer (FE_15 §5.3). Segments/cafeteria/running-total/counter are all read
 * live from props recomputed by `FloorGridPage` every shared tick — this component itself
 * holds no timer. Pause/Resume are real (§6); +Cafeteria/Transfer/End & bill/Cancel are stubs
 * (their own screens are later steps), matching how the Start Session step left busy-device
 * taps stubbed until this step gave them a real drawer. */
export function SessionCardDrawer({
  open, onOpenChange, session, device, deviceType, ratePlan, check,
}: SessionCardDrawerProps) {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const can = useCan();
  const canCancel = can("play.cancel");

  const devices = usePlayDevices((s) => s.devices);
  const pauseSession = usePlaySessions((s) => s.pauseSession);
  const resumeSession = usePlaySessions((s) => s.resumeSession);
  const updateDevice = usePlayDevices((s) => s.updateDevice);

  const now = new Date();

  const targetName = device ? device.name : (lang === "ar" ? deviceType.name_ar : deviceType.name_en);

  const priced = ratePlan ? sessionTotal(session, ratePlan, now) : null;
  const cafeTotal = cafeteriaTotal(check);
  const runningTotal = computeRunningTotal(session, ratePlan, check, now);

  const counterMs = session.mode === "prepaid" ? remainingMsForPrepaid(session, now) : elapsedMs(session, now);
  const counterDirection = session.mode === "prepaid" ? "down" : "up";

  function deviceNameFor(deviceId: string | null) {
    if (!deviceId) return (lang === "ar" ? deviceType.name_ar : deviceType.name_en);
    return devices[deviceId]?.name ?? deviceId;
  }

  function setDeviceState(state: "busy" | "paused") {
    if (!device) return;
    updateDevice(device.id, {
      name: device.name,
      device_type_id: device.device_type_id,
      branch_id: device.branch_id,
      state,
      notes: device.notes,
    });
  }

  function handlePause() {
    pauseSession(session.id);
    setDeviceState("paused");
    toast.success(t("floor.paused_toast"));
  }

  function handleResume() {
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
    resumeSession(session.id, session.device_id, { rule_id: rule.id, price_per_unit: rule.price_per_unit });
    setDeviceState("busy");
    toast.success(t("floor.resumed_toast"));
  }

  function handleStub() {
    toast.info(t("floor.stub_toast"));
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("floor.session_title", { name: targetName })}
      size="lg"
    >
      <div className="space-y-5">
        {/* Live counter + running total */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t("running_total")}</p>
            <p className="text-lg font-semibold tabular-nums">
              {runningTotal !== null ? formatMoney(runningTotal, lang) : "—"}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs text-muted-foreground">{counterDirection === "down" ? t("floor.remaining_label") : t("floor.elapsed_label")}</p>
            <p className="text-lg font-bold tabular-nums" dir="ltr">{formatDuration(counterMs)}</p>
          </div>
        </div>

        {/* Segments */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("log.segments")}</p>
          <div className="space-y-2">
            {(priced?.segments ?? []).map((piece) => {
              const segStart = new Date(piece.segment.start).getTime();
              const segEnd = piece.segment.stop ? new Date(piece.segment.stop).getTime() : now.getTime();
              const segDurationMs = Math.max(0, segEnd - segStart);
              return (
                <div key={piece.segment.id} className="rounded border border-border p-2.5 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{deviceNameFor(piece.segment.device_id)}</span>
                    <span className="font-semibold tabular-nums shrink-0">{formatMoney(piece.subtotal, lang)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span dir="ltr">
                      {formatTime(piece.segment.start)}–{piece.segment.stop ? formatTime(piece.segment.stop) : t("floor.segment_running")}
                    </span>
                    <span className="tabular-nums" dir="ltr">{formatDuration(segDurationMs)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatMoney(piece.pricePerUnit, lang)} / {ratePlan ? t(`rate.unit_${ratePlan.unit}`) : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cafeteria */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("floor.cafeteria_title")}</p>
          {check && check.cafeteria_lines.length > 0 ? (
            <div className="space-y-1">
              {check.cafeteria_lines.map((line, i) => (
                // CafeteriaLine only carries `name_ar` (fixture/type quirk, not fixed here) —
                // shown as-is regardless of `lang`.
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{line.name_ar} × {line.qty}</span>
                  <span className="tabular-nums">{formatMoney(line.line_total, lang)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-border">
                <span>{t("floor.cafeteria_total")}</span>
                <span className="tabular-nums">{formatMoney(cafeTotal, lang)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("floor.cafeteria_empty")}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleStub}>
            <Coffee className="h-4 w-4 me-1.5" />
            {t("add_cafe")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleStub}>
            <ArrowLeftRight className="h-4 w-4 me-1.5" />
            {t("transfer")}
          </Button>
          {session.state === "paused" ? (
            <Button variant="outline" size="sm" onClick={handleResume}>
              <Play className="h-4 w-4 me-1.5" />
              {t("resume")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="h-4 w-4 me-1.5" />
              {t("pause")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleStub}>
            <Receipt className="h-4 w-4 me-1.5" />
            {t("end")}
          </Button>
          <Button
            variant="ghost" size="sm" className="text-danger hover:text-danger hover:bg-danger-tint"
            onClick={handleStub}
            disabled={!canCancel}
          >
            <XCircle className="h-4 w-4 me-1.5" />
            {t("cancel")}
          </Button>
        </div>
        {!canCancel && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> {t("floor.cancel_permission_required")}
          </p>
        )}
      </div>
    </DrawerShell>
  );
}
