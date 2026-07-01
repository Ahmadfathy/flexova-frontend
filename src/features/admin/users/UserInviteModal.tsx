import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { useAdminData } from "../data/useAdminData";

interface UserInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserInviteModal({ open, onOpenChange }: UserInviteModalProps) {
  const { t, i18n } = useTranslation("admin");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data } = useAdminData();

  const roles    = data?.roleTemplates ?? [];
  const branches = data?.branches      ?? [];

  const [name,   setName]   = useState("");
  const [login,  setLogin]  = useState("");
  const [role,   setRole]   = useState("");
  const [saving, setSaving] = useState(false);

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    setName(""); setLogin(""); setRole("");
    toast.success(t("users.invited_toast"));
  }

  const valid = name.trim() && login.trim() && role;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("users.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!valid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("users.invite")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("users.form_name")} *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("users.form_login")} *</Label>
          <Input value={login} onChange={e => setLogin(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("users.form_role")} *</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {roles.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {lang === "ar" ? r.name_ar : r.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("users.form_branch")}</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder={t("users.scope_all")} /></SelectTrigger>
            <SelectContent>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {lang === "ar" ? b.name_ar : b.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ModalShell>
  );
}
