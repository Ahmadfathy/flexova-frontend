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
import type { HcOrder } from "@/features/healthcare/types";

interface ResultEntryModalProps {
  order: HcOrder | null;
  onOpenChange: (open: boolean) => void;
}

/** "إدخال نتيجة" (spec §7.3) — value/text + attachment (v1 image/PDF, stored as
 * just a filename in this mock layer) + note → order flips to ready. */
export function ResultEntryModal({ order, onOpenChange }: ResultEntryModalProps) {
  const { t } = useTranslation("healthcare");
  const enterResult = useHealthcareClinical((s) => s.enterResult);

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
