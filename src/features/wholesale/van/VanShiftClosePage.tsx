import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LockKeyhole, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SettlementCard } from "@/components/van/SettlementCard";
import { ZReportDialog } from "./ZReportDialog";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useVanSession } from "@/stores/vanSession";
import { useWholesaleVanShifts } from "@/stores/wholesaleVanShifts";
import { useWholesaleVanLoads, nextVanLoadNumber } from "@/stores/wholesaleVanLoads";
import { useWholesaleVanSales } from "@/stores/wholesaleVanSales";
import { useWholesaleCollections } from "@/stores/wholesaleCollections";
import { useWholesaleSyncQueue } from "@/stores/wholesaleSyncQueue";
import { getItems, getUoms, getReps, getWarehouses } from "@/lib/mock/wholesale";
import { toBase, fromBase } from "@/lib/wholesale/pricing";
import { computeCollectionCommission } from "@/lib/wholesale/commission";
import type { GoodsVariance, VanShiftStatus, VanShift } from "@/types/wholesale";

const GOODS_VARIANCE_REASONS = ["damage", "spoilage", "count", "gift", "fix"] as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function VanShiftClosePage() {
  const navigate = useNavigate();
  const { t } = useTranslation("van");
  const { lang } = useAppearance();

  const session = useVanSession();
  const closeVanSession = useVanSession((s) => s.closeVanSession);
  const shifts = useWholesaleVanShifts((s) => s.shifts);
  const closeShift = useWholesaleVanShifts((s) => s.closeShift);
  const loads = useWholesaleVanLoads((s) => s.loads);
  const addLoad = useWholesaleVanLoads((s) => s.addLoad);
  const sales = useWholesaleVanSales((s) => s.sales);
  const collections = useWholesaleCollections((s) => s.collections);
  const syncEntries = useWholesaleSyncQueue((s) => s.entries);
  const syncNow = useWholesaleSyncQueue((s) => s.syncNow);
  const syncState = useWholesaleSyncQueue((s) => s.syncState);

  const items = useMemo(() => getItems(), []);
  const uoms = useMemo(() => getUoms(), []);
  const rep = useMemo(() => getReps().find((r) => r.id === session.repId), [session.repId]);
  const van = useMemo(() => getWarehouses().find((w) => w.id === session.vanWarehouseId), [session.vanWarehouseId]);
  const parentWarehouse = useMemo(
    () => getWarehouses().find((w) => w.type === "storage" && w.branch_id === van?.branch_id),
    [van],
  );

  const currentShift = useMemo(
    () => shifts.find((s) => s.rep_id === session.repId && s.status === "open"),
    [shifts, session.repId],
  );
  const currentLoad = useMemo(
    () => loads.find((l) => l.shift_id === currentShift?.id && l.type === "load"),
    [loads, currentShift],
  );
  const shiftSales = useMemo(
    () => sales.filter((s) => s.shift_id === currentShift?.id),
    [sales, currentShift],
  );
  const shiftCollections = useMemo(
    () => collections.filter((c) => c.shift_id === currentShift?.id),
    [collections, currentShift],
  );
  const pendingSyncCount = useMemo(
    () => syncEntries.filter((e) => e.shift_id === currentShift?.id && e.status === "pending").length,
    [syncEntries, currentShift],
  );

  const goodsRows = useMemo(() => {
    const ids = new Set<string>();
    currentLoad?.lines.forEach((l) => ids.add(l.item_id));
    shiftSales.forEach((s) => s.lines.forEach((l) => ids.add(l.item_id)));
    return Array.from(ids).map((itemId) => {
      const loadLine = currentLoad?.lines.find((l) => l.item_id === itemId);
      const item = items.find((i) => i.id === itemId);
      // Loaded/sold/returned are tallied in base units to match the fixture's own
      // `goods_variance[].expected_base/counted_base` convention (sh_van_299) —
      // `carton_uom_id` is kept separately only for the hint text and the return doc.
      const carton_uom_id = loadLine?.uom_id ?? item?.wholesale_uom ?? "uom_pc";
      const base_uom_id = item?.base_uom ?? carton_uom_id;
      const loaded_base = loadLine ? toBase(loadLine.qty_received, loadLine.uom_id) : 0;
      const sold_base = shiftSales.reduce(
        (sum, s) => sum + s.lines.filter((l) => l.item_id === itemId).reduce((ss, l) => ss + toBase(l.qty, l.uom_id), 0),
        0,
      );
      const returned_base = 0; // customer-return recording isn't built yet (VanVisitPage's "Return" is a stub)
      const expected_base = round2(loaded_base - sold_base - returned_base);
      return { item_id: itemId, carton_uom_id, base_uom_id, loaded_base, sold_base, returned_base, expected_base };
    });
  }, [currentLoad, shiftSales, items]);

  const [counted, setCounted] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [declared, setDeclared] = useState("");
  const [zReportOpen, setZReportOpen] = useState(false);
  const [closedShift, setClosedShift] = useState<VanShift | null>(null);
  const [closedCommission, setClosedCommission] = useState<ReturnType<typeof computeCollectionCommission>>(null);

  useEffect(() => {
    setCounted((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const row of goodsRows) {
        if (next[row.item_id] === undefined) { next[row.item_id] = String(row.expected_base); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [goodsRows]);

  const expectedCash = round2((currentShift?.opening_float ?? 0) + (currentShift?.cash_sales ?? 0) + (currentShift?.collections ?? 0));
  const declaredNum = parseFloat(declared) || 0;
  const cashVariance = round2(declaredNum - expectedCash);

  const goodsVarianceRows = goodsRows.map((row) => {
    const countedNum = parseFloat(counted[row.item_id] ?? "") || 0;
    const variance_base = round2(countedNum - row.expected_base);
    return { ...row, counted_base: countedNum, variance_base, reason: reasons[row.item_id] ?? "" };
  });

  const missingReasons = goodsVarianceRows.some((r) => Math.abs(r.variance_base) > 0.005 && !r.reason);
  const declaredMissing = declared.trim() === "";
  const canClose = !!currentShift && pendingSyncCount === 0 && !declaredMissing && !missingReasons;

  const reasonOptions = GOODS_VARIANCE_REASONS.map((r) => ({ value: r, label: t(`shift_close.reason_${r}`) }));

  function uomLabel(uomId: string): string {
    const u = uoms.find((x) => x.id === uomId);
    return u ? (lang === "ar" ? u.name_ar : u.name_en) : uomId;
  }

  function formatQty(uomId: string) {
    return (n: number) => `${n} ${uomLabel(uomId)}`;
  }

  function handleClose() {
    if (!currentShift) return;
    if (pendingSyncCount > 0) { toast.error(t("shift_close.error_pending_sync")); return; }
    if (missingReasons) { toast.error(t("shift_close.error_reason_required")); return; }
    if (declaredMissing) { toast.error(t("shift_close.error_declared_required")); return; }

    const goods_variance: GoodsVariance[] = goodsVarianceRows
      .filter((r) => Math.abs(r.variance_base) > 0.005)
      .map((r) => ({ item_id: r.item_id, expected_base: r.expected_base, counted_base: r.counted_base, variance_base: r.variance_base, reason: r.reason }));

    const totalCollectedThisShift = round2(shiftCollections.reduce((s, c) => s + c.amount, 0));
    const commission = computeCollectionCommission(rep, totalCollectedThisShift);

    const hasVariance = Math.abs(cashVariance) > 0.005 || goods_variance.length > 0;
    const status: VanShiftStatus = hasVariance ? "closed_with_variance" : "closed";
    const closed_at = new Date().toISOString();

    closeShift(currentShift.id, {
      status,
      closed_at,
      declared_cash: declaredNum,
      cash_variance: cashVariance,
      goods_variance,
      commission_estimate: commission?.amount ?? 0,
      settlement_status: hasVariance ? "pending_approval" : undefined,
    });

    const returnLines = goodsVarianceRows
      .filter((r) => r.counted_base > 0)
      .map((r) => ({ item_id: r.item_id, uom_id: r.carton_uom_id, qty_sent: fromBase(r.counted_base, r.carton_uom_id), qty_received: 0 }));

    if (returnLines.length > 0 && parentWarehouse && session.vanWarehouseId) {
      addLoad({
        id: crypto.randomUUID(),
        type: "return",
        number: nextVanLoadNumber(loads, "return"),
        date: todayStr(),
        rep_id: session.repId ?? "",
        from_warehouse: session.vanWarehouseId,
        to_warehouse: parentWarehouse.id,
        shift_id: currentShift.id,
        status: "sent",
        lines: returnLines,
      });
    }

    closeVanSession();
    setClosedShift({ ...currentShift, status, closed_at, declared_cash: declaredNum, cash_variance: cashVariance, goods_variance, commission_estimate: commission?.amount ?? 0 });
    setClosedCommission(commission);
    setZReportOpen(true);
    toast.success(t("shift_close.success_toast"));
  }

  function handleZReportClose(open: boolean) {
    setZReportOpen(open);
    if (!open) navigate("/van/today");
  }

  return (
    <div className="h-full overflow-auto p-4">
      {!currentShift ? (
        <EmptyState icon={LockKeyhole} title={t("shift_close.no_open_shift")} description="" />
      ) : (
      <div className="max-w-3xl mx-auto space-y-4">
        <PageHeader title={t("shift_close.title")} subtitle={rep ? (lang === "ar" ? rep.name_ar : rep.name_en) : undefined} />

        {pendingSyncCount > 0 && (
          <div className="space-y-2">
            <Alert variant="warning" title={t("shift_close.pending_sync_title")}>
              {t("shift_close.pending_sync_body", { n: pendingSyncCount })}
            </Alert>
            <Button variant="outline" size="sm" disabled={syncState === "syncing"} onClick={() => void syncNow()}>
              <RefreshCw className={`h-3.5 w-3.5 me-1.5 ${syncState === "syncing" ? "animate-spin" : ""}`} />
              {t("shift_close.sync_now")}
            </Button>
          </div>
        )}

        <PageSection title={t("shift_close.goods_title")}>
          <div className="divide-y divide-border">
            {goodsRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t("shift_close.no_goods")}</p>
            ) : (
              goodsVarianceRows.map((row) => {
                const item = items.find((i) => i.id === row.item_id);
                return (
                  <SettlementCard
                    key={row.item_id}
                    label={item ? (lang === "ar" ? item.name_ar : item.name_en) : row.item_id}
                    hint={t("shift_close.goods_hint", {
                      loaded: `${fromBase(row.loaded_base, row.carton_uom_id)} ${uomLabel(row.carton_uom_id)}`,
                      sold: `${fromBase(row.sold_base, row.carton_uom_id)} ${uomLabel(row.carton_uom_id)}`,
                      returned: `${fromBase(row.returned_base, row.carton_uom_id)} ${uomLabel(row.carton_uom_id)}`,
                    })}
                    expected={row.expected_base}
                    actual={counted[row.item_id] ?? ""}
                    onActualChange={(v) => setCounted((prev) => ({ ...prev, [row.item_id]: v }))}
                    format={formatQty(row.base_uom_id)}
                    reasonOptions={reasonOptions}
                    reason={reasons[row.item_id]}
                    onReasonChange={(v) => setReasons((prev) => ({ ...prev, [row.item_id]: v }))}
                  />
                );
              })
            )}
          </div>
        </PageSection>

        <PageSection title={t("shift_close.cash_title")}>
          <SettlementCard
            label={t("shift_close.cash_label")}
            hint={t("shift_close.cash_hint", {
              float: formatMoney(currentShift.opening_float, lang),
              sales: formatMoney(currentShift.cash_sales, lang),
              collections: formatMoney(currentShift.collections, lang),
            })}
            expected={expectedCash}
            actual={declared}
            onActualChange={setDeclared}
            format={(n) => formatMoney(n, lang)}
          />
        </PageSection>

        <PageSection title={t("shift_close.return_title")}>
          {goodsVarianceRows.some((r) => r.counted_base > 0) ? (
            <p className="text-sm text-muted-foreground">
              {t("shift_close.return_body", { warehouse: parentWarehouse ? (lang === "ar" ? parentWarehouse.name_ar : parentWarehouse.name_en) : "—" })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("shift_close.return_empty")}</p>
          )}
        </PageSection>

        <Button className="w-full" disabled={!canClose} onClick={handleClose}>
          {t("shift_close.submit")}
        </Button>
      </div>
      )}

      <ZReportDialog
        shift={closedShift}
        commission={closedCommission}
        open={zReportOpen}
        onOpenChange={handleZReportClose}
        lang={lang}
      />
    </div>
  );
}
