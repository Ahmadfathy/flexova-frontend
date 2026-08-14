import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useHealthcareClinical } from "@/stores/healthcareClinical";
import { useHealthcareAudit } from "@/stores/healthcareAudit";
import { CURRENT_STAFF_ACTOR } from "@/features/healthcare/currentUser";
import type { HcOrder } from "@/features/healthcare/types";

interface ResultEntryModalProps {
  order: HcOrder | null;
  /** For the access-log event (spec §11) — looked up by the caller from the order's encounter. */
  patientId: string | undefined;
  onOpenChange: (open: boolean) => void;
}

/** "إدخال نتيجة" (spec §7.3) — value/text + attachment (v1 image/PDF, stored as
 * just a filename in this mock layer) + note → order flips to ready. Entering
 * a result is itself a clinical-PHI write the technician performs on this
 * patient, so it gets the same who/whom/when access-log event as any other
 * clinical-surface open (spec §11). */
export function ResultEntryModal({ order, patientId, onOpenChange }: ResultEntryModalProps) {
  const { t } = useTranslation("healthcare");
  const enterResult = useHealthcareClinical((s) => s.enterResult);
  const logAccess = useHealthcareAudit((s) => s.logAccess);

  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState("");
  const [note, setNote] = useState("");

  function reset() {
    setValue(""); setAttachment(""); setNote("");
  }

  function handleSave() {
    if (!order) return;
    if (!value.trim()) {
      toast.error(t("lab.result_missing_value"));
      return;
    }
    enterResult(order.id, { value: value.trim(), attachment: attachment || undefined, note: note.trim() || undefined });
    if (patientId) {
      logAccess({ actor: CURRENT_STAFF_ACTOR, patient_id: patientId, surface: "lab_result", action: "write" });
    }
    toast.success(t("lab.result_saved"));
    reset();
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={!!order}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      title={order ? `${t("lab.enter_result")} — ${order.name_ar}` : t("lab.enter_result")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave}>{t("common:save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("lab.result_value")}</Label>
          <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} placeholder={t("lab.result_value_placeholder")} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" /> {t("lab.result_attachment")}</Label>
          <Input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setAttachment(e.target.files?.[0]?.name ?? "")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("lab.result_note")}</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t("lab.result_note_placeholder")} />
        </div>
      </div>
    </ModalShell>
  );
}
