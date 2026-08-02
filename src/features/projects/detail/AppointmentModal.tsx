import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField, FormGrid } from "@/components/patterns/FormLayout";
import { DatePicker } from "@/components/patterns/DatePicker";
import { TimePicker } from "@/components/patterns/TimePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppointmentFormInput } from "@/stores/projectsStore";

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills the date when opened from a specific day column tap. */
  defaultDate?: string;
  onSave: (input: AppointmentFormInput) => void;
}

/** Create-appointment modal for the project-scoped Appointments tab (spec §10.2) — links to the project/client automatically, no billing fields. */
export function AppointmentModal({ open, onOpenChange, defaultDate, onSave }: AppointmentModalProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
    setStartTime("09:00");
    setEndTime("10:00");
    setAttempted(false);
  }, [open, defaultDate]);

  const titleError = attempted && !title.trim() ? t("appt.title_required") : undefined;
  const timeError = attempted && date && startTime >= endTime ? t("appt.time_required") : undefined;

  function handleSave() {
    setAttempted(true);
    if (!title.trim() || !date || startTime >= endTime) return;
    onSave({
      title_ar: title.trim(),
      start_ts: `${date}T${startTime}:00`,
      end_ts: `${date}T${endTime}:00`,
    });
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("appt.new")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button onClick={handleSave}>{tCommon("save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t("appt.field_title")} required error={titleError}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} dir="rtl" />
        </FormField>

        <FormField label={t("appt.date")} required>
          <DatePicker value={date} onChange={setDate} />
        </FormField>

        <FormGrid cols={2}>
          <FormField label={t("appt.start_time")} error={timeError}>
            <TimePicker value={startTime} onChange={setStartTime} />
          </FormField>
          <FormField label={t("appt.end_time")}>
            <TimePicker value={endTime} onChange={setEndTime} />
          </FormField>
        </FormGrid>
      </div>
    </ModalShell>
  );
}
