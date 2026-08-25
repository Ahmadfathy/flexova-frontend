/**
 * DD-2 §2.3/§2.4 — Stock-in / Receipt modal, extended with batch fields. The v1/
 * DD-1 Inventory module has no receipt concept at all (GRN lives in Purchasing,
 * unbuilt) and no "opening balances per batch" grid — this is a genuinely new,
 * self-contained Inventory-scope entry point (technical decision 4: "stock-in
 * يدوي" + "opening per batch" + adjustments are Inventory's own DD-2 producers;
 * Purchasing's future GRN is just another producer of the same `receipt`
 * movement, no schema change needed). Scope simplification: one form covers both
 * "opening" (item has zero balance so far → movement.type="opening") and later
 * receipts (movement.type="receipt") rather than a separate grid screen — same
 * golden-rule outcome, less new surface.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { InventoryFixture, InventoryItem, InventoryWarehouse } from "./types";
import { buildReceipt, findMergeBatch, batchWarehouseBalances, batchCarrierId, getCarrierBatches } from "./batches";

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: InventoryItem;
  warehouses: InventoryWarehouse[];
  data: InventoryFixture;
  lang: "ar" | "en";
  mutate: (updater: (prev: InventoryFixture | null) => InventoryFixture | null) => void;
}

export function ReceiptModal({ open, onOpenChange, item, warehouses, data, lang, mutate }: ReceiptModalProps) {
  const { t } = useTranslation("inventory");
  const carrierId = batchCarrierId(item);
  const existingBatches = getCarrierBatches(carrierId, data.stock_batch ?? []);

  const [warehouseId, setWarehouseId] = useState("");
  const [lot, setLot] = useState("");
  const [expiry, setExpiry] = useState("");
  const [mfg, setMfg] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setWarehouseId(warehouses[0]?.id ?? "");
      setLot(""); setExpiry(""); setMfg(""); setSupplierRef(""); setCost(""); setQty("");
      setError(""); setSaving(false);
    }
  }, [open, warehouses]);

  const mergeMatch = lot.trim() ? findMergeBatch(carrierId, lot.trim(), expiry || null, existingBatches) : null;
  const mergeMatchBalance = mergeMatch
    ? batchWarehouseBalances(mergeMatch.id, data.ledger).find((b) => b.warehouse_id === warehouseId)?.qty ?? 0
    : 0;

  const itemTotalBalance = item.balances.reduce((s, b) => s + b.qty, 0);
  const isFirstEver = itemTotalBalance === 0 && existingBatches.every((b) => (data.ledger.filter((m) => m.batch_id === b.id).length === 0));

  function handleSubmit() {
    setError("");
    const qtyNum = parseFloat(qty);
    const result = buildReceipt(
      {
        carrierId, warehouseId, lotNumber: lot.trim(), expiryDate: expiry || null,
        mfgDate: mfg || null, supplierRef: supplierRef.trim() || null,
        cost: parseFloat(cost) || 0, qty: qtyNum,
      },
      item.id, existingBatches, data.ledger, !!item.requires_expiry, isFirstEver
    );
    if (!result.ok) {
      if (result.reason === "expiry_required") setError(t("batch.expiry_required"));
      else if (result.reason === "lot_required") setError(t("batch.lot_required"));
      else setError(t("batch.qty_invalid"));
      return;
    }

    setSaving(true);
    mutate((prev) => {
      if (!prev) return prev;
      const batchExists = (prev.stock_batch ?? []).some((b) => b.id === result.batch.id);
      return {
        ...prev,
        stock_batch: batchExists ? prev.stock_batch : [...(prev.stock_batch ?? []), result.batch],
        ledger: [...prev.ledger, result.movement],
        items: prev.items.map((it) =>
          it.id === item.id
            ? {
                ...it,
                balances: [
                  ...it.balances.filter((b) => b.warehouse_id !== warehouseId),
                  { warehouse_id: warehouseId, qty: (it.balances.find((b) => b.warehouse_id === warehouseId)?.qty ?? 0) + qtyNum },
                ],
              }
            : it
        ),
      };
    });
    setSaving(false);
    toast.success(t("batch.receipt_saved"));
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("batch.receipt_title")}
      description={lang === "ar" ? item.name_ar : item.name_en}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>{t("item_editor.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("batch.receipt_save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("filters.warehouse")}</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("batch.lot_number")}</Label>
            <Input data-testid="receipt-lot" value={lot} onChange={(e) => setLot(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>
              {t("batch.expiry_date")}
              {item.requires_expiry && <span className="text-destructive"> *</span>}
            </Label>
            <Input data-testid="receipt-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("batch.mfg_date")}</Label>
            <Input type="date" value={mfg} onChange={(e) => setMfg(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("batch.supplier_ref")}</Label>
            <Input value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("columns.cost")}</Label>
            <Input type="number" min={0} className="tabular-nums" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("ledger.col_qty")}</Label>
            <Input data-testid="receipt-qty" type="number" min={0} className="tabular-nums" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        </div>

        {mergeMatch && (
          <p data-testid="merge-notice" className="text-sm rounded-md bg-brand-tint text-brand-text px-3 py-2">
            {t("batch.merge_notice")} — {mergeMatchBalance} → {mergeMatchBalance + (parseFloat(qty) || 0)}
          </p>
        )}

        {error && <p className={cn("text-sm text-destructive")}>{error}</p>}
      </div>
    </ModalShell>
  );
}
