/**
 * DD-3 §2.3/§2.7 — read-only Cost card: current unit cost + effective-method chip, the
 * cost-layer stack (FIFO/specific) or running-average timeline (average), total valuation per
 * warehouse, and the pending-cost-reconciliation chip + reconcile action. Entirely hidden
 * without `inventory.cost.view` (frontend §2.3, §5.7 — redacted, not just visually hidden).
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Layers, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { InventoryFixture, InventoryItem, InventoryWarehouse } from "./types";
import {
  deriveCostLayers, deriveAverageTimeline, itemCurrentCost, itemValuation, buildCostReconciliation,
  type EffectiveCostingMethod,
} from "./costing";
import { balanceCarrier } from "./batches";

interface CostCardProps {
  carrierId: string;
  item: InventoryItem;
  method: EffectiveCostingMethod;
  data: InventoryFixture;
  warehouses: InventoryWarehouse[];
  lang: "ar" | "en";
  can: (permission: string) => boolean;
  mutate: (updater: (prev: InventoryFixture | null) => InventoryFixture | null) => void;
}

export function CostCard({ carrierId, item, method, data, warehouses, lang, can, mutate }: CostCardProps) {
  const { t } = useTranslation("inventory");
  const [showDepleted, setShowDepleted] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const canViewCost = can("inventory.cost.view");
  const ledger = data.ledger;

  const currentCost = useMemo(
    () => itemCurrentCost(item, ledger, carrierId, method),
    [item, ledger, carrierId, method]
  );

  const layers = useMemo(
    () => (method === "average" ? [] : deriveCostLayers(carrierId, ledger, method, { includeDepleted: true })),
    [carrierId, ledger, method]
  );
  const openLayers = layers.filter((l) => l.qty_remaining > 0);
  const depletedLayers = layers.filter((l) => l.qty_remaining === 0);

  const timeline = useMemo(
    () => (method === "average" ? deriveAverageTimeline(carrierId, ledger) : []),
    [carrierId, ledger, method]
  );

  const warehouseValuations = useMemo(
    () =>
      warehouses
        .map((w) => ({ warehouse: w, value: itemValuation(carrierId, ledger, method, { warehouseId: w.id }) }))
        .filter((v) => v.value > 0),
    [warehouses, carrierId, ledger, method]
  );
  const totalValuation = useMemo(() => itemValuation(carrierId, ledger, method), [carrierId, ledger, method]);

  // §2.7 — a pending issue for this carrier, and the earliest receipt after it (the "covering" one).
  const pendingIssue = ledger.find((m) => balanceCarrier(m) === carrierId && m.pending_cost_reconciliation);
  const coveringReceipt = pendingIssue
    ? ledger
        .filter((m) => balanceCarrier(m) === carrierId && m.warehouse_id === pendingIssue.warehouse_id && m.qty > 0 && m.date >= pendingIssue.date && m.id !== pendingIssue.id)
        .sort((a, b) => (a.date < b.date ? -1 : 1))[0]
    : undefined;

  function handleReconcile() {
    if (!pendingIssue || !coveringReceipt) return;
    setReconciling(true);
    const { adjustment, costEvent } = buildCostReconciliation(pendingIssue, coveringReceipt, ledger, method);
    mutate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ledger: [
          ...prev.ledger.map((m) => (m.id === pendingIssue.id ? { ...m, pending_cost_reconciliation: false } : m)),
          adjustment,
        ],
        cost_events: [...(prev.cost_events ?? []), costEvent],
      };
    });
    setReconciling(false);
    toast.success(t("costing.pending_reconciliation") + " ✓");
  }

  if (!canViewCost) return null;

  return (
    <div data-testid="cost-card" className="rounded-md border border-border p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{t("costing.cost_card_title")}</span>
          <Badge variant="secondary" className="text-xs" data-testid="cost-method-chip">
            {method === "specific" ? t("costing.specific_locked") : t(`costing.method.${method}`)}
          </Badge>
        </div>
        <div className="text-sm tabular-nums">
          <span className="text-muted-foreground">{t("costing.unit_cost")}: </span>
          <span className="font-semibold">{formatMoney(currentCost, lang)}</span>
        </div>
      </div>

      {pendingIssue && (
        <div className="flex items-center justify-between gap-2 rounded bg-warning/10 px-3 py-2 text-xs text-warning-text">
          <span data-testid="pending-reconciliation-chip">{t("costing.pending_reconciliation")}</span>
          {coveringReceipt && (
            <Button size="sm" variant="outline" className="h-6 text-xs" data-testid="reconcile-btn" onClick={handleReconcile} disabled={reconciling}>
              <RefreshCw className={cn("h-3 w-3 me-1", reconciling && "animate-spin")} />
              {lang === "ar" ? "تسوية الآن" : "Reconcile now"}
            </Button>
          )}
        </div>
      )}

      {method === "average" ? (
        timeline.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("batch.empty")}</p>
        ) : (
          <div className="rounded border border-border overflow-x-auto">
            <table className="w-full text-xs min-w-[480px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-start px-2 py-1.5 font-medium text-muted-foreground">{t("columns.date")}</th>
                  <th className="text-start px-2 py-1.5 font-medium text-muted-foreground">{t("ledger.col_qty")}</th>
                  <th className="text-start px-2 py-1.5 font-medium text-muted-foreground">{t("costing.unit_cost")}</th>
                  <th className="text-start px-2 py-1.5 font-medium text-muted-foreground">{t("costing.new_avg")}</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((row) => (
                  <tr key={row.receipt_movement_id} className="border-t border-border">
                    <td className="px-2 py-1.5 tabular-nums whitespace-nowrap">{row.date}</td>
                    <td className="px-2 py-1.5 tabular-nums">{formatNumber(row.qty_in)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{formatNumber(row.unit_cost_in)}</td>
                    <td className="px-2 py-1.5 tabular-nums font-medium" data-testid="avg-new-avg">{formatNumber(row.new_avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : openLayers.length === 0 && depletedLayers.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("batch.empty")}</p>
      ) : (
        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-xs min-w-[480px]" data-testid="cost-layer-table">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-start px-2 py-1.5 font-medium text-muted-foreground">{t("columns.date")}</th>
                <th className="text-start px-2 py-1.5 font-medium text-muted-foreground">{t("costing.unit_cost")}</th>
                <th className="text-start px-2 py-1.5 font-medium text-muted-foreground">{t("costing.qty_remaining")}</th>
                <th className="text-start px-2 py-1.5 font-medium text-muted-foreground">{t("costing.layer_value")}</th>
              </tr>
            </thead>
            <tbody>
              {openLayers.map((l) => (
                <tr key={l.receipt_movement_id} className="border-t border-border" data-testid="cost-layer-row">
                  <td className="px-2 py-1.5 tabular-nums whitespace-nowrap">{l.date}</td>
                  <td className="px-2 py-1.5 tabular-nums">{formatNumber(l.unit_cost)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{formatNumber(l.qty_remaining)}</td>
                  <td className="px-2 py-1.5 tabular-nums font-medium">{formatNumber(l.qty_remaining * l.unit_cost)}</td>
                </tr>
              ))}
              {showDepleted && depletedLayers.map((l) => (
                <tr key={l.receipt_movement_id} className="border-t border-border opacity-50">
                  <td className="px-2 py-1.5 tabular-nums whitespace-nowrap">{l.date}</td>
                  <td className="px-2 py-1.5 tabular-nums">{formatNumber(l.unit_cost)}</td>
                  <td className="px-2 py-1.5 tabular-nums">0</td>
                  <td className="px-2 py-1.5 tabular-nums">0</td>
                </tr>
              ))}
            </tbody>
          </table>
          {depletedLayers.length > 0 && (
            <button
              type="button"
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground border-t border-border"
              onClick={() => setShowDepleted((v) => !v)}
            >
              {showDepleted ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {t("costing.show_depleted")}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border">
        <span className="text-xs text-muted-foreground">{t("costing.total_valuation")}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {warehouseValuations.map(({ warehouse, value }) => (
            <span key={warehouse.id} className="text-xs rounded bg-muted px-1.5 py-0.5 tabular-nums">
              {lang === "ar" ? warehouse.name_ar : warehouse.name_en}: {formatMoney(value, lang)}
            </span>
          ))}
          <span className="text-sm font-semibold tabular-nums" data-testid="total-valuation">{formatMoney(totalValuation, lang)}</span>
        </div>
      </div>
    </div>
  );
}
