import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ModalShell } from "@/components/patterns/ModalShell";
import { TimePicker } from "@/components/patterns/TimePicker";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ScheduleCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleCreateModal({ open, onOpenChange }: ScheduleCreateModalProps) {
  const { t, i18n } = useTranslation("reports");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";

  const [name, setName]       = useState("");
  const [target, setTarget]   = useState("");
  const [cadence, setCadence] = useState<string>("");
  const [time, setTime]       = useState("08:00");
  const [channel, setChannel] = useState<string>("");

  function onClose() {
    onOpenChange(false);
  }

  function handleSave() {
    onClose();
    setName(""); setTarget(""); setCadence(""); setTime("08:00"); setChannel("");
    toast.success(t("scheduling.saved_toast"));
  }

  const valid = name.trim() && target.trim() && cadence && channel;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("scheduling.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!valid} onClick={handleSave}>
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("scheduling.form_name")} *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("scheduling.form_target")} *</Label>
          <Input value={target} onChange={e => setTarget(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("scheduling.form_cadence")} *</Label>
            <Select value={cadence} onValueChange={setCadence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("scheduling.cadence_daily")}</SelectItem>
                <SelectItem value="weekly">{t("scheduling.cadence_weekly")}</SelectItem>
                <SelectItem value="monthly">{t("scheduling.cadence_monthly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("scheduling.form_time")}</Label>
            <TimePicker value={time} onChange={setTime} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("scheduling.form_channel")} *</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">{t("scheduling.channel_whatsapp")}</SelectItem>
              <SelectItem value="email">{t("scheduling.channel_email")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ModalShell>
  );
}
