import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { getRatePlans, getServiceItems } from "@/lib/mock/play";
import { DEVICE_TYPE_ICONS, DEVICE_TYPE_COLORS, deviceTypeColorDotClass } from "./deviceTypeOptions";
import type { SaveDeviceTypeInput } from "@/stores/playDeviceTypes";
import type { DeviceType, DeviceOccupancy, PlayMode } from "@/features/play/types";

interface DeviceTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DeviceType | null;
  onSave: (input: SaveDeviceTypeInput) => void;
}

const PLAY_MODES: PlayMode[] = ["single", "double"];

export function DeviceTypeDialog({ open, onOpenChange, initial, onSave }: DeviceTypeDialogProps) {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();

  const ratePlans = getRatePlans();
  const serviceItems = getServiceItems();

  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [occupancy, setOccupancy] = useState<DeviceOccupancy>(initial?.occupancy ?? "station");
  const [ratePlanId, setRatePlanId] = useState(initial?.rate_plan_id ?? "");
  const [serviceItemId, setServiceItemId] = useState(initial?.service_item_id ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "gamepad-2");
  const [color, setColor] = useState(initial?.color ?? "brand");
  const [playModeTags, setPlayModeTags] = useState<PlayMode[]>(initial?.play_mode_tags ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleMode(mode: PlayMode, checked: boolean) {
    setPlayModeTags((tags) => (checked ? [...tags, mode] : tags.filter((m) => m !== mode)));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!nameAr.trim()) e.name_ar = t("dt.name_ar_required");
    if (!nameEn.trim()) e.name_en = t("dt.name_en_required");
    if (!ratePlanId) e.rate_plan = t("dt.rate_plan_required");
    if (!serviceItemId) e.service_item = t("dt.service_item_required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      occupancy,
      rate_plan_id: ratePlanId,
      service_item_id: serviceItemId,
      icon,
      color,
      play_mode_tags: playModeTags,
    });
  }

  const IconPreview = DEVICE_TYPE_ICONS[icon];

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? t("dt.form_title_edit") : t("dt.form_title_new")}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleSave}>{t("save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("dt.form_name_ar")} *</Label>
            <Input
              value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl"
              className={cn(errors.name_ar && "border-destructive")}
            />
            {errors.name_ar && <p className="text-xs text-destructive">{errors.name_ar}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("dt.form_name_en")} *</Label>
            <Input
              value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr"
              className={cn(errors.name_en && "border-destructive")}
            />
            {errors.name_en && <p className="text-xs text-destructive">{errors.name_en}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dt.occupancy")}</Label>
          <Select value={occupancy} onValueChange={(v) => setOccupancy(v as DeviceOccupancy)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="station">{t("dt.station")}</SelectItem>
              <SelectItem value="ticket">{t("dt.ticket")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dt.form_rate_plan")} *</Label>
          <Select value={ratePlanId} onValueChange={setRatePlanId}>
            <SelectTrigger className={cn(errors.rate_plan && "border-destructive")}>
              <SelectValue placeholder={t("dt.form_rate_plan_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {ratePlans.map((rp) => (
                <SelectItem key={rp.id} value={rp.id}>{lang === "ar" ? rp.name_ar : rp.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.rate_plan && <p className="text-xs text-destructive">{errors.rate_plan}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dt.form_service_item")} *</Label>
          <Select value={serviceItemId} onValueChange={setServiceItemId}>
            <SelectTrigger className={cn(errors.service_item && "border-destructive")}>
              <SelectValue placeholder={t("dt.form_service_item_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {serviceItems.map((si) => (
                <SelectItem key={si.id} value={si.id}>{lang === "ar" ? si.name_ar : si.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.service_item && <p className="text-xs text-destructive">{errors.service_item}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("dt.form_icon")}</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <span className="flex items-center gap-2">
                  {IconPreview && <IconPreview className="h-4 w-4" />}
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEVICE_TYPE_ICONS).map(([key, Icon]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {key}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("dt.form_color")}</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <span className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", deviceTypeColorDotClass(color))} />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {DEVICE_TYPE_COLORS.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", deviceTypeColorDotClass(c))} />
                      {c}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dt.form_play_modes")}</Label>
          <div className="flex items-center gap-4">
            {PLAY_MODES.map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={playModeTags.includes(mode)}
                  onCheckedChange={(checked) => toggleMode(mode, checked === true)}
                />
                {t(`dt.play_mode_${mode}`)}
              </label>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
