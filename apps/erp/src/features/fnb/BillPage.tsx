import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Lock, Minus, Plus, Printer, UtensilsCrossed, ShoppingBag, Bike, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill } from "@/components/patterns/StatusPill";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePosShift } from "@/stores/posShift";
import { TenderModal } from "@/features/pos/TenderModal";
import { useFnbOrder, type FnbBillGroup, type FnbOrderType, type FnbSplitMode } from "@/stores/fnbOrder";
import { useFnbFloor } from "@/stores/fnbFloor";
import { useFnbKds } from "@/stores/fnbKds";
import inventoryFixtures from "@/lib/mock/fixtures/Inventory.fixtures.json";
import salesFixtures from "@/lib/mock/fixtures/sales.fixtures.json";
import { useBill } from "./useBill";
import { billableLines, computeBillTotals, lineNet, splitByAssignment, splitEqually } from "./billTotals";
import { BillAssignmentMatrix } from "./BillAssignmentMatrix";
import { findMenuItem, modifierLabels } from "./menu";

const TAX_TYPES = inventoryFixtures.tax_types as { id: string; rate: number }[];
const TAX_RATES: Record<string, number> = Object.fromEntries(TAX_TYPES.map(tt => [tt.id, tt.rate]));
const SALES_CUSTOMERS = salesFixtures.customers as { id: string; trn: string | null }[];

const TYPE_ICON: Record<FnbOrderType, typeof UtensilsCrossed> = {
  "dine-in": UtensilsCrossed,
  takeaway: ShoppingBag,
  delivery: Bike,
};

const SPLIT_TABS: FnbSplitMode[] = ["none", "equally", "by_item", "by_seat"];

function groupLabel(mode: FnbSplitMode, group: FnbBillGroup, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (mode === "none") return t("bill.split.whole_check");
  if (mode === "by_seat") return t("bill.split.seat_label", { n: group.index });
  return t("bill.split.group_label", { n: group.index });
}

