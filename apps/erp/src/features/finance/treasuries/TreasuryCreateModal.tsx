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

type TreasuryType = "cash" | "bank" | "wallet";

interface TreasuryCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TreasuryCreateModal({ open, onOpenChange }: TreasuryCreateModalProps) {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";

  const [name, setName]       = useState("");
  const [type, setType]       = useState<TreasuryType>("cash");
  const [accountNo, setAccNo] = useState("");
  const [saving, setSaving]   = useState(false);

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("treasuries.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("treasuries.form_title_new")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!name.trim() || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("treasuries.form_name")} *</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={lang === "ar" ? "مثل: خزينة المبيعات" : "e.g. Sales register"}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("treasuries.form_type")} *</Label>
          <Select value={type} onValueChange={v => setType(v as TreasuryType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">{t("treasuries.type_cash")}</SelectItem>
              <SelectItem value="bank">{t("treasuries.type_bank")}</SelectItem>
              <SelectItem value="wallet">{t("treasuries.type_wallet")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "bank" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("treasuries.form_account_no")}</Label>
            <Input
              value={accountNo}
              onChange={e => setAccNo(e.target.value)}
              dir="ltr"
              placeholder="XXXXXXXXXX"
            />
          </div>
        )}
      </div>
    </ModalShell>
  );
}
