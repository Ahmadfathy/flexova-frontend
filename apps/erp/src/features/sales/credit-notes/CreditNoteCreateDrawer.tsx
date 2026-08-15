import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DrawerShell } from "@/components/patterns/DrawerShell";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { Info } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { useSalesData } from "@/features/sales/invoices/useSalesData";

// ── Credit Note Create Drawer ──────────────────────────────────────

interface CreditNoteCreateDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSourceId?: string;
}

export function CreditNoteCreateDrawer({ open, onOpenChange, defaultSourceId }: CreditNoteCreateDrawerProps) {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const { data } = useSalesData();

  const [sourceId, setSourceId] = useState(defaultSourceId ?? "");
  const [reason, setReason]     = useState("");
  const [qtys, setQtys]         = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const validInvoices = (data?.invoices ?? []).filter(
    inv => inv.eta_status === "valid"
  );
  const sourceInv = validInvoices.find(inv => inv.id === sourceId);

  useEffect(() => {
    setQtys({});
  }, [sourceId]);

  useEffect(() => {
    if (defaultSourceId) setSourceId(defaultSourceId);
  }, [defaultSourceId]);

  const lineQty = (idx: number, max: number) =>
    qtys[idx] !== undefined ? qtys[idx] : max;

  const value = (sourceInv?.lines ?? []).reduce((sum, line, idx) => {
    const q = lineQty(idx, line.qty);
    const lineTotal = q * line.price;
    return sum + lineTotal * 1.14;
  }, 0);

  const canSubmit = sourceId && reason.trim();

  async function handleIssue() {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    toast.success(t("credit.issued"));
    onOpenChange(false);
    setSourceId(defaultSourceId ?? "");
    setReason("");
    setQtys({});
  }

  const items = data?.items ?? [];
  const uoms  = data?.uoms  ?? [];

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("credit.new")}
      size="lg"
      footer={
        <>
          <span className="me-auto font-semibold tabular-nums text-sm">
            {sourceId ? formatMoney(value, lang) : "—"}
          </span>
          <Button
            disabled={!canSubmit || submitting}
            onClick={handleIssue}
          >
            {submitting ? "…" : t("credit.issue")}
          </Button>
        </>
      }
    >
        <div className="space-y-5">
          {/* Source invoice */}
          <div className="space-y-2">
            <Label>{t("credit.source_invoice")}</Label>
            {validInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("credit.no_valid_invoices")}</p>
            ) : (
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("credit.select_invoice")} />
                </SelectTrigger>
                <SelectContent>
                  {validInvoices.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      <span className="font-mono" dir="ltr">{inv.number}</span>
                      {" — "}
                      {formatMoney(inv.totals.grand_total, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Lines */}
          {sourceInv && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t("credit.qty_label")}</p>
                <span className="text-xs text-muted-foreground">
                  {t("credit.source_total")}: {formatMoney(sourceInv.totals.grand_total, lang)}
                </span>
              </div>
              <div className="rounded-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t("editor.col_item")}</TableHead>
                      <TableHead className="text-start">{t("credit.qty_label")}</TableHead>
                      <TableHead className="text-start">{t("credit.value")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceInv.lines.map((line, idx) => {
                      const item = items.find(i => i.id === line.item_id);
                      const uom  = uoms.find(u => u.id === line.uom_id);
                      const q    = lineQty(idx, line.qty);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="py-2">
                            <p className="text-sm font-medium">
                              {lang === "ar" ? item?.name_ar : item?.name_en}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {lang === "ar" ? uom?.name_ar : uom?.name_en}
                            </p>
                          </TableCell>
                          <TableCell className="py-2 w-24">
                            <Input
                              type="number"
                              min={0}
                              max={line.qty}
                              value={q}
                              onChange={e =>
                                setQtys(prev => ({
                                  ...prev,
                                  [idx]: Math.min(line.qty, Math.max(0, +e.target.value)),
                                }))
                              }
                              className="h-8 text-center tabular-nums"
                            />
                          </TableCell>
                          <TableCell className="py-2 text-start tabular-nums text-sm">
                            {formatMoney(q * line.price * 1.14, lang)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>
              {t("credit.reason")}
              <span className="text-destructive ms-1">*</span>
            </Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t("credit.reason")}
            />
          </div>

          {/* ETA note */}
          <p className="text-xs text-muted-foreground flex items-start gap-1 border rounded p-2 bg-muted/30">
            <Info className="size-3 mt-0.5 shrink-0" />
            {t("credit.note_eta")}
          </p>
        </div>
    </DrawerShell>
  );
}
