import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";

import { DrawerShell } from "@/components/patterns/DrawerShell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/EmptyState";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { usePlayDevices } from "@/stores/playDevices";
import { usePlayDeviceTypes } from "@/stores/playDeviceTypes";
import { usePlayRatePlans } from "@/stores/playRatePlans";
import { usePlaySessions } from "@/stores/playSessions";
import { resolveRule } from "@/features/play/rate-engine";
import type { Device, Session } from "@/features/play/types";

interface TransferSessionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  currentDevice: Device;
}

/** Transfer sheet (FE_15 §5.5) — lists free devices of ANY type (a PS4→PS5 transfer costing
 * more is correct and intended: each free device previews the rate it would charge THIS
 * session's play_mode right now, resolved via the real rate engine, not reimplemented). */
export function TransferSessionSheet({ open, onOpenChange, session, currentDevice }: TransferSessionSheetProps) {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();

  const devices = usePlayDevices((s) => s.devices);
  const deviceTypes = usePlayDeviceTypes((s) => s.deviceTypes);
  const ratePlans = usePlayRatePlans((s) => s.ratePlans);
  const updateDevice = usePlayDevices((s) => s.updateDevice);
  const transferSession = usePlaySessions((s) => s.transferSession);

  const [targetId, setTargetId] = useState<string | null>(null);

  // Guard (§5.5): only free devices are ever listed, so reserved/out-of-service devices are
  // structurally impossible to pick — never shown, not merely disabled.
  const freeDevices = useMemo(
    () => Object.values(devices).filter((d) => d.state === "free" && d.branch_id === currentDevice.branch_id),
    [devices, currentDevice.branch_id]
  );

  function ruleFor(device: Device) {
    const dt = deviceTypes[device.device_type_id];
    const ratePlan = dt ? ratePlans[dt.rate_plan_id] : undefined;
    if (!dt || !ratePlan) return null;
    try {
      return resolveRule(ratePlan, new Date(), session.play_mode);
    } catch {
      return null;
    }
  }

  function handleConfirm() {
    if (!targetId) return;
    const targetDevice = devices[targetId];
    if (!targetDevice || targetDevice.state !== "free") return; // re-check — guard against stale state
    const rule = ruleFor(targetDevice);
    if (!rule) {
      toast.error(t("floor.no_rate_rule_error"));
      return;
    }

    transferSession(session.id, targetDevice.id, targetDevice.device_type_id, {
      rule_id: rule.id,
      price_per_unit: rule.price_per_unit,
    });
    updateDevice(currentDevice.id, {
      name: currentDevice.name,
      device_type_id: currentDevice.device_type_id,
      branch_id: currentDevice.branch_id,
      state: "free",
      notes: currentDevice.notes,
    });
    updateDevice(targetDevice.id, {
      name: targetDevice.name,
      device_type_id: targetDevice.device_type_id,
      branch_id: targetDevice.branch_id,
      state: "busy",
      notes: targetDevice.notes,
    });

    toast.success(t("floor.transfer_toast", { name: targetDevice.name }));
    setTargetId(null);
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("transfer")}
      description={t("transfer_sheet.pick")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleConfirm} disabled={!targetId}>{t("floor.transfer_confirm")}</Button>
        </>
      }
    >
      {freeDevices.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title={t("floor.transfer_no_free_devices")} />
      ) : (
        <div className="space-y-2">
          {freeDevices.map((device) => {
            const dt = deviceTypes[device.device_type_id];
            const rule = ruleFor(device);
            const selected = targetId === device.id;
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => setTargetId(device.id)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded border-2 p-3 text-start transition-colors",
                  selected ? "border-brand bg-brand-tint" : "border-border hover:border-foreground"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{device.name}</p>
                  {dt && <p className="text-xs text-muted-foreground truncate">{lang === "ar" ? dt.name_ar : dt.name_en}</p>}
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {rule ? formatMoney(rule.price_per_unit, lang) : "—"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </DrawerShell>
  );
}
