import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAppearance } from "@/stores/appearance";
import { useMfgOrders } from "@/stores/mfgOrders";
import { getItems, getScrapReasons } from "@/lib/mock/mfg";
import type { ManufacturingOrder } from "@/types/mfg";

interface RecordScrapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mo: ManufacturingOrder;
  stageId: string;
  stageName: string;
}

/** FE_14 §7.6 — mandatory reason, no separate journal entry (absorbed into finished unit cost). */
export function RecordScrapDialog({ open, onOpenChange, mo, stageId, stageName }: RecordScrapDialogProps) {
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const recordScrap = useMfgOrders((s) => s.recordScrap);

  const items = useMemo(() => getItems(), []);
  const reasons = useMemo(() => getScrapReasons(), []);
  const bomItemIds = useMemo(() => new Set(mo.order_bom.map((l) => l.item_id)), [mo.order_bom]);
  const bomItems = useMemo(() => items.filter((i) => bomItemIds.has(i.id)), [items, bomItemIds]);

  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setItemId(""); setQty(""); setReasonId(""); setNote(""); setError(""); }
  }, [open]);

  function itemName(id: string) {
    const item = items.find((i) => i.id === id);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : id;
  }
  function reasonName(id: string) {
    const r = reasons.find((r) => r.id === id);
    return r ? (lang === "ar" ? r.name_ar : r.name_en) : id;
  }

  function handleConfirm() {
    if (!itemId) { setError(t("mo.scrap_item_required")); return; }
    const qtyNum = parseFloat(qty);
    if (!qtyNum || qtyNum <= 0) { setError(t("mo.scrap_qty_required")); return; }
    if (!reasonId) { setError(t("mo.scrap_reason_required")); return; }

    recordScrap(mo.id, { stage_id: stageId, item_id: itemId, qty: qtyNum, reason_id: reasonId, note: note.trim() || undefined });
    toast.success(t("mo.scrap_saved_toast"));
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("mo.scrap_modal_title", { stage: stageName })}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("new.cancel")}</Button>
          <Button tone="danger" onClick={handleConfirm}>{t("mo.scrap_button")}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("mo.scrap_item_label")}</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger><SelectValue placeholder={t("mo.scrap_item_label")} /></SelectTrigger>
            <SelectContent>
              {bomItems.map((i) => <SelectItem key={i.id} value={i.id}>{itemName(i.id)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("mo.scrap_qty_label")}</Label>
          <Input type="number" min={0} step={0.01} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("mo.scrap_reason_label")} *</Label>
          <Select value={reasonId} onValueChange={setReasonId}>
            <SelectTrigger><SelectValue placeholder={t("mo.scrap_reason_placeholder")} /></SelectTrigger>
            <SelectContent>
              {reasons.map((r) => <SelectItem key={r.id} value={r.id}>{reasonName(r.id)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("mo.scrap_note_label")}</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t("mo.scrap_note_placeholder")} />
        </div>

        <p className="text-xs text-muted-foreground">{t("mo.scrap_no_effect_note")}</p>
      </div>
    </ModalShell>
  );
}
