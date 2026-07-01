import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePurchasingData } from "../data/usePurchasingData";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

interface VoucherForm {
  supplier_id:    string;
  invoice_id:     string;
  amount:         string;
  method_id:      string;
  treasury_id:    string;
  date:           string;
  notes:          string;
}

function emptyForm(): VoucherForm {
  return {
    supplier_id: "", invoice_id: "", amount: "",
    method_id: "", treasury_id: "", date: today(), notes: "",
  };
}

interface PurchaseVoucherCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSupplierId?: string;
  defaultInvoiceId?: string;
}

export function PurchaseVoucherCreateModal({
  open, onOpenChange, defaultSupplierId, defaultInvoiceId,
}: PurchaseVoucherCreateModalProps) {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const { data } = usePurchasingData();

  const [form, setForm]     = useState<VoucherForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !data) return;
    const inv = defaultInvoiceId ? data.purchaseInvoices.find(i => i.id === defaultInvoiceId) : null;
    const newForm = emptyForm();
    if (inv) {
      newForm.supplier_id = inv.supplier_id;
      newForm.invoice_id  = inv.id;
      newForm.amount      = String(inv.balance > 0 ? inv.balance : "");
    } else if (defaultSupplierId) {
      newForm.supplier_id = defaultSupplierId;
    }
    setForm(newForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data, defaultSupplierId, defaultInvoiceId]);

  const payableInvoices = useMemo(() => {
    if (!data || !form.supplier_id) return [];
    return data.purchaseInvoices.filter(
      i => i.supplier_id === form.supplier_id && i.balance > 0,
    );
  }, [data, form.supplier_id]);

  const selectedInvoice = useMemo(
    () => data?.purchaseInvoices.find(i => i.id === form.invoice_id),
    [data, form.invoice_id],
  );

  const set = useCallback(
    <K extends keyof VoucherForm>(k: K, v: VoucherForm[K]) =>
      setForm(prev => ({ ...prev, [k]: v })),
    [],
  );

  const setInvoice = useCallback((invoiceId: string) => {
    const inv = data?.purchaseInvoices.find(i => i.id === invoiceId);
    setForm(prev => ({
      ...prev,
      invoice_id: invoiceId,
      amount: inv ? String(inv.balance) : prev.amount,
    }));
  }, [data]);

  const setSupplierField = useCallback((supplierId: string) => {
    setForm(prev => ({ ...prev, supplier_id: supplierId, invoice_id: "", amount: "" }));
  }, []);

  const amount = parseFloat(form.amount) || 0;
  const maxAmount = selectedInvoice?.balance ?? Infinity;
  const amountError = amount > 0 && selectedInvoice && amount > maxAmount;

  const isValid = (
    form.supplier_id &&
    form.invoice_id &&
    amount > 0 &&
    !amountError &&
    form.method_id &&
    form.treasury_id &&
    form.date
  );

  function closeDialog() {
    onOpenChange(false);
    setForm(emptyForm());
  }

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    closeDialog();
    toast.success(t("vouchers.saved_toast"));
    navigate("/purchasing/vouchers");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, t, navigate]);

  return (
    <ModalShell
      open={open}
      onOpenChange={o => { if (!o) closeDialog(); }}
      title={t("vouchers.form_title")}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={closeDialog}>
            {t("common:cancel", "Cancel")}
          </Button>
          <Button disabled={!isValid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("common:save", "Save")}
          </Button>
        </>
      }
    >
        <div className="space-y-4 py-1">
          {/* Supplier */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("vouchers.supplier_label")} *</Label>
            <Select value={form.supplier_id} onValueChange={setSupplierField}>
              <SelectTrigger className={cn(!form.supplier_id && "border-muted-foreground/40")}>
                <SelectValue placeholder={t("vouchers.supplier_ph")} />
              </SelectTrigger>
              <SelectContent>
                {(data?.suppliers ?? []).filter(s => s.status === "active").map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {lang === "ar" ? s.name_ar : s.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("vouchers.invoice_label")} *</Label>
            <Select
              value={form.invoice_id}
              onValueChange={setInvoice}
              disabled={!form.supplier_id || payableInvoices.length === 0}
            >
              <SelectTrigger className={cn(!form.invoice_id && "border-muted-foreground/40")}>
                <SelectValue placeholder={
                  !form.supplier_id
                    ? t("vouchers.supplier_ph")
                    : payableInvoices.length === 0
                      ? t("vouchers.no_payable")
                      : t("vouchers.invoice_ph")
                } />
              </SelectTrigger>
              <SelectContent>
                {payableInvoices.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    <span dir="ltr" className="font-mono text-xs">{inv.number}</span>
                    <span className="ms-2 text-muted-foreground text-xs">
                      {t("vouchers.invoice_balance", { amount: formatMoney(inv.balance, lang) })}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("vouchers.amount_label")} *</Label>
              <Input
                type="number" min={0.01} step="0.01"
                className={cn("tabular-nums text-start", amountError && "border-danger")}
                value={form.amount}
                onChange={e => set("amount", e.target.value)}
              />
              {amountError && (
                <p className="text-xs text-danger">
                  {t("vouchers.amount_exceeds", { max: formatMoney(maxAmount, lang) })}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("vouchers.date_label")} *</Label>
              <DatePicker value={form.date} onChange={val => set("date", val)} />
            </div>
          </div>

          {/* Method + Treasury row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("vouchers.method_label")} *</Label>
              <Select value={form.method_id} onValueChange={v => set("method_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.paymentMethods ?? []).map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {lang === "ar" ? m.name_ar : m.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("vouchers.treasury_label")} *</Label>
              <Select value={form.treasury_id} onValueChange={v => set("treasury_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.treasuries ?? []).map(tr => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {lang === "ar" ? tr.name_ar : tr.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("vouchers.notes_label")}</Label>
            <Textarea
              rows={2}
              className="resize-none"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
            />
          </div>
        </div>
    </ModalShell>
  );
}
