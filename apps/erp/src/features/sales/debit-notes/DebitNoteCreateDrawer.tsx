import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DrawerShell } from "@/components/patterns/DrawerShell";

import { Button }   from "@/components/ui/button";
import { Label }    from "@/components/ui/label";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { Info } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { useSalesData } from "@/features/sales/invoices/useSalesData";

// ── Debit Note Create Drawer ───────────────────────────────────────

interface DebitNoteCreateDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function DebitNoteCreateDrawer({ open, onOpenChange }: DebitNoteCreateDrawerProps) {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const { data } = useSalesData();

  const [sourceId, setSourceId]   = useState("");
  const [reason, setReason]       = useState("");
  const [desc, setDesc]           = useState("");
  const [amount, setAmount]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  const invoices = (data?.invoices ?? []).filter(
    inv => inv.eta_status === "valid"
  );

  const canSubmit = sourceId && reason.trim() && +amount > 0;

  async function handleIssue() {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    toast.success(t("debit.issued"));
    onOpenChange(false);
    setSourceId(""); setReason(""); setDesc(""); setAmount("");
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("debit.new")}
      size="lg"
      footer={
        <>
          <span className="me-auto font-semibold tabular-nums text-sm">
            {+amount > 0 ? formatMoney(+amount * 1.14, lang) : "—"}
          </span>
          <Button disabled={!canSubmit || submitting} onClick={handleIssue}>
            {submitting ? "…" : t("debit.issue")}
          </Button>
        </>
      }
    >
        <div className="space-y-5">
          {/* Source invoice */}
          <div className="space-y-2">
            <Label>{t("debit.source_invoice")}</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder={t("debit.search_invoice")} />
              </SelectTrigger>
              <SelectContent>
                {invoices.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    <span className="font-mono" dir="ltr">{inv.number}</span>
                    {" — "}
                    {formatMoney(inv.totals.grand_total, lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Charge description */}
          <div className="space-y-2">
            <Label>{t("debit.desc")}</Label>
            <Input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={t("debit.desc")}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>
              {t("debit.amount")}
              <span className="text-destructive ms-1">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="tabular-nums"
              placeholder="0.00"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>
              {t("debit.reason")}
              <span className="text-destructive ms-1">*</span>
            </Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t("debit.reason")}
            />
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1 border rounded p-2 bg-muted/30">
            <Info className="size-3 mt-0.5 shrink-0" />
            {t("debit.note_eta")}
          </p>
        </div>
    </DrawerShell>
  );
}
