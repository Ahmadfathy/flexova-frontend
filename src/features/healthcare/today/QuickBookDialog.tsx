import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimePicker } from "@/components/patterns/TimePicker";
import { useAppearance } from "@/stores/appearance";
import { useHealthcareBoard } from "@/stores/healthcareBoard";
import { getPatients, getProviders, patientName, providerName } from "@/lib/mock/healthcare";

/**
 * "＋ موعد" — lightweight local booking (spec §3.2). Today Board only *reads*
 * Brief 3 appointments (coverage matrix §13 row 2); Healthcare patients aren't
 * Brief 3 clients, so this books a same-shape board slot locally rather than
 * routing through SVC's client-bound AppointmentDrawer. Full slot-conflict
 * checking stays on Brief 3's engine when a real cross-module adapter lands.
 */
interface QuickBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickBookDialog({ open, onOpenChange }: QuickBookDialogProps) {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const addBooking = useHealthcareBoard((s) => s.addBooking);

  const patients = getPatients();
  const providers = getProviders().filter((p) => p.role === "doctor");

  const [patientId, setPatientId] = useState<string>("");
  const [providerId, setProviderId] = useState<string>("");
  const [time, setTime] = useState("09:00");

  function reset() {
    setPatientId("");
    setProviderId("");
    setTime("09:00");
  }

  function handleSave() {
    if (!patientId || !providerId) {
      toast.error(t("today.book_missing_fields"));
      return;
    }
    addBooking({
      appointment_id: `ap_local_${Date.now()}`,
      time,
      patient_id: patientId,
      provider_id: providerId,
    });
    toast.success(t("today.book_success"));
    reset();
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      title={t("today.book_title")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave}>{t("common:save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("today.book_patient")}</Label>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger><SelectValue placeholder={t("today.book_patient_placeholder")} /></SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>{patientName(p, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{t("today.book_provider")}</Label>
          <Select value={providerId} onValueChange={setProviderId}>
            <SelectTrigger><SelectValue placeholder={t("today.book_provider_placeholder")} /></SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{providerName(p, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{t("today.book_time")}</Label>
          <TimePicker value={time} onChange={setTime} />
        </div>
      </div>
    </ModalShell>
  );
}
