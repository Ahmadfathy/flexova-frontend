/**
 * DD-2 §2.2/§2.9 — Batches tab: list + row actions (Hold/Release, Quarantine,
 * Write-off, Trace) + entry points into Receipt and Issue. Scope: the default/
 * item-level carrier only (§2.2's "per-variant selector if multi-variant" is
 * not built — no demo data combines DD-1 product-parents with DD-2 batches, and
 * every fixture example is a simple item; disclosed, non-blocking).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, MinusCircle, Snowflake, PlayCircle, Trash2, History, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Label } from "@/components/ui/label";

import type { InventoryFixture, InventoryItem, InventoryWarehouse, StockBatch } from "./types";
import {
  batchCarrierId, getCarrierBatches, batchWarehouseBalances, effectiveBatchStatus, effectiveNearExpiryDays,
  buildQuarantineMovements, buildWriteOffMovement, DAMAGED_WAREHOUSE_ID,
} from "./batches";
import { BatchStatusPill } from "./BatchStatusBadge";
import { ReceiptModal } from "./ReceiptModal";
import { IssueStockDialog } from "./IssueStockDialog";
import { BatchTraceDrawer } from "./BatchTraceDrawer";

interface BatchSectionProps {
  item: InventoryItem;
  warehouses: InventoryWarehouse[];
  data: InventoryFixture;
  lang: "ar" | "en";
  can: (permission: string) => boolean;
  mutate: (updater: (prev: InventoryFixture | null) => InventoryFixture | null) => void;
}

export function BatchSection({ item, warehouses, data, lang, can, mutate }: BatchSectionProps) {
  const { t } = useTranslation("inventory");
  const carrierId = batchCarrierId(item);
  const nearDays = effectiveNearExpiryDays(item, data.settings?.global_near_expiry_days ?? 30);
  const allBatches = getCarrierBatches(carrierId, data.stock_batch ?? []);

  const [showDepleted, setShowDepleted] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [traceBatch, setTraceBatch] = useState<StockBatch | null>(null);
  const [holdTarget, setHoldTarget] = useState<StockBatch | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [quarantineTarget, setQuarantineTarget] = useState<StockBatch | null>(null);
  const [writeOffTarget, setWriteOffTarget] = useState<StockBatch | null>(null);

  const canHold = can("inventory.batch.hold");
  const canQuarantine = can("inventory.batch.quarantine");
  const canManualPick = can("inventory.batch.manual_pick");
  const canOverride = can("inventory.batch.issue_override");

  function applyBalanceDelta(balances: InventoryItem["balances"], warehouseId: string, delta: number): InventoryItem["balances"] {
    const existing = balances.find((b) => b.warehouse_id === warehouseId);
    if (!existing) return [...balances, { warehouse_id: warehouseId, qty: delta }];
    return balances.map((b) => (b.warehouse_id === warehouseId ? { ...b, qty: b.qty + delta } : b));
  }

  const rows = allBatches
    .map((b) => ({ batch: b, status: effectiveBatchStatus(b, data.ledger, nearDays), balances: batchWarehouseBalances(b.id, data.ledger) }))
    .sort((a, b) => (a.batch.expiry_date ?? "9999") < (b.batch.expiry_date ?? "9999") ? -1 : 1);
  const visibleRows = rows.filter((r) => showDepleted || r.status !== "depleted");
  const depletedCount = rows.length - rows.filter((r) => r.status !== "depleted").length;

  function releaseHold(batch: StockBatch) {
    mutate((prev) => prev && {
      ...prev,
      stock_batch: (prev.stock_batch ?? []).map((b) => b.id === batch.id ? { ...b, status: "active", hold_reason: null } : b),
    });
    toast.success(t("batch.hold_released"));
  }

  function confirmHold() {
    if (!holdTarget) return;
    mutate((prev) => prev && {
      ...prev,
      stock_batch: (prev.stock_batch ?? []).map((b) => b.id === holdTarget.id ? { ...b, status: "hold", hold_reason: holdReason.trim() || null } : b),
    });
    toast.success(t("batch.hold_set"));
    setHoldTarget(null);
    setHoldReason("");
  }

  function confirmQuarantine() {
    if (!quarantineTarget) return;
    const fromWh = batchWarehouseBalances(quarantineTarget.id, data.ledger).find((b) => b.warehouse_id !== DAMAGED_WAREHOUSE_ID && b.qty > 0);
    if (!fromWh) { setQuarantineTarget(null); return; }
    const [outMv, inMv] = buildQuarantineMovements(quarantineTarget.id, item.id, fromWh.warehouse_id, fromWh.qty, data.ledger);
    mutate((prev) => prev && {
      ...prev,
      ledger: [...prev.ledger, outMv, inMv],
      items: prev.items.map((it) => it.id === item.id ? {
        ...it,
        balances: applyBalanceDelta(applyBalanceDelta(it.balances, fromWh.warehouse_id, -fromWh.qty), DAMAGED_WAREHOUSE_ID, fromWh.qty),
      } : it),
    });
    toast.success(t("batch.quarantined"));
    setQuarantineTarget(null);
  }

  function confirmWriteOff() {
    if (!writeOffTarget) return;
    const damagedBal = batchWarehouseBalances(writeOffTarget.id, data.ledger).find((b) => b.warehouse_id === DAMAGED_WAREHOUSE_ID);
    if (!damagedBal || damagedBal.qty <= 0) { setWriteOffTarget(null); return; }
    const mv = buildWriteOffMovement(writeOffTarget.id, item.id, damagedBal.qty, data.ledger);
    mutate((prev) => prev && {
      ...prev,
      ledger: [...prev.ledger, mv],
      items: prev.items.map((it) => it.id === item.id ? {
        ...it,
        balances: applyBalanceDelta(it.balances, DAMAGED_WAREHOUSE_ID, -damagedBal.qty),
      } : it),
    });
    toast.success(t("batch.written_off"));
    setWriteOffTarget(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setIssueOpen(true)}>
          <MinusCircle className="h-3.5 w-3.5 me-1.5" />
          {t("batch.issue_title")}
        </Button>
        <Button size="sm" data-testid="open-receipt-btn" onClick={() => setReceiptOpen(true)}>
          <Plus className="h-3.5 w-3.5 me-1.5" />
          {t("batch.receipt_title")}
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t("batch.empty")} description="" />
      ) : (
        <div className="rounded-md border border-border divide-y divide-border">
          {visibleRows.map(({ batch, status, balances }) => (
            <div key={batch.id} data-testid={`batch-row-${batch.id}`} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium tabular-nums">{batch.lot_number}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {t("batch.expiry_date")}: {batch.expiry_date ?? "—"} · {t("batch.mfg_date")}: {batch.mfg_date ?? "—"}
                    {batch.supplier_ref && <> · {batch.supplier_ref}</>}
                  </p>
                </div>
                <BatchStatusPill
                  status={status} t={t}
                  hint={status === "hold" ? (batch.hold_reason ?? undefined) : undefined}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {balances.map((b) => {
                  const wh = warehouses.find((w) => w.id === b.warehouse_id);
                  return (
                    <span key={b.warehouse_id} className="text-xs rounded bg-muted px-1.5 py-0.5 tabular-nums">
                      {lang === "ar" ? wh?.name_ar : wh?.name_en}: {b.qty}
                    </span>
                  );
                })}
                {balances.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {canHold && status !== "hold" && status !== "depleted" && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setHoldTarget(batch)}>
                    <Snowflake className="h-3 w-3 me-1" />{t("actions.hold")}
                  </Button>
                )}
                {canHold && status === "hold" && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => releaseHold(batch)}>
                    <PlayCircle className="h-3 w-3 me-1" />{t("actions.release")}
                  </Button>
                )}
                {canQuarantine && status === "expired" && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-warning-text" onClick={() => setQuarantineTarget(batch)}>
                    {t("batch.quarantine")}
                  </Button>
                )}
                {canQuarantine && balances.some((b) => b.warehouse_id === DAMAGED_WAREHOUSE_ID && b.qty > 0) && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setWriteOffTarget(batch)}>
                    <Trash2 className="h-3 w-3 me-1" />{t("batch.write_off")}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTraceBatch(batch)}>
                  <History className="h-3 w-3 me-1" />{t("batch.trace")}
                </Button>
              </div>
            </div>
          ))}

          {depletedCount > 0 && (
            <button
              type="button"
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowDepleted((v) => !v)}
            >
              {showDepleted ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {t("batch.show_depleted", { n: depletedCount })}
            </button>
          )}
        </div>
      )}

      <ReceiptModal open={receiptOpen} onOpenChange={setReceiptOpen} item={item} warehouses={warehouses} data={data} lang={lang} mutate={mutate} />
      <IssueStockDialog
        open={issueOpen} onOpenChange={setIssueOpen} item={item} warehouses={warehouses} data={data} lang={lang}
        canManualPick={canManualPick} canOverride={canOverride} mutate={mutate}
      />
      <BatchTraceDrawer open={traceBatch !== null} onOpenChange={(o) => !o && setTraceBatch(null)} batch={traceBatch} ledger={data.ledger} warehouses={warehouses} lang={lang} />

      <ModalShell open={holdTarget !== null} onOpenChange={(o) => !o && setHoldTarget(null)} title={t("actions.hold")} size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setHoldTarget(null)}>{t("item_editor.cancel")}</Button>
          <Button onClick={confirmHold}>{t("actions.confirm")}</Button>
        </>}
      >
        <div className="space-y-1.5">
          <Label>{t("batch.hold_hint")}</Label>
          <Textarea value={holdReason} onChange={(e) => setHoldReason(e.target.value)} rows={2} />
        </div>
      </ModalShell>

      <ConfirmDialog
        open={quarantineTarget !== null}
        onOpenChange={(o) => !o && setQuarantineTarget(null)}
        title={t("batch.quarantine")}
        description={t("batch.quarantine_confirm")}
        confirmTone="primary"
        confirmLabel={t("actions.confirm")}
        onConfirm={confirmQuarantine}
      />
      <ConfirmDialog
        open={writeOffTarget !== null}
        onOpenChange={(o) => !o && setWriteOffTarget(null)}
        title={t("batch.write_off")}
        description={t("batch.write_off_confirm")}
        confirmTone="danger"
        confirmLabel={t("actions.confirm")}
        onConfirm={confirmWriteOff}
      />
    </div>
  );
}