export default function BillPage() {
  const { t } = useTranslation("fnb");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();
  const { checkId = "" } = useParams<{ checkId: string }>();

  const check = useFnbOrder(s => s.checks[checkId]);
  const ensureBill = useFnbOrder(s => s.ensureBill);
  const setServiceChargePct = useFnbOrder(s => s.setServiceChargePct);
  const setTips = useFnbOrder(s => s.setTips);
  const configureSplit = useFnbOrder(s => s.configureSplit);
  const settleGroup = useFnbOrder(s => s.settleGroup);
  const fireLines = useFnbOrder(s => s.fireLines);
  const createTicketsFromFire = useFnbKds(s => s.createTicketsFromFire);
  const tables = useFnbFloor(s => s.tables);
  const freeTable = useFnbFloor(s => s.freeTable);
  const shiftOpen = usePosShift(s => s.status === "open");

  const { loading, error, isOffline, reload } = useBill();

  const [pendingMode, setPendingMode] = useState<FnbSplitMode>("none");
  const [groupCount, setGroupCount] = useState(2);
  const [assignments, setAssignments] = useState<Record<string, number[]>>({});
  const [tenderTarget, setTenderTarget] = useState<FnbBillGroup | null>(null);

  useEffect(() => {
    if (check) ensureBill(check.id);
  }, [check, ensureBill]);

  // Safety net: any line that reached Bill without being fired (e.g. a quick-settle
  // flow) still needs to route to the kitchen and deplete BOM before it's charged.
  useEffect(() => {
    if (!check) return;
    const hasHeld = check.lines.some(l => l.status === "held");
    if (!hasHeld) return;
    const fired = fireLines(check.id, null);
    if (fired.length > 0) {
      createTicketsFromFire({
        check_id: check.id,
        check_number: check.number,
        order_type: check.type,
        table_number: check.table_id ? (tables.find(tb => tb.id === check.table_id)?.number ?? null) : null,
        lines: fired,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [check?.id]);

  useEffect(() => {
    if (check?.bill) setPendingMode(check.bill.mode);
  }, [check?.bill?.mode]);

  const lines = useMemo(() => (check ? billableLines(check) : []), [check]);
  const totals = useMemo(() => (check ? computeBillTotals(check, TAX_RATES) : null), [check]);

  // Keep the default (unsplit) group's amount live against the grand total — service
  // charge/tips edits happen on this same screen and must flow through before Settle
  // unlocks (the "none" split tab has no Apply button, so nothing else refreshes it).
  useEffect(() => {
    if (!check?.bill || !totals) return;
    if (check.bill.mode !== "none" || check.bill.groups[0]?.settled) return;
    if (check.bill.groups[0]?.amount === totals.grandTotal) return;
    configureSplit(check.id, "none", [{ lineIds: lines.map(l => l.id), amount: totals.grandTotal }]);
  }, [check?.bill, totals, check?.id, lines, configureSplit]);

  if (!can("fnb.bill.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("bill.permission_required")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-3 p-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="flex-1 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4"><ErrorState title={t("bill.error_title")} description={t("bill.error_body")} onRetry={reload} /></div>;
  }

  if (!check || !totals) return null;

  const table = check.table_id ? tables.find(tb => tb.id === check.table_id) : undefined;
  const TypeIcon = TYPE_ICON[check.type];
  const tableOrType = check.type === "dine-in" && table
    ? t("order.table_label", { number: table.number })
    : t(`order.type.${check.type === "dine-in" ? "dine_in" : check.type}`);

  const canOverride = can("fnb.discount.override");
  const splitLocked = !!check.bill && check.bill.mode !== "none";
  const anySettled = check.bill?.groups.some(g => g.settled) ?? false;

  const customer = SALES_CUSTOMERS.find(c => c.id === check.customer_id);
  const b2b = !!customer?.trn;

  function toggleAssignment(lineId: string, groupIndex: number) {
    setAssignments(prev => {
      const current = prev[lineId] ?? [];
      const next = current.includes(groupIndex) ? current.filter(i => i !== groupIndex) : [...current, groupIndex];
      return { ...prev, [lineId]: next };
    });
  }

  function handleApplySplit(mode: FnbSplitMode) {
    if (!check || !totals) return;
    if (mode === "none") {
      const result = configureSplit(check.id, "none", [{ lineIds: lines.map(l => l.id), amount: totals.grandTotal }]);
      if (result === "blocked_settled") toast.error(t("bill.split.locked_hint"));
      return;
    }
    if (mode === "equally") {
      const amounts = splitEqually(totals.grandTotal, groupCount);
      const result = configureSplit(check.id, "equally", amounts.map(amount => ({ lineIds: [], amount })));
      if (result === "blocked_settled") toast.error(t("bill.split.locked_hint"));
      return;
    }
    const unassigned = lines.filter(l => !(assignments[l.id]?.length));
    if (unassigned.length > 0) {
      toast.error(t("bill.split.unassigned_warning"));
      return;
    }
    const groups = splitByAssignment(lines, assignments, groupCount, totals.grandTotal);
    const result = configureSplit(check.id, mode, groups);
    if (result === "blocked_settled") toast.error(t("bill.split.locked_hint"));
  }

  function handleSettleConfirm(result: { tenders: Record<string, number>; paymentStatus: "paid" | "credit"; syncStatus: "local" | "queued" }) {
    if (!check || !tenderTarget || !totals) return;
    const taxShare = totals.grandTotal > 0 ? totals.tax * (tenderTarget.amount / totals.grandTotal) : 0;
    usePosShift.getState().recordSale(result.tenders, taxShare);
    const fullyPaid = settleGroup(check.id, tenderTarget.id, { payment_status: result.paymentStatus, sync_status: result.syncStatus });
    toast.success(t("bill.settled_toast", { group: groupLabel(check.bill?.mode ?? "none", tenderTarget, t) }));
    setTenderTarget(null);
    if (fullyPaid) {
      if (check.type === "dine-in" && check.table_id) freeTable(check.table_id);
      toast.success(t("bill.fully_settled_toast"));
      navigate("/fnb/floor");
    }
  }

  const groups = check.bill?.groups ?? [];

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-2xl mx-auto space-y-4 pb-8">
        {isOffline && <OfflineBanner message={t("bill.offline_note")} />}

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="icon" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(`/fnb/order/${checkId}`)} aria-label={t("order.back_to_floor")}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground shrink-0">
            <TypeIcon className="h-4 w-4" />
            {tableOrType}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums shrink-0">{check.number}</span>
          <StatusPill variant={check.status === "settled" ? "approved" : check.status === "billed" ? "pending" : "default"} label={t(`order.status.${check.status}`)} />
          <span className="flex-1" />
          <span className="text-xs text-muted-foreground">{b2b ? t("bill.channel_b2b") : t("bill.channel_b2c")}</span>
        </div>

        {lines.length === 0 ? (
          <EmptyState icon={Receipt} title={t("bill.empty_title")} description={t("bill.empty_body")} />
        ) : (
          <>
            {/* Lines */}
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              {lines.map(line => {
                const item = findMenuItem(line.item_id);
                const name = item ? (lang === "ar" ? item.name_ar : item.name_en) : line.name;
                const mods = modifierLabels(line.modifiers, lang);
                return (
                  <div key={line.id} className="flex items-center justify-between gap-2 p-2.5 bg-card">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{line.qty}× {name}</p>
                      {mods.length > 0 && <p className="text-xs text-muted-foreground truncate">{mods.join(" · ")}</p>}
                    </div>
                    <span className="tabular-nums text-sm font-semibold text-foreground shrink-0">{formatMoney(lineNet(line), lang)}</span>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="rounded-lg border border-border p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("bill.subtotal")}</span>
                <span className="tabular-nums font-medium">{formatMoney(totals.subtotal, lang)}</span>
              </div>

              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground shrink-0">{t("bill.service_charge")}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min="0" step="1" inputMode="decimal"
                    disabled={!canOverride || splitLocked}
                    value={check.service_charge_pct}
                    onChange={e => setServiceChargePct(check.id, parseFloat(e.target.value) || 0)}
                    className="h-9 w-16 text-end tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <span className="tabular-nums font-medium w-20 text-end">{formatMoney(totals.serviceCharge, lang)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground shrink-0">{t("bill.tips")}</span>
                <Input
                  type="number" min="0" step="1" inputMode="decimal"
                  disabled={splitLocked}
                  value={check.tips}
                  onChange={e => setTips(check.id, parseFloat(e.target.value) || 0)}
                  className="h-9 w-24 text-end tabular-nums"
                />
              </div>

              {check.type === "delivery" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("bill.delivery_fee")}</span>
                  <span className="tabular-nums font-medium">{formatMoney(totals.deliveryFee, lang)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("bill.tax")}</span>
                <span className="tabular-nums font-medium">{formatMoney(totals.tax, lang)}</span>
              </div>

              <div className="flex items-center justify-between font-bold text-foreground pt-2 border-t border-border text-base">
                <span>{t("bill.grand_total")}</span>
                <span className="tabular-nums">{formatMoney(totals.grandTotal, lang)}</span>
              </div>
            </div>

            {/* Split control */}
            <div className="space-y-3">
              <Tabs
                value={pendingMode}
                onValueChange={(v) => setPendingMode(v as FnbSplitMode)}
              >
                <TabsList className="h-auto p-1 flex-wrap justify-start bg-muted gap-1 w-full">
                  {SPLIT_TABS.map(mode => (
                    <TabsTrigger key={mode} value={mode} disabled={splitLocked && mode !== check.bill?.mode} className="h-10 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      {t(`bill.split.${mode === "none" ? "whole_check" : mode}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {splitLocked && (
                <p className="text-xs text-muted-foreground">{anySettled ? t("bill.split.locked_hint") : ""}</p>
              )}

              {!splitLocked && pendingMode === "equally" && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{t("bill.split.groups_count")}</span>
                  <div className="inline-flex items-center gap-1 rounded border border-border h-9">
                    <button type="button" onClick={() => setGroupCount(n => Math.max(2, n - 1))} className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="-">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{groupCount}</span>
                    <button type="button" onClick={() => setGroupCount(n => Math.min(10, n + 1))} className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="+">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Button variant="solid" tone="primary" size="sm" className="h-9" onClick={() => handleApplySplit("equally")}>
                    {t("bill.split.apply")}
                  </Button>
                </div>
              )}

              {!splitLocked && (pendingMode === "by_item" || pendingMode === "by_seat") && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {t(pendingMode === "by_seat" ? "bill.split.seats_count" : "bill.split.groups_count")}
                    </span>
                    <div className="inline-flex items-center gap-1 rounded border border-border h-9">
                      <button type="button" onClick={() => setGroupCount(n => Math.max(2, n - 1))} className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="-">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold tabular-nums">{groupCount}</span>
                      <button type="button" onClick={() => setGroupCount(n => Math.min(10, n + 1))} className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="+">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <BillAssignmentMatrix
                    lines={lines}
                    groupCount={groupCount}
                    assignments={assignments}
                    onToggle={toggleAssignment}
                    unitLabel={pendingMode === "by_seat" ? "seat" : "group"}
                  />
                  <Button variant="solid" tone="primary" size="sm" className="h-9" onClick={() => handleApplySplit(pendingMode)}>
                    {t("bill.split.apply")}
                  </Button>
                </div>
              )}
            </div>

            {/* Payment groups */}
            <div className="space-y-2">
              {groups.map(group => (
                <div key={group.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{groupLabel(check.bill?.mode ?? "none", group, t)}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{formatMoney(group.amount, lang)}</p>
                  </div>
                  {group.settled ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill variant={group.payment_status === "credit" ? "pending" : "approved"} label={t(`bill.status.${group.payment_status}`)} />
                      <StatusPill variant={group.sync_status === "queued" ? "pending" : "default"} label={t(`bill.status.${group.sync_status}`)} />
                      <Button variant="icon" size="icon" className="h-9 w-9" onClick={() => toast.info(t("bill.print_toast"))} aria-label={t("bill.print")}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="solid" tone="primary" size="sm" className="h-10 shrink-0"
                      disabled={!can("fnb.settle") || !shiftOpen || group.amount <= 0}
                      onClick={() => setTenderTarget(group)}
                    >
                      {t("bill.settle")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <TenderModal
        open={!!tenderTarget}
        onOpenChange={(o) => !o && setTenderTarget(null)}
        grandTotal={tenderTarget?.amount ?? 0}
        tax={totals.tax}
        onSettle={handleSettleConfirm}
      />
    </div>
  );
}
