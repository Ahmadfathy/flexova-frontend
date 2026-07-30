import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/patterns/TimePicker";

import { usePlayDevices } from "@/stores/playDevices";
import type { Device } from "@/features/play/types";

interface ReserveDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
}

/**
 * Reserve (§5.8): free device → name/phone/time → `reserved`, no counter (there is no
 * session yet — a reservation is purely a device-state + note, matching `Device`'s existing
 * schema, which has no dedicated reservation fields). On arrival, tapping the reserved device
 * opens the normal Start sheet (FloorGridPage wires the tap, not this dialog) — none of what's
 * entered here is read back programmatically, it only round-trips through the free-text
 * `notes` field for the cashier to see, same convention as the fixtures' own seeded
 * `dev_bl_2` ("محجوز باسم أحمد 21:00").
 */
export function ReserveDeviceDialog({ open, onOpenChange, device }: ReserveDeviceDialogProps) {
  const { t } = useTranslation("play");
  const updateDevice = usePlayDevices((s) => s.updateDevice);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("21:00");
  const [nameError, setNameError] = useState(false);

  function reset() {
    setName("");
    setPhone("");
    setTime("21:00");
    setNameError(false);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function handleConfirm() {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    const note = phone.trim()
      ? t("floor.reserve_note_with_phone", { name, phone, time })
      : t("floor.reserve_note", { name, time });
    updateDevice(device.id, {
      name: device.name,
      device_type_id: device.device_type_id,
      branch_id: device.branch_id,
      state: "reserved",
      notes: note,
    });
    toast.success(t("floor.reserve_toast"));
    handleClose(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={handleClose}
      title={t("floor.reserve_title", { name: device.name })}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => handleClose(false)}>{t("cancel")}</Button>
          <Button onClick={handleConfirm}>{t("reserve")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t("floor.reserve_name")} error={nameError ? t("floor.reserve_name_required") : undefined}>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(false); }}
            placeholder={t("floor.reserve_name")}
          />
        </FormField>
        <FormField label={t("floor.reserve_phone")}>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
        </FormField>
        <FormField label={t("floor.reserve_time")}>
          <TimePicker value={time} onChange={setTime} />
        </FormField>
      </div>
    </ModalShell>
  );
}
