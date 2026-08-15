import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MessageCircle, Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { useCrmData } from "../data/useCrmData";

interface CommunicationCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommunicationCreateModal({ open, onOpenChange }: CommunicationCreateModalProps) {
  const { t, i18n } = useTranslation("crm");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data } = useCrmData();

  const customers = useMemo(
    () => (data?.customers ?? []).filter(c => !c.is_walkin),
    [data?.customers],
  );
  const templates = data?.whatsappTemplates ?? [];

  const [customerId, setCust] = useState("");
  const [templateId, setTmpl] = useState("");
  const [sending, setSending] = useState(false);

  const selectedTmpl = templates.find(tp => tp.id === templateId);
  const isValid = customerId && templateId;

  function onClose() {
    onOpenChange(false);
  }

  async function handleSend() {
    if (!isValid) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 600));
    setSending(false);
    onClose();
    toast.success(t("communications.sent_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={
        <span className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-500" />
          {t("communications.form_title")}
        </span>
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button
            disabled={!isValid || sending}
            onClick={handleSend}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            {sending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <MessageCircle className="h-4 w-4" />
            }
            {t("communications.send_btn")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("communications.form_customer")} *</Label>
          <Select value={customerId} onValueChange={setCust}>
            <SelectTrigger>
              <SelectValue placeholder={t("communications.form_customer_ph")} />
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
          <Label className="text-xs text-muted-foreground">{t("communications.form_template")} *</Label>
          <Select value={templateId} onValueChange={setTmpl}>
            <SelectTrigger>
              <SelectValue placeholder={t("communications.form_template_ph")} />
            </SelectTrigger>
            <SelectContent>
              {templates.map(tp => (
                <SelectItem key={tp.id} value={tp.id}>
                  {lang === "ar" ? tp.name_ar : tp.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedTmpl && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("communications.form_preview")}</p>
              <div className="rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm text-foreground leading-relaxed">
                {selectedTmpl.body_ar}
              </div>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
