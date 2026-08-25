/**
 * DD-2 §2.6 — manual batch picker (override for the issue flow). Visible only
 * behind `inventory.batch.manual_pick` (checked by the caller before rendering).
 * Expired/hold rows are disabled unless the user also holds
 * `inventory.batch.issue_override`, and picking one then requires an explicit
 * reason (audit-logged by the caller alongside the movement).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { InventoryLedgerRow, StockBatch } from "./types";
import { effectiveBatchStatus, batchBalance, type BatchAllocation } from "./batches";
import { BatchStatusPill } from "./BatchStatusBadge";

interface BatchPickerModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  batches: StockBatch[];
  ledger: InventoryLedgerRow[];
  warehouseId: string;
  qtyNeeded: number;
  nearExpiryDays: number;
  canOverride: boolean;
  onConfirm: (allocations: BatchAllocation[], overrideReason?: string) => void;
}

export function BatchPickerModal({
  open, onOpenChange, batches, ledger, warehouseId, qtyNeeded, nearExpiryDays, canOverride, onConfirm,
}: BatchPickerModalProps) {
  const { t } = useTranslation("inventory");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setPicks({}); setOverrideReason(""); setError(""); }
  }, [open]);

  const rows = batches
    .map((b) => ({ batch: b, balance: batchBalance(b.id, ledger, warehouseId), status: effectiveBatchStatus(b, ledger, nearExpiryDays) }))
    .filter((r) => r.balance > 0)
    .sort((a, b) => (a.batch.expiry_date ?? "9999") < (b.batch.expiry_date ?? "9999") ? -1 : 1);

  const overrideRows = rows.filter((r) => (r.status === "expired" || r.status === "hold") && canOverride);
  const anyOverridePicked = overrideRows.some((r) => parseFloat(picks[r.batch.id] || "0") > 0);

  const total = Object.values(picks).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  function handleConfirm() {
    setError("");
    if (total !== qtyNeeded) { setError(t("batch.picker_total_mismatch", { total, needed: qtyNeeded })); return; }
    if (anyOverridePicked && !overrideReason.trim()) { setError(t("batch.override_reason_required")); return; }
    const allocations: BatchAllocation[] = Object.entries(picks)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([batch_id, v]) => ({ batch_id, qty: parseFloat(v) }));
    onConfirm(allocations, anyOverridePicked ? overrideReason.trim() : undefined);
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("batch.manual_pick")}
      description={t("batch.picker_desc", { needed: qtyNeeded })}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("item_editor.cancel")}</Button>
          <Button onClick={handleConfirm}>{t("actions.confirm")}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("batch.empty")}</p>}

        {rows.map(({ batch, balance, status }) => {
          const disabled = (status === "expired" || status === "hold") && !canOverride;
          return (
            <div key={batch.id} className={cn("rounded-md border border-border p-3 flex items-center gap-3", disabled && "opacity-50")}>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium tabular-nums">{batch.lot_number}</span>
                  <BatchStatusPill status={status} t={t} />
                  {(status === "expired" || status === "hold") && canOverride && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-warning-text">
                      <AlertTriangle className="h-3 w-3" /> {t("batch.issue_override_confirm")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {batch.expiry_date ?? "—"} · {t("batch.picker_available", { n: balance })}
                </p>
              </div>
              <Input
                type="number" min={0} max={balance} className="w-24 tabular-nums"
                disabled={disabled}
                value={picks[batch.id] ?? ""}
                onChange={(e) => setPicks((p) => ({ ...p, [batch.id]: e.target.value }))}
                data-testid={`picker-qty-${batch.id}`}
              />
            </div>
          );
        })}

        {anyOverridePicked && (
          <div className="space-y-1.5">
            <Label>{t("batch.override_reason_label")}</Label>
            <Textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={2} />
          </div>
        )}

        <p className="text-sm tabular-nums">
          {t("batch.picker_total")}: <span className={cn("font-medium", total !== qtyNeeded && "text-destructive")}>{total}</span> / {qtyNeeded}
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </ModalShell>
  );
}
