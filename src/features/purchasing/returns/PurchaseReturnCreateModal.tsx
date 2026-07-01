import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePurchasingData } from "../data/usePurchasingData";

interface ReturnLine {
  _key:    string;
  item_id: string;
  uom_id:  string;
  price:   number;
  max_qty: number;
  qty:     string;
}

function lineTotal(l: ReturnLine): number {
  return (parseFloat(l.qty) || 0) * l.price;
}

interface PurchaseReturnCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSourceId?: string;
}

export function PurchaseReturnCreateModal({ open, onOpenChange, defaultSourceId }: PurchaseReturnCreateModalProps) {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const { data } = usePurchasingData();

  const [sourceId, setSourceId]       = useState(defaultSourceId ?? "");
  const [reason, setReason]           = useState("");
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (open) setSourceId(defaultSourceId ?? "");
  }, [open, defaultSourceId]);

  const supplierMap = useMemo(
    () => Object.fromEntries((data?.suppliers ?? []).map(s => [s.id, s])),
    [data?.suppliers],
  );

  useEffect(() => {
    if (!data || !sourceId) { setReturnLines([]); return; }
    const inv = data.purchaseInvoices.find(i => i.id === sourceId);
    if (!inv) { setReturnLines([]); return; }
    setReturnLines(inv.lines.map(l => ({
      _key:    `${l.item_id}-${Math.random()}`,
      item_id: l.item_id,
      uom_id:  l.uom_id,
      price:   l.purchase_price,
      max_qty: l.qty,
      qty:     "0",
    })));
  }, [sourceId, data]);

  const returnableInvoices = useMemo(() => {
    if (!data) return [];
    return data.purchaseInvoices.filter(i => i.receipt_status === "completed");
  }, [data]);

  const totalValue = useMemo(
    () => returnLines.reduce((s, l) => s + lineTotal(l), 0),
    [returnLines],
  );

  const hasLines = returnLines.some(l => parseFloat(l.qty) > 0);
  const overMax  = returnLines.some(l => (parseFloat(l.qty) || 0) > l.max_qty);

  function closeDialog() {
    onOpenChange(false);
    setSourceId("");
    setReason("");
    setReturnLines([]);
  }

  const handleSave = useCallback(async () => {
    if (!sourceId || !reason.trim() || !hasLines || overMax) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    closeDialog();
    toast.success(t("returns.saved_toast"));
    navigate("/purchasing/returns");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, reason, hasLines, overMax, t, navigate]);

  return (
    <ModalShell
      open={open}
      onOpenChange={o => { if (!o) closeDialog(); }}
      title={t("returns.form_title")}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={closeDialog}>
            {t("common:cancel", "Cancel")}
          </Button>
          <Button
            disabled={!sourceId || !reason.trim() || !hasLines || overMax || saving}
            onClick={handleSave}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("common:save", "Save")}
          </Button>
        </>
      }
    >
        <div className="space-y-4 py-1">
          {/* Source invoice */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("returns.source_label")} *</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger className={cn(!sourceId && "border-muted-foreground/40")}>
                <SelectValue placeholder={t("returns.source_ph")} />
              </SelectTrigger>
              <SelectContent>
                {returnableInvoices.map(inv => {
                  const s = supplierMap[inv.supplier_id];
                  const sName = s ? (lang === "ar" ? s.name_ar : s.name_en) : inv.supplier_id;
                  return (
                    <SelectItem key={inv.id} value={inv.id}>
                      <span dir="ltr" className="font-mono text-xs">{inv.number}</span>
                      <span className="ms-2 text-muted-foreground text-xs">{sName}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("returns.reason_label")} *</Label>
            <Textarea
              rows={2}
              className="resize-none"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          {/* Lines table */}
          {returnLines.length > 0 && (
            <div className="rounded-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">{t("returns.col_item")}</TableHead>
                    <TableHead className="text-xs w-28">{t("returns.col_price")}</TableHead>
                    <TableHead className="text-xs w-20">{t("returns.col_max")}</TableHead>
                    <TableHead className="text-xs w-24">{t("returns.col_qty")}</TableHead>
                    <TableHead className="text-xs w-28">{t("returns.col_total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnLines.map(l => {
                    const item    = data?.items.find(i => i.id === l.item_id);
                    const uom     = data?.uoms.find(u => u.id === l.uom_id);
                    const name    = item ? (lang === "ar" ? item.name_ar : item.name_en) : l.item_id;
                    const uomName = uom  ? (lang === "ar" ? uom.name_ar  : uom.name_en)  : l.uom_id;
                    const qty     = parseFloat(l.qty) || 0;
                    const qtyOver = qty > l.max_qty;
                    return (
                      <TableRow key={l._key}>
                        <TableCell className="text-sm">
                          {name}
                          <span className="ms-1 text-xs text-muted-foreground">{uomName}</span>
                        </TableCell>
                        <TableCell className="text-sm text-start tabular-nums text-muted-foreground">
                          {formatMoney(l.price, lang)}
                        </TableCell>
                        <TableCell className="text-sm text-start tabular-nums text-muted-foreground">
                          {l.max_qty}
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="number" min={0} max={l.max_qty} step="any"
                            className={cn(
                              "h-8 text-xs tabular-nums text-start",
                              qtyOver && "border-danger",
                            )}
                            value={l.qty}
                            onChange={e => setReturnLines(prev =>
                              prev.map(x => x._key === l._key ? { ...x, qty: e.target.value } : x)
                            )}
                          />
                        </TableCell>
                        <TableCell className={cn(
                          "text-sm text-start tabular-nums font-medium",
                          qty > 0 ? "text-foreground" : "text-muted-foreground",
                        )}>
                          {formatMoney(lineTotal(l), lang)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="px-4 py-2 border-t border-border flex justify-between items-center">
                {overMax && (
                  <span className="flex items-center gap-1 text-xs text-danger">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {t("returns.qty_over_max")}
                  </span>
                )}
                <div className="ms-auto text-sm font-semibold">
                  {t("returns.total_label")}: {formatMoney(totalValue, lang)}
                </div>
              </div>
            </div>
          )}

          {sourceId && !hasLines && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" />
              {t("returns.blocker_lines")}
            </div>
          )}
        </div>
    </ModalShell>
  );
}
