/**
 * DD-3 — Receipt / Issue / Return entry points for **non-batch** stocked items, plus the Cost
 * card. Sibling of BatchSection.tsx (DD-2's batch-tab equivalent) — before DD-3, this codebase
 * had no stock-in/issue UI at all for items with `tracks_batch=false` (v1/DD-1/DD-2 never built
 * one; balances were only ever set at creation). Reuses `batchCarrierId()`/`balanceCarrier()`
 * unconditionally (DD-1/DD-2 rule: never branch simple-vs-variant), so this also works for a
 * DD-1 variant carrier when one is passed in.
 *
 * Issue here never blocks on insufficient balance (§2.7 offline-first) — `consumeCostLayers`
 * prices any shortfall at provisional cost and flags `pending_cost_reconciliation` instead.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, MinusCircle, Undo2, Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { InventoryFixture, InventoryItem, InventoryWarehouse } from "./types";
import { batchCarrierId, balanceCarrier } from "./batches";
import {
  effectiveCostingMethod, consumeCostLayers, stocktakeOverageCost,
  buildCostingReceipt, buildCostingIssue, buildSalesReturnReceipt,
} from "./costing";
import { CostCard } from "./CostCard";

interface SectionProps {
  item: InventoryItem;
  warehouses: InventoryWarehouse[];
  data: InventoryFixture;
  lang: "ar" | "en";
  can: (permission: string) => boolean;
  mutate: (updater: (prev: InventoryFixture | null) => InventoryFixture | null) => void;
}

function applyBalanceDelta(balances: InventoryItem["balances"], warehouseId: string, delta: number): InventoryItem["balances"] {
  const existing = balances.find((b) => b.warehouse_id === warehouseId);
  if (!existing) return [...balances, { warehouse_id: warehouseId, qty: delta }];
  return balances.map((b) => (b.warehouse_id === warehouseId ? { ...b, qty: b.qty + delta } : b));
}

/* ── Receipt ──────────────────────────────────────────────────────────── */

function SimpleReceiptDialog({ open, onOpenChange, item, warehouses, data, lang, mutate }: SectionProps & { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation("inventory");
  const carrierId = batchCarrierId(item);
  const [warehouseId, setWarehouseId] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setWarehouseId(warehouses[0]?.id ?? ""); setCost(""); setQty(""); setError(""); setSaving(false); }
  }, [open, warehouses]);

  function handleSubmit() {
    const qtyNum = parseFloat(qty);
    const costNum = parseFloat(cost);
    if (!(qtyNum > 0)) { setError(t("batch.qty_invalid")); return; }
    setSaving(true);
    const movement = buildCostingReceipt(carrierId, item.id, null, warehouseId, qtyNum, costNum || 0, data.ledger);
    mutate((prev) => prev && {
      ...prev,
      ledger: [...prev.ledger, movement],
      items: prev.items.map((it) => it.id === item.id ? { ...it, balances: applyBalanceDelta(it.balances, warehouseId, qtyNum) } : it),
    });
    setSaving(false);
    toast.success(t("batch.receipt_saved"));
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open} onOpenChange={onOpenChange} title={t("batch.receipt_title")}
      description={lang === "ar" ? item.name_ar : item.name_en} size="md"
      footer={<>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>{t("item_editor.cancel")}</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}{t("batch.receipt_save")}</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("filters.warehouse")}</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("columns.cost")}</Label>
            <Input data-testid="cost-receipt-cost" type="number" min={0} className="tabular-nums" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("ledger.col_qty")}</Label>
            <Input data-testid="cost-receipt-qty" type="number" min={0} className="tabular-nums" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </ModalShell>
  );
}

/* ── Issue ────────────────────────────────────────────────────────────── */

