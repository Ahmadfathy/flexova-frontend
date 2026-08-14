import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimePicker } from "@/components/patterns/TimePicker";
import { useAppearance } from "@/stores/appearance";
import { useHealthcareBoard } from "@/stores/healthcareBoard";
import { useHealthcarePatients } from "@/stores/healthcarePatients";
import { getProviders, patientName, providerName } from "@/lib/mock/healthcare";
import { PatientQuickAddDialog } from "../patients/PatientQuickAddDialog";

/**
 * "＋ موعد" — lightweight local booking (spec §3.2). Today Board only *reads*
 * Brief 3 appointments (coverage matrix §13 row 2); Healthcare patients aren't
 * Brief 3 clients, so this books a same-shape board slot locally rather than
 * routing through SVC's client-bound AppointmentDrawer. Full slot-conflict
 * checking stays on Brief 3's engine when a real cross-module adapter lands.
 * Also reused from the Patients list "＋appointment" row action (spec §5.1)
 * via `defaultPatientId`, and inlines the quick-add modal (spec §5.4 —
 * "reused from Today/appointment") so an unknown caller doesn't need a
 * separate trip to the Patients screen first.
 */
interface QuickBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPatientId?: string;
}

export function QuickBookDialog({ open, onOpenChange, defaultPatientId }: QuickBookDialogProps) {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const addBooking = useHealthcareBoard((s) => s.addBooking);
  const patients = useHealthcarePatients((s) => s.patients);

  const providers = getProviders().filter((p) => p.role === "doctor");

  const [patientId, setPatientId] = useState<string>(defaultPatientId ?? "");
  const [providerId, setProviderId] = useState<string>("");
  const [time, setTime] = useState("09:00");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    if (open) setPatientId(defaultPatientId ?? "");
  }, [open, defaultPatientId]);

  function reset() {
    setPatientId(defaultPatientId ?? "");
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
    <>
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
            <div className="flex items-center justify-between">
              <Label>{t("today.book_patient")}</Label>
              {!defaultPatientId && (
                <button
                  type="button"
                  onClick={() => setQuickAddOpen(true)}
                  className="text-xs text-brand-text hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> {t("patients.quickadd_title")}
                </button>
              )}
            </div>
            <Select value={patientId} onValueChange={setPatientId} disabled={!!defaultPatientId}>
              <SelectTrigger><SelectValue placeholder={t("today.book_patient_placeholder")} /></SelectTrigger>
              <SelectContent>
                {Object.values(patients).map((p) => (
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

      <PatientQuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={(patient) => setPatientId(patient.id)}
      />
    </>
  );
}
