import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/patterns/ModalShell";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import type { Supplier } from "../data/usePurchasingData";

/* ─── Form state ─────────────────────────────────────────────── */

interface SupplierForm {
  name_ar:      string;
  name_en:      string;
  trn:          string;
  uin:          string;
  terms_type:   "cash" | "credit";
  terms_days:   string;
  terms_limit:  string;
  category:     "local" | "imported";
  phone:        string;
  email:        string;
  address:      string;
}

function emptyForm(): SupplierForm {
  return {
    name_ar: "", name_en: "", trn: "", uin: "",
    terms_type: "cash", terms_days: "30", terms_limit: "",
    category: "local",
    phone: "", email: "", address: "",
  };
}

function supplierToForm(s: Supplier): SupplierForm {
  return {
    name_ar:     s.name_ar,
    name_en:     s.name_en,
    trn:         s.trn,
    uin:         s.uin,
    terms_type:  s.payment_terms.type,
    terms_days:  String(s.payment_terms.days ?? 30),
    terms_limit: s.payment_terms.credit_limit != null ? String(s.payment_terms.credit_limit) : "",
    category:    s.category,
    phone:       s.contact.phone,
    email:       s.contact.email,
    address:     s.contact.address,
  };
}

/* ─── Props ──────────────────────────────────────────────────── */

interface SupplierFormModalProps {
  open:        boolean;
  onOpenChange: (v: boolean) => void;
  supplier?:   Supplier | null;
  onSaved:     () => void;
}

/* ─── Component ──────────────────────────────────────────────── */

export function SupplierFormModal({ open, onOpenChange, supplier, onSaved }: SupplierFormModalProps) {
  const { t } = useTranslation("purchasing");
  const isEdit = !!supplier;

  const [form,    setForm]    = useState<SupplierForm>(emptyForm);
  const [nameErr, setNameErr] = useState("");
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (open) {
      setForm(supplier ? supplierToForm(supplier) : emptyForm());
      setNameErr("");
      setSaving(false);
    }
  }, [open, supplier]);

  function setField<K extends keyof SupplierForm>(k: K, v: SupplierForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
    if (k === "name_ar") setNameErr("");
  }

  async function handleSave() {
    if (!form.name_ar.trim()) {
      setNameErr(t("form.name_req"));
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onOpenChange(false);
    toast.success(t("form.saved"));
    onSaved();
  }

  const canSave = form.name_ar.trim().length > 0;

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("form.edit_title") : t("form.new_title")}
      description={isEdit ? t("form.edit_title") : t("form.new_title")}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common:cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("common:save", { defaultValue: "Save" })}
          </Button>
        </>
      }
    >
        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">
                {t("form.name_label")} (AR) *
              </Label>
              <Input
                dir="rtl"
                value={form.name_ar}
                onChange={e => setField("name_ar", e.target.value)}
                className={cn(nameErr && "border-destructive")}
                placeholder="اسم المورّد"
              />
              {nameErr && <p className="text-xs text-destructive">{nameErr}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">{t("form.name_label")} (EN)</Label>
              <Input
                dir="ltr"
                value={form.name_en}
                onChange={e => setField("name_en", e.target.value)}
                placeholder="Supplier name"
              />
            </div>
          </div>

          {/* Code */}
          {isEdit && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">
                {t("form.code_label")}
              </Label>
              <Input
                dir="ltr"
                value={supplier?.code ?? ""}
                readOnly
                className="font-mono bg-muted/50 text-muted-foreground"
              />
            </div>
          )}

          {/* TRN + UIN */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("form.trn_label")}</Label>
              <Input
                dir="ltr"
                value={form.trn}
                onChange={e => setField("trn", e.target.value)}
                placeholder="123456789"
                className="font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("form.uin_label")}</Label>
              <Input
                dir="ltr"
                value={form.uin}
                onChange={e => setField("uin", e.target.value)}
                placeholder="EG-123456789-01"
                className="font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Payment terms */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("form.terms_type")}</Label>
            <div className="flex gap-2">
              <Select
                value={form.terms_type}
                onValueChange={v => setField("terms_type", v as "cash" | "credit")}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("form.terms_cash")}</SelectItem>
                  <SelectItem value="credit">{t("form.terms_credit")}</SelectItem>
                </SelectContent>
              </Select>

              {form.terms_type === "credit" && (
                <>
                  <div className="flex-1 space-y-1">
                    <Input
                      type="number"
                      min={1}
                      dir="ltr"
                      value={form.terms_days}
                      onChange={e => setField("terms_days", e.target.value)}
                      placeholder={t("form.terms_days")}
                      className="tabular-nums"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      type="number"
                      min={0}
                      dir="ltr"
                      value={form.terms_limit}
                      onChange={e => setField("terms_limit", e.target.value)}
                      placeholder={t("form.terms_limit")}
                      className="tabular-nums"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("form.category_label")}</Label>
            <Select
              value={form.category}
              onValueChange={v => setField("category", v as "local" | "imported")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">{t("category.local")}</SelectItem>
                <SelectItem value="imported">{t("category.imported")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("form.phone_label")}</Label>
              <Input
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={e => setField("phone", e.target.value)}
                placeholder="01xxxxxxxxx"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("form.email_label")}</Label>
              <Input
                type="email"
                dir="ltr"
                value={form.email}
                onChange={e => setField("email", e.target.value)}
                placeholder="supplier@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("form.address_label")}</Label>
              <Input
                dir="rtl"
                value={form.address}
                onChange={e => setField("address", e.target.value)}
              />
            </div>
          </div>

          {/* Balance note */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{t("form.balance_note")}</span>
          </div>
        </div>
    </ModalShell>
  );
}