function SimpleIssueDialog({ open, onOpenChange, item, warehouses, data, lang, can, mutate }: SectionProps & { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation("inventory");
  const carrierId = batchCarrierId(item);
  const method = effectiveCostingMethod(item, data.settings);
  const canViewCost = can("inventory.cost.view");

  const [warehouseId, setWarehouseId] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const qtyNum = parseFloat(qty) || 0;

  useEffect(() => {
    if (open) { setWarehouseId(warehouses[0]?.id ?? ""); setQty(""); setSaving(false); }
  }, [open, warehouses]);

  const preview = useMemo(() => {
    if (!(qtyNum > 0) || !warehouseId) return null;
    const fallback = stocktakeOverageCost(item);
    const result = consumeCostLayers(carrierId, qtyNum, data.ledger, { method, warehouseId, fallbackCost: fallback });
    const price = item.prices["pl_retail"] ?? Object.values(item.prices)[0] ?? 0;
    return { ...result, margin: price - result.unit_cogs, marginPct: price > 0 ? ((price - result.unit_cogs) / price) * 100 : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtyNum, warehouseId, carrierId, method, data.ledger]);

  function handleSubmit() {
    if (!(qtyNum > 0) || !warehouseId) return;
    setSaving(true);
    const fallback = stocktakeOverageCost(item);
    const { movement, costEvent } = buildCostingIssue(
      carrierId, item.id, null, warehouseId, qtyNum, data.ledger, method, fallback,
      `ISSUE-${Date.now().toString().slice(-6)}`
    );
    mutate((prev) => prev && {
      ...prev,
      ledger: [...prev.ledger, movement],
      cost_events: [...(prev.cost_events ?? []), costEvent],
      items: prev.items.map((it) => it.id === item.id ? { ...it, balances: applyBalanceDelta(it.balances, warehouseId, -qtyNum) } : it),
    });
    setSaving(false);
    toast.success(movement.pending_cost_reconciliation ? t("costing.pending_reconciliation") : t("batch.issue_saved"));
    setWarehouseId(""); setQty("");
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open} onOpenChange={onOpenChange} title={t("batch.issue_title")}
      description={lang === "ar" ? item.name_ar : item.name_en} size="md"
      footer={<>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>{t("item_editor.cancel")}</Button>
        <Button onClick={handleSubmit} disabled={saving || !(qtyNum > 0)}>{saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}{t("actions.confirm")}</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("filters.warehouse")}</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("ledger.col_qty")}</Label>
            <Input data-testid="cost-issue-qty" type="number" min={0} className="tabular-nums" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        </div>

        {canViewCost && preview && (
          <div data-testid="issue-margin" className="rounded-md border border-border bg-muted/20 px-3 py-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("costing.margin")}</span>
              <span className="tabular-nums font-medium">{preview.margin.toFixed(2)} ({preview.marginPct.toFixed(1)}%)</span>
            </div>
            {preview.pending_cost_reconciliation && (
              <p className="text-xs text-warning-text">{t("costing.pending_reconciliation")}</p>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/* ── Return (sales / purchase) ───────────────────────────────────────── */

function SimpleReturnDialog({ open, onOpenChange, item, warehouses, data, lang, mutate }: SectionProps & { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation("inventory");
  const carrierId = batchCarrierId(item);
  const method = effectiveCostingMethod(item, data.settings);

  const [kind, setKind] = useState<"sales" | "purchase">("sales");
  const [warehouseId, setWarehouseId] = useState("");
  const [originalId, setOriginalId] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const qtyNum = parseFloat(qty) || 0;

  useEffect(() => {
    if (open) { setWarehouseId(warehouses[0]?.id ?? ""); setOriginalId(""); setQty(""); setSaving(false); }
  }, [open, warehouses]);

  const pastIssues = data.ledger.filter(
    (m) => balanceCarrier(m) === carrierId && m.type === "issue" && m.warehouse_id === warehouseId
  );
  const original = pastIssues.find((m) => m.id === originalId) ?? null;

  function handleSubmit() {
    if (!(qtyNum > 0) || !warehouseId) return;
    setSaving(true);

    if (kind === "sales") {
      if (!original) { setSaving(false); return; }
      const { movement, costEvent } = buildSalesReturnReceipt(original, qtyNum, data.ledger, `SRET-${Date.now().toString().slice(-6)}`, method);
      mutate((prev) => prev && {
        ...prev,
        ledger: [...prev.ledger, movement],
        cost_events: [...(prev.cost_events ?? []), costEvent],
        items: prev.items.map((it) => it.id === item.id ? { ...it, balances: applyBalanceDelta(it.balances, warehouseId, qtyNum) } : it),
      });
    } else {
      const fallback = item.avg_cost ?? item.last_purchase_price ?? 0;
      const { movement, costEvent } = buildCostingIssue(
        carrierId, item.id, null, warehouseId, qtyNum, data.ledger, method, fallback,
        `PRET-${Date.now().toString().slice(-6)}`, "purchase_return"
      );
      mutate((prev) => prev && {
        ...prev,
        ledger: [...prev.ledger, movement],
        cost_events: [...(prev.cost_events ?? []), costEvent],
        items: prev.items.map((it) => it.id === item.id ? { ...it, balances: applyBalanceDelta(it.balances, warehouseId, -qtyNum) } : it),
      });
    }

    setSaving(false);
    toast.success(t("batch.receipt_saved"));
    setQty(""); setOriginalId("");
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open} onOpenChange={onOpenChange} title={lang === "ar" ? "مرتجع" : "Return"}
      description={lang === "ar" ? item.name_ar : item.name_en} size="md"
      footer={<>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>{t("item_editor.cancel")}</Button>
        <Button onClick={handleSubmit} disabled={saving || !(qtyNum > 0) || (kind === "sales" && !original)}>
          {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}{t("actions.confirm")}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{lang === "ar" ? "نوع المرتجع" : "Return type"}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "sales" | "purchase")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">{lang === "ar" ? "مرتجع مبيعات" : "Sales return"}</SelectItem>
                <SelectItem value="purchase">{lang === "ar" ? "مرتجع مشتريات" : "Purchase return"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("filters.warehouse")}</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {kind === "sales" && (
          <div className="space-y-1.5">
            <Label>{lang === "ar" ? "الفاتورة الأصلية" : "Original sale"}</Label>
            <Select value={originalId} onValueChange={setOriginalId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {pastIssues.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.source_ref} — {m.date} — {formatCostChip(-m.qty, m.cost ?? 0)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {original && (
              <p className="text-xs text-muted-foreground">
                {lang === "ar" ? "سيرجع بنفس التكلفة الأصلية" : "Returns at its original COGS"}: {original.cost}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>{t("ledger.col_qty")}</Label>
          <Input data-testid="cost-return-qty" type="number" min={0} className="tabular-nums" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
}

function formatCostChip(qty: number, cost: number): string {
  return `${qty} @ ${cost}`;
}

/* ── Section ──────────────────────────────────────────────────────────── */

export function CostingSection({ item, warehouses, data, lang, can, mutate }: SectionProps) {
  const { t } = useTranslation("inventory");
  const carrierId = batchCarrierId(item);
  const method = effectiveCostingMethod(item, data.settings);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  return (
    <div className="space-y-3">
      <CostCard carrierId={carrierId} item={item} method={method} data={data} warehouses={warehouses} lang={lang} can={can} mutate={mutate} />

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>
          <Undo2 className="h-3.5 w-3.5 me-1.5" />
          {lang === "ar" ? "مرتجع" : "Return"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIssueOpen(true)}>
          <MinusCircle className="h-3.5 w-3.5 me-1.5" />
          {t("batch.issue_title")}
        </Button>
        <Button size="sm" data-testid="open-cost-receipt-btn" onClick={() => setReceiptOpen(true)}>
          <Plus className="h-3.5 w-3.5 me-1.5" />
          {t("batch.receipt_title")}
        </Button>
      </div>

      <SimpleReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} item={item} warehouses={warehouses} data={data} lang={lang} can={can} mutate={mutate} />
      <SimpleIssueDialog open={issueOpen} onOpenChange={setIssueOpen} item={item} warehouses={warehouses} data={data} lang={lang} can={can} mutate={mutate} />
      <SimpleReturnDialog open={returnOpen} onOpenChange={setReturnOpen} item={item} warehouses={warehouses} data={data} lang={lang} can={can} mutate={mutate} />
    </div>
  );
}
