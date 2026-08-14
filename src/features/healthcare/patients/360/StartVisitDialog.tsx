import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppearance } from "@/stores/appearance";
import { useHealthcareBoard } from "@/stores/healthcareBoard";
import { getProviders, providerName } from "@/lib/mock/healthcare";

interface StartVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

/** "＋ ابدأ أول زيارة" (spec §6.4 empty-Visits state) — a walk-in with no prior
 * appointment; only needs a provider, then drops straight into the encounter. */
export function StartVisitDialog({ open, onOpenChange, patientId }: StartVisitDialogProps) {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const addWalkIn = useHealthcareBoard((s) => s.addWalkIn);
  const providers = getProviders().filter((p) => p.role === "doctor");

  const [providerId, setProviderId] = useState("");

  function handleStart() {
    if (!providerId) {
      toast.error(t("today.book_missing_fields"));
      return;
    }
    const appointmentId = `ap_local_${Date.now()}`;
    const time = new Date().toTimeString().slice(0, 5);
    addWalkIn({ appointment_id: appointmentId, time, patient_id: patientId, provider_id: providerId });
    onOpenChange(false);
    navigate(`/healthcare/encounter/${appointmentId}`);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("patient360.start_visit_title")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleStart}>{t("patient360.start_visit_cta")}</Button>
        </>
      }
    >
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
    </ModalShell>
  );
}
