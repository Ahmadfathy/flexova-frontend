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
import { consumeCostLayers, buildCostEvent } from "./costing";
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
  /** DD-3 — gates the unit-price − COGS margin readout (frontend §2.4). */
  canViewCost: boolean;
  mutate: (updater: (prev: InventoryFixture | null) => InventoryFixture | null) => void;
}

export function IssueStockDialog({
  open, onOpenChange, item, warehouses, data, lang, canManualPick, canOverride, canViewCost, mutate,
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

  // DD-3 §2.4 — batch items cost by construction: the batch DD-2 already picked physically is
  // the same batch DD-3 costs (technical decision 0), one allocation at a time.
  function costOfAllocation(batchId: string, allocQty: number) {
    return consumeCostLayers(carrierId, allocQty, data.ledger, { method: "specific", warehouseId, batchId });
  }

  const costPreview = useMemo(() => {
    if (!(qtyNum > 0) || !warehouseId || allocation.length === 0) return null;
    let totalCogs = 0;
    let pending = false;
    for (const a of allocation) {
      const r = costOfAllocation(a.batch_id, a.qty);
      totalCogs += r.total_cogs;
      pending = pending || r.pending_cost_reconciliation;
    }
    const unitCogs = totalCogs / qtyNum;
    const price = item.prices["pl_retail"] ?? Object.values(item.prices)[0] ?? 0;
    return { unitCogs, pending, margin: price - unitCogs, marginPct: price > 0 ? ((price - unitCogs) / price) * 100 : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocation, qtyNum, warehouseId, carrierId, data.ledger]);

  function handleConfirm() {
    setError("");
    if (!(qtyNum > 0)) { setError(t("batch.qty_invalid")); return; }
    if (allocation.length === 0 || shortfall > 0) { setError(t("batch.issue_insufficient")); return; }

    setSaving(true);
    const sourceRef = `ISSUE-${Date.now().toString().slice(-6)}`;
    const movements = buildIssueMovements(allocation, item.id, warehouseId, sourceRef, data.ledger, (batchId, allocQty) => {
      const r = costOfAllocation(batchId, allocQty);
      return { cost: r.unit_cogs, pending_cost_reconciliation: r.pending_cost_reconciliation };
    });
    const costEvents = movements.map((m, i) => {
      const alloc = allocation[i];
      return buildCostEvent(m.id, carrierId, warehouseId, alloc.qty, costOfAllocation(alloc.batch_id, alloc.qty), "specific", "issue");
    });
    mutate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ledger: [...prev.ledger, ...movements],
        cost_events: [...(prev.cost_events ?? []), ...costEvents],
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

          {/* DD-3 §2.4 — margin readout, permission-gated (price still shows, COGS/margin don't). */}
          {canViewCost && costPreview && (
            <div data-testid="issue-margin" className="rounded-md border border-border bg-muted/20 px-3 py-2 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("costing.margin")}</span>
                <span className="tabular-nums font-medium">
                  {costPreview.margin.toFixed(2)} ({costPreview.marginPct.toFixed(1)}%)
                </span>
              </div>
              {costPreview.pending && (
                <p className="text-xs text-warning-text">{t("costing.pending_reconciliation")}</p>
              )}
            </div>
          )}

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
