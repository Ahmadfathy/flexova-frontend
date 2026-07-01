import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import type { InventoryWarehouse } from "../items/types";

interface WhForm {
  name_ar:    string;
  name_en:    string;
  code:       string;
  branch_id:  string;
  type:       InventoryWarehouse["type"];
  status:     InventoryWarehouse["status"];
  is_default: boolean;
}

const EMPTY_FORM: WhForm = {
  name_ar:    "",
  name_en:    "",
  code:       "",
  branch_id:  "",
  type:       "storage",
  status:     "active",
  is_default: false,
};

interface WarehouseCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WarehouseCreateModal({ open, onOpenChange }: WarehouseCreateModalProps) {
  const { t, i18n } = useTranslation("inventory");
  const lang = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";

  const [form,   setForm]   = useState<WhForm>(EMPTY_FORM);
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof WhForm>(k: K, v: WhForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function onClose() {
    setForm(EMPTY_FORM);
    setError("");
    onOpenChange(false);
  }

  async function handleSave() {
    if (!form.name_ar.trim()) {
      setError(t("warehouses.form_name_required"));
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 650));
    setSaving(false);
    onClose();
  }

  const branchOptions = [
    { id: "br_main", label: lang === "ar" ? "الفرع الرئيسي" : "Main Branch" },
    { id: "br_nasr", label: lang === "ar" ? "فرع مدينة نصر" : "Nasr City Branch" },
  ];

  return (
    <ModalShell
      open={open}
      onOpenChange={v => !v && onClose()}
      title={t("warehouses.new")}
      description={t("warehouses.new")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("actions.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="wh-name-ar">
            {t("warehouses.form_name")}
            <span className="text-destructive ms-0.5">*</span>
          </Label>
          <Input
            id="wh-name-ar"
            value={form.name_ar}
            onChange={(e) => { set("name_ar", e.target.value); setError(""); }}
            placeholder={lang === "ar" ? "مثال: المخزن الرئيسي" : "e.g. Main Warehouse"}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wh-name-en">
            {t("warehouses.form_name")} (EN)
          </Label>
          <Input
            id="wh-name-en"
            value={form.name_en}
            onChange={(e) => set("name_en", e.target.value)}
            placeholder="e.g. Main Warehouse"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wh-code">{t("warehouses.form_code")}</Label>
            <Input
              id="wh-code"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="WH-01"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-branch">{t("warehouses.form_branch")}</Label>
            <Select
              value={form.branch_id || "__none__"}
              onValueChange={(v) => set("branch_id", v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="wh-branch">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {branchOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wh-type">{t("warehouses.form_type")}</Label>
          <Select
            value={form.type}
            onValueChange={(v) => set("type", v as InventoryWarehouse["type"])}
          >
            <SelectTrigger id="wh-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="storage">{t("warehouses.types.storage")}</SelectItem>
              <SelectItem value="sale">{t("warehouses.types.sale")}</SelectItem>
              <SelectItem value="damaged">{t("warehouses.types.damaged")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{t("warehouses.form_status")}</p>
            <p className="text-xs text-muted-foreground">
              {form.status === "active" ? t("status.active") : t("status.suspended")}
            </p>
          </div>
          <Switch
            checked={form.status === "active"}
            onCheckedChange={(v) => set("status", v ? "active" : "suspended")}
          />
        </div>

        <div className="flex items-center justify-between rounded border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{t("warehouses.form_is_default")}</p>
            <p className="text-xs text-muted-foreground">
              {t("warehouses.form_is_default_hint")}
            </p>
          </div>
          <Switch
            checked={form.is_default}
            onCheckedChange={(v) => set("is_default", v)}
          />
        </div>
      </div>
    </ModalShell>
  );
}
