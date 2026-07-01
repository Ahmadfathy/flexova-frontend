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

import { cn } from "@/lib/utils";
import { useFinanceData } from "../data/useFinanceData";

interface AccountCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountCreateModal({ open, onOpenChange }: AccountCreateModalProps) {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data } = useFinanceData();
  const accounts = data?.chartOfAccounts ?? [];

  const [code, setCode]       = useState("");
  const [nameAr, setNameAr]   = useState("");
  const [nameEn, setNameEn]   = useState("");
  const [parent, setParent]   = useState("");
  const [type, setType]       = useState<"group" | "account">("account");
  const [saving, setSaving]   = useState(false);

  const codeTaken = code.trim() !== "" && accounts.some(a => a.code === code.trim());
  const isValid   = code.trim() && nameAr.trim() && nameEn.trim() && !codeTaken;

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    // reset form
    setCode(""); setNameAr(""); setNameEn(""); setParent(""); setType("account");
    onClose();
    toast.success(t("coa.saved_toast"));
  }

  // Only show accounts that can be parents (roots and groups)
  const parentOptions = accounts.filter(a => a.type === "root" || a.type === "group");

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("coa.form_title")}
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
          <Label className="text-xs text-muted-foreground">{t("coa.form_code")} *</Label>
          <Input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={lang === "ar" ? "مثال: 1105" : "e.g. 1105"}
            dir="ltr"
            className={cn(codeTaken && "border-danger")}
          />
          {codeTaken && (
            <p className="text-xs text-danger">{t("coa.form_code_taken")}</p>
          )}
          {!codeTaken && (
            <p className="text-xs text-muted-foreground">{t("coa.form_code_hint")}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("coa.form_name_ar")} *</Label>
          <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("coa.form_name_en")} *</Label>
          <Input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("coa.form_type")} *</Label>
          <Select value={type} onValueChange={v => setType(v as "group" | "account")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="group">{t("coa.type_group")}</SelectItem>
              <SelectItem value="account">{t("coa.type_account")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("coa.form_parent")}</Label>
          <Select value={parent || "__none__"} onValueChange={v => setParent(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("coa.form_parent_ph")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("coa.form_parent_ph")}</SelectItem>
              {parentOptions.map(a => (
                <SelectItem key={a.code} value={a.code}>
                  <span className="font-mono text-xs me-2 text-muted-foreground">{a.code}</span>
                  {lang === "ar" ? a.name_ar : a.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ModalShell>
  );
}
