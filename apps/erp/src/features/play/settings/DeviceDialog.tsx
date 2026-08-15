import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { getBranches } from "@/lib/mock/play";
import { usePlayDeviceTypes } from "@/stores/playDeviceTypes";
import type { SaveDeviceInput } from "@/stores/playDevices";
import type { Device, DeviceState } from "@/features/play/types";

interface DeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Device | null;
  onSave: (input: SaveDeviceInput) => void;
}

const DEVICE_STATES: DeviceState[] = ["free", "busy", "reserved", "paused", "out_of_service"];

export function DeviceDialog({ open, onOpenChange, initial, onSave }: DeviceDialogProps) {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();

  const deviceTypes = usePlayDeviceTypes((s) => s.deviceTypes);
  const deviceTypeList = Object.values(deviceTypes);
  const branches = getBranches();

  const [name, setName] = useState(initial?.name ?? "");
  const [deviceTypeId, setDeviceTypeId] = useState(initial?.device_type_id ?? "");
  const [branchId, setBranchId] = useState(initial?.branch_id ?? branches[0]?.id ?? "");
  const [state, setState] = useState<DeviceState>(initial?.state ?? "free");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t("dev.name_required");
    if (!deviceTypeId) e.device_type = t("dev.type_required");
    if (!branchId) e.branch = t("dev.branch_required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      device_type_id: deviceTypeId,
      branch_id: branchId,
      state,
      notes: notes.trim(),
    });
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? t("dev.form_title_edit") : t("dev.form_title_new")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleSave}>{t("save")}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dev.form_name")} *</Label>
          <Input
            value={name} onChange={(e) => setName(e.target.value)} dir="ltr"
            className={cn("font-mono", errors.name && "border-destructive")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dev.form_type")} *</Label>
          <Select value={deviceTypeId} onValueChange={setDeviceTypeId}>
            <SelectTrigger className={cn(errors.device_type && "border-destructive")}>
              <SelectValue placeholder={t("dev.form_type_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {deviceTypeList.map((dt) => (
                <SelectItem key={dt.id} value={dt.id}>{lang === "ar" ? dt.name_ar : dt.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.device_type && <p className="text-xs text-destructive">{errors.device_type}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dev.form_branch")} *</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className={cn(errors.branch && "border-destructive")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.branch && <p className="text-xs text-destructive">{errors.branch}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dev.form_state")}</Label>
          <Select value={state} onValueChange={(v) => setState(v as DeviceState)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEVICE_STATES.map((s) => (
                <SelectItem key={s} value={s}>{t(`device.${s === "out_of_service" ? "oos" : s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dev.form_notes")}</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} dir="rtl" />
        </div>
      </div>
    </ModalShell>
  );
}
