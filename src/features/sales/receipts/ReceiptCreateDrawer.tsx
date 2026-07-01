import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DatePicker }    from "@/components/patterns/DatePicker";
import { DrawerShell }   from "@/components/patterns/DrawerShell";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { Info } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { useSalesData } from "@/features/sales/invoices/useSalesData";

// ── Receipt Create Drawer ──────────────────────────────────────────

interface ReceiptCreateDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ReceiptCreateDrawer({ open, onOpenChange }: ReceiptCreateDrawerProps) {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const { data } = useSalesData();

  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId]   = useState("");
  const [amount, setAmount]         = useState("");
  const [method, setMethod]         = useState("");
  const [treasury, setTreasury]     = useState("");
  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);

  const customers  = data?.customers ?? [];
  const invoices   = data?.invoices ?? [];
  const payMethods = data?.paymentMethods ?? [];
  const treasuries = data?.treasuries ?? [];

  const openInvoices = useMemo(() =>
    invoices.filter(inv => inv.customer_id === customerId && inv.balance > 0),
    [invoices, customerId],
  );

  const selectedInv = invoices.find(inv => inv.id === invoiceId);

  function handleCustomerChange(cid: string) {
    setCustomerId(cid);
    setInvoiceId("");
    setAmount("");
  }

  function handleInvoiceChange(iid: string) {
    setInvoiceId(iid);
    const inv = invoices.find(i => i.id === iid);
    if (inv) setAmount(inv.balance.toFixed(2));
  }

  const canSubmit = customerId && invoiceId && +amount > 0 && method && treasury;

  async function handleSave() {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    toast.success(t("receipt.saved"));
    onOpenChange(false);
    setCustomerId(""); setInvoiceId(""); setAmount("");
    setMethod(""); setTreasury(""); setNotes("");
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("receipt.new")}
      size="lg"
      footer={
        <>
          <span className="me-auto font-semibold tabular-nums text-sm">
            {+amount > 0 ? formatMoney(+amount, lang) : "—"}
          </span>
          <Button disabled={!canSubmit || submitting} onClick={handleSave}>
            {submitting ? "…" : t("receipt.new")}
          </Button>
        </>
      }
    >
        <div className="space-y-5">
          {/* Customer */}
          <div className="space-y-2">
            <Label>{t("editor.customer")}</Label>
            <Select value={customerId} onValueChange={handleCustomerChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("receipt.select_customer")} />
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

          {/* Open invoices */}
          {customerId && (
            <div className="space-y-2">
              <Label>{t("receipt.open_invoices")}</Label>
              {openInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("list.no_results")}</p>
              ) : (
                <Select value={invoiceId} onValueChange={handleInvoiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("receipt.select_invoice")} />
                  </SelectTrigger>
                  <SelectContent>
                    {openInvoices.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>
                        <span className="font-mono" dir="ltr">{inv.number}</span>
                        {" — "}
                        {t("receipt.balance")}: {formatMoney(inv.balance, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>
              {t("receipt.amount")}
              {selectedInv && (
                <span className="text-muted-foreground text-xs ms-2">
                  ({t("receipt.balance")}: {formatMoney(selectedInv.balance, lang)})
                </span>
              )}
            </Label>
            <Input
              type="number"
              min={0}
              max={selectedInv?.balance}
              step={0.01}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="tabular-nums"
              placeholder="0.00"
            />
          </div>

          {/* Method */}
          <div className="space-y-2">
            <Label>{t("receipt.method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder={t("receipt.method")} />
              </SelectTrigger>
              <SelectContent>
                {payMethods.map(pm => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {lang === "ar" ? pm.name_ar : pm.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Treasury */}
          <div className="space-y-2">
            <Label>{t("receipt.treasury")}</Label>
            <Select value={treasury} onValueChange={setTreasury}>
              <SelectTrigger>
                <SelectValue placeholder={t("receipt.treasury")} />
              </SelectTrigger>
              <SelectContent>
                {treasuries.map(tr => (
                  <SelectItem key={tr.id} value={tr.id}>
                    {lang === "ar" ? tr.name_ar : tr.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>{t("receipt.date")}</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("receipt.notes")}</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Independence notice */}
          <p className="text-xs text-muted-foreground flex items-start gap-1 border rounded p-2 bg-muted/30">
            <Info className="size-3 mt-0.5 shrink-0" />
            {t("receipt.note")}
          </p>
        </div>
    </DrawerShell>
  );
}
