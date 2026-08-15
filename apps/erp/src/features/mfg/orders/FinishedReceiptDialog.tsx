import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useMfgOrders } from "@/stores/mfgOrders";
import { getItems, getWarehouses } from "@/lib/mock/mfg";
import { useMfgItemStock } from "@/stores/mfgItemStock";
import type { ManufacturingOrder } from "@/types/mfg";
import { computeReceiptPreview, buildJournalPreview } from "./costing";

interface FinishedReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mo: ManufacturingOrder;
}

/** FE_14 §7.5 — good qty + finished warehouse → computed unit-cost preview → confirm. */
export function FinishedReceiptDialog({ open, onOpenChange, mo }: FinishedReceiptDialogProps) {
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const can = useCan();
  const receiveFinished = useMfgOrders((s) => s.receiveFinished);

  const items = useMemo(() => getItems(), []);
  const warehouses = useMemo(() => getWarehouses(), []);
  const remaining = mo.qty_ordered - mo.qty_received;

  const [qty, setQty] = useState("");
  const [toWh, setToWh] = useState(mo.wh_finished);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setQty(String(remaining)); setToWh(mo.wh_finished); setError(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const qtyNum = parseFloat(qty) || 0;
  const preview = qtyNum > 0 ? computeReceiptPreview(mo, items, qtyNum) : null;
  const journal = preview ? buildJournalPreview(preview) : [];
  const totalDr = journal.reduce((s, j) => s + j.lines.reduce((s2, l) => s2 + l.dr, 0), 0);
  const totalCr = journal.reduce((s, j) => s + j.lines.reduce((s2, l) => s2 + l.cr, 0), 0);

  function itemName(id: string) {
    const item = items.find((i) => i.id === id);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : id;
  }
  function warehouseName(id: string) {
    const wh = warehouses.find((w) => w.id === id);
    return wh ? (lang === "ar" ? wh.name_ar : wh.name_en) : id;
  }

  const projectedItemStock = preview
    ? useMfgItemStock.getState().getStock(mo.output_item_id, toWh)
    : null;
  const projectedAvgCost = projectedItemStock && preview
    ? (projectedItemStock.qty * projectedItemStock.avg_cost + qtyNum * preview.unitCostAfter) / (projectedItemStock.qty + qtyNum)
    : 0;

  function handleConfirm() {
    if (!qtyNum || qtyNum <= 0) { setError(t("mo.receive_qty_required")); return; }
    if (qtyNum > remaining) { setError(t("mo.receive_qty_max", { n: remaining })); return; }

    receiveFinished(mo.id, { qty_good: qtyNum, to_wh: toWh });
    const newStatus = mo.qty_received + qtyNum >= mo.qty_ordered ? "done" : "partial";
    toast.success(t("mo.receive_saved_toast", { qty: qtyNum, status: t(`orders.status_${newStatus}`) }));
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("mo.receive_modal_title")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("new.cancel")}</Button>
          <Button onClick={handleConfirm} disabled={!can("mfg.finished.receive")}>{t("mo.receive_confirm")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("mo.receive_qty_label")}</Label>
            <Input type="number" min={0} max={remaining} step={1} value={qty} onChange={(e) => setQty(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("mo.receive_qty_hint", { n: remaining })}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("mo.receive_wh_label")}</Label>
            <Select value={toWh} onValueChange={setToWh}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {preview && (
          <div className="rounded border border-border p-3 space-y-3">
            <p className="text-sm font-medium">{t("mo.receive_preview_title")}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("mo.receive_unit_cost_preview")}</span>
              <span className="font-semibold tabular-nums">{formatMoney(preview.unitCostAfter, lang)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("mo.receive_item_avg_update", { item: itemName(mo.output_item_id) })}</span>
              <span className="font-medium tabular-nums">{formatMoney(projectedAvgCost, lang)}</span>
            </div>

            <div className="pt-2 border-t border-border space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("mo.receive_journal_title")}</p>
              <div className="rounded border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    {journal.flatMap((j) => j.lines.map((l, i) => (
                      <tr key={`${j.event}_${i}`} className="border-t border-border first:border-t-0">
                        <td className="px-2 py-1.5">{l.account}</td>
                        <td className="px-2 py-1.5 text-end tabular-nums">{l.dr > 0 ? formatMoney(l.dr, lang) : ""}</td>
                        <td className="px-2 py-1.5 text-end tabular-nums">{l.cr > 0 ? formatMoney(l.cr, lang) : ""}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
              {totalDr === totalCr && (
                <p className="flex items-center gap-1.5 text-xs text-success-text">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("mo.receive_balanced")}
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">{t("mo.receive_wh_label")}: {warehouseName(toWh)}</p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
