import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/patterns/DatePicker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { useCrmData } from "../data/useCrmData";

interface FollowUpCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FollowUpCreateModal({ open, onOpenChange }: FollowUpCreateModalProps) {
  const { t, i18n } = useTranslation("crm");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data } = useCrmData();

  const customers = useMemo(
    () => (data?.customers ?? []).filter(c => !c.is_walkin),
    [data?.customers],
  );

  const [customerId, setCust] = useState("");
  const [note, setNote]       = useState("");
  const [due, setDue]         = useState("");
  const [owner, setOwner]     = useState("");
  const [saving, setSaving]   = useState(false);

  const isValid = customerId && note.trim() && due;

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("follow_ups.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("follow_ups.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!isValid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("follow_ups.form_customer")} *</Label>
          <Select value={customerId} onValueChange={setCust}>
            <SelectTrigger>
              <SelectValue placeholder={t("follow_ups.form_customer_ph")} />
            </SelectTrigger>
            <SelectContent>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {lang === "ar" ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("follow_ups.form_note")} *</Label>
          <Input value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("follow_ups.form_due")} *</Label>
          <DatePicker value={due} onChange={setDue} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("follow_ups.form_owner")}</Label>
          <Input value={owner} onChange={e => setOwner(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
}
