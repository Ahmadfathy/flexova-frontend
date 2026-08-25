/**
 * DD-2 §2.5/§2.6 — Issue flow: shows the auto-selected batch(es) (FEFO/FIFO,
 * technical decision 3) read-only, with a permission-gated Manual pick escape
 * hatch. Self-contained within Inventory (no Sales/POS integration exists yet
 * to drive this from) — the same "Inventory owns the batch-selection engine,
 * Sales/POS owns the hard sell-block" boundary as technical decision 3/§ pin B.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, ListChecks } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { InventoryFixture, InventoryItem, InventoryWarehouse } from "./types";
import {
  batchCarrierId, getCarrierBatches, selectBatchesForIssue, buildIssueMovements, effectiveNearExpiryDays,
  type BatchAllocation,
} from "./batches";
import { BatchPickerModal } from "./BatchPickerModal";

interface IssueStockDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: InventoryItem;
  warehouses: InventoryWarehouse[];
  data: InventoryFixture;
  lang: "ar" | "en";
  canManualPick: boolean;
  canOverride: boolean;
  mutate: (updater: (prev: InventoryFixture | null) => InventoryFixture | null) => void;
}

export function IssueStockDialog({
  open, onOpenChange, item, warehouses, data, lang, canManualPick, canOverride, mutate,
}: IssueStockDialogProps) {
  const { t } = useTranslation("inventory");
  const carrierId = batchCarrierId(item);
  const batches = getCarrierBatches(carrierId, data.stock_batch ?? []);
  const nearDays = effectiveNearExpiryDays(item, data.settings?.global_near_expiry_days ?? 30);

  const [warehouseId, setWarehouseId] = useState("");
  const [qty, setQty] = useState("");
  const [manualAllocation, setManualAllocation] = useState<BatchAllocation[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setWarehouseId(warehouses[0]?.id ?? "");
      setQty(""); setManualAllocation(null); setError(""); setSaving(false);
    }
  }, [open, warehouses]);

  const qtyNum = parseFloat(qty) || 0;

  const auto = useMemo(
    () => (qtyNum > 0 && warehouseId
      ? selectBatchesForIssue(carrierId, warehouseId, qtyNum, batches, data.ledger, !!item.requires_expiry)
      : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qtyNum, warehouseId, carrierId, batches, data.ledger, item.requires_expiry]
  );

  // manual pick resets whenever qty/warehouse changes
  useEffect(() => { setManualAllocation(null); }, [qtyNum, warehouseId]);

  const allocation = manualAllocation ?? auto?.allocations ?? [];
  const shortfall = manualAllocation ? Math.max(0, qtyNum - allocation.reduce((s, a) => s + a.qty, 0)) : (auto?.shortfall ?? 0);

  function handleConfirm() {
    setError("");
    if (!(qtyNum > 0)) { setError(t("batch.qty_invalid")); return; }
    if (allocation.length === 0 || shortfall > 0) { setError(t("batch.issue_insufficient")); return; }

    setSaving(true);
    const movements = buildIssueMovements(allocation, item.id, warehouseId, `ISSUE-${Date.now().toString().slice(-6)}`, data.ledger);
    mutate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ledger: [...prev.ledger, ...movements],
        items: prev.items.map((it) =>
          it.id === item.id
            ? {
                ...it,
                balances: it.balances.map((b) =>
                  b.warehouse_id === warehouseId ? { ...b, qty: b.qty - qtyNum } : b
                ),
              }
            : it
        ),
      };
    });
    setSaving(false);
    toast.success(t("batch.issue_saved"));
    onOpenChange(false);
  }

  return (
    <>
      <ModalShell
        open={open}
        onOpenChange={onOpenChange}
        title={t("batch.issue_title")}
        description={lang === "ar" ? item.name_ar : item.name_en}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>{t("item_editor.cancel")}</Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("actions.confirm")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>{t("ledger.col_qty")}</Label>
              <Input data-testid="issue-qty" type="number" min={0} className="tabular-nums" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{manualAllocation ? t("batch.picker_total") : t("batch.auto_selected")}</Label>
              {canManualPick && (
                <Button variant="outline" size="sm" data-testid="manual-pick-btn" onClick={() => setPickerOpen(true)} disabled={!(qtyNum > 0) || !warehouseId}>
                  <ListChecks className="h-3.5 w-3.5 me-1.5" />
                  {t("batch.manual_pick")}
                </Button>
              )}
            </div>

            {allocation.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("batch.issue_none_selected")}</p>
            ) : (
              <div data-testid="issue-allocation" className="rounded-md border border-border divide-y divide-border">
                {allocation.map((a) => {
                  const b = batches.find((bb) => bb.id === a.batch_id);
                  return (
                    <div key={a.batch_id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="tabular-nums font-medium">{b?.lot_number ?? a.batch_id}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{b?.expiry_date ?? "—"}</span>
                      <span className="tabular-nums">{a.qty}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {shortfall > 0 && <p className="text-xs text-destructive">{t("batch.issue_shortfall", { n: shortfall })}</p>}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </ModalShell>

      <BatchPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        batches={batches}
        ledger={data.ledger}
        warehouseId={warehouseId}
        qtyNeeded={qtyNum}
        nearExpiryDays={nearDays}
        canOverride={canOverride}
        onConfirm={(allocations) => setManualAllocation(allocations)}
      />
    </>
  );
}
