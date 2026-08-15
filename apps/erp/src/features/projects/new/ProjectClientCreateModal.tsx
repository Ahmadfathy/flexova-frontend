import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useProjectsStore } from "@/stores/projectsStore";
import type { ProjectClient, ClientType } from "@/features/projects/types";

interface ProjectClientCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: ProjectClient) => void;
}

export function ProjectClientCreateModal({ open, onOpenChange, onCreated }: ProjectClientCreateModalProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");
  const addClient = useProjectsStore((s) => s.addClient);

  const [type, setType] = useState<ClientType>("b2b");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [trn, setTrn] = useState("");
  const [saving, setSaving] = useState(false);

  const isValid = nameAr.trim().length > 0 && nameEn.trim().length > 0;

  function reset() {
    setType("b2b"); setNameAr(""); setNameEn(""); setTrn("");
  }

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    const client = addClient({
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      type,
      trn: type === "b2b" && trn.trim() ? trn.trim() : null,
    });
    setSaving(false);
    reset();
    onClose();
    onCreated(client);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t("client_modal.title")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{tCommon("cancel")}</Button>
          <Button disabled={!isValid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {tCommon("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("client_modal.type")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as ClientType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="b2b">{t("client_modal.type_b2b")}</SelectItem>
              <SelectItem value="b2c">{t("client_modal.type_b2c")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("client_modal.name_ar")} *</Label>
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("client_modal.name_en")} *</Label>
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
        </div>
        {type === "b2b" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("client_modal.trn")}</Label>
            <Input value={trn} onChange={(e) => setTrn(e.target.value)} dir="ltr" />
          </div>
        )}
      </div>
    </ModalShell>
  );
}
