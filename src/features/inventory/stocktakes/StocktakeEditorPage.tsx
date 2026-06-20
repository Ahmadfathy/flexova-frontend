import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { StatusPill }  from "@/components/patterns/StatusPill";
import { Skeleton }    from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  ArrowLeft, ArrowRight, Loader2, Snowflake, Activity, ScanLine, CheckCircle2,
} from "lucide-react";

import { formatMoney, formatNumber } from "@/lib/format";
import { cn }     from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useItems } from "../items/useItems";

/* ─── Skeleton ───────────────────────────────────────────────── */

function EditorSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[160, 80, 80, 80, 72].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-8 w-24 rounded" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

const STATUS_VARIANT: Record<string, "pending" | "approved" | "inactive"> = {
  draft:    "pending",
  counting: "pending",
  approved: "approved",
};

/* ─── Main page ──────────────────────────────────────────────── */

export function StocktakeEditorPage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();

  const { data, loading, error, reload } = useItems();

  const scanRef = useRef<HTMLInputElement>(null);

  /* Location state from NewStocktakeDialog (draft) */
  const draft = (location.state as {
    draftWarehouse?: string;
    draftDate?:      string;
    draftMode?:      "freeze" | "live";
  } | null);

  /* Resolve stocktake from fixture or draft */
  const stocktake = useMemo(() => {
    if (!data) return null;
    const fromFixture = (data.stocktakes as Array<{
      id: string; number: string; warehouse_id: string;
      date: string; mode: "freeze" | "live"; status: string;
      items_count: number; net_diff_qty: number; net_diff_value: number;
      lines: Array<{ item_id: string; book_qty: number; actual_qty: number; diff: number }>;
    }>).find(s => s.id === id);

    if (fromFixture) return fromFixture;

    /* Draft: build from location.state + items */
    if (draft?.draftWarehouse) {
      const whId    = draft.draftWarehouse;
      const whItems = data.items
        .filter(it => it.item_type !== "service")
        .filter(it => it.balances.some(b => b.warehouse_id === whId));
      return {
        id:           "new",
        number:       "ST-DRAFT",
        warehouse_id: whId,
        date:         draft.draftDate ?? new Date().toISOString().split("T")[0],
        mode:         draft.draftMode ?? "live",
        status:       "counting",
        items_count:  whItems.length,
        net_diff_qty: 0,
        net_diff_value: 0,
        lines: whItems.map(it => ({
          item_id:    it.id,
          book_qty:   it.balances.find(b => b.warehouse_id === whId)?.qty ?? 0,
          actual_qty: 0,
          diff:       0,
        })),
      };
    }

    return null;
  }, [data, id, draft]);

  /* Warehouse + item maps */
  const warehouseMap = useMemo(
    () => Object.fromEntries((data?.warehouses ?? []).map(w => [w.id, w])),
    [data]
  );
  const itemMap = useMemo(
    () => Object.fromEntries((data?.items ?? []).map(it => [it.id, it])),
    [data]
  );

  /* Local counts: item_id → actual_qty (number) */
  const [counts,  setCounts]  = useState<Record<string, number>>({});
  const [status,  setStatus]  = useState<string>("counting");
  const [confirm, setConfirm] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [scanVal, setScanVal] = useState("");

  /* Initialise counts from stocktake lines */
  useEffect(() => {
    if (stocktake) {
      const init: Record<string, number> = {};
      stocktake.lines.forEach(l => { init[l.item_id] = l.actual_qty; });
      setCounts(init);
      setStatus(stocktake.status);
    }
  }, [stocktake]);

  /* Derived summary */
  const summary = useMemo(() => {
    if (!stocktake) return { counted: 0, total: 0, netDiffQty: 0, netDiffValue: 0 };
    let netDiffQty   = 0;
    let netDiffValue = 0;
    let counted      = 0;
    stocktake.lines.forEach(l => {
      const actual  = counts[l.item_id] ?? l.actual_qty;
      const diff    = actual - l.book_qty;
      const item    = itemMap[l.item_id];
      const cost    = item?.avg_cost ?? 0;
      netDiffQty   += diff;
      netDiffValue += diff * cost;
      if (counts[l.item_id] !== undefined) counted++;
    });
    return { counted, total: stocktake.lines.length, netDiffQty, netDiffValue };
  }, [stocktake, counts, itemMap]);

  /* Barcode scan: match item by barcode and focus its row */
  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const val = scanVal.trim();
    if (!val) return;
    const item = data?.items.find(it => it.barcodes?.includes(val));
    if (item) {
      document.getElementById(`count-${item.id}`)?.focus();
    }
    setScanVal("");
  }

  async function handleSaveDraft() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    toast.success(lang === "ar" ? "تم حفظ المسودة" : "Draft saved");
  }

  async function handleApprove() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setConfirm(false);
    setStatus("approved");
    toast.success(
      lang === "ar"
        ? "تم اعتماد الجرد وإنشاء التسوية"
        : "Stocktake approved — adjustment created"
    );
    setTimeout(() => navigate("/inventory/stocktakes"), 1200);
  }

  /* ── Render states ───────────────────────────────────────── */

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <PageSection padded={false}><EditorSkeleton /></PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState description={t("errors.load")} onRetry={reload} />
      </div>
    );
  }

  if (!stocktake) {
    return (
      <div className="p-6">
        <ErrorState
          description={lang === "ar" ? "الجرد غير موجود" : "Stocktake not found"}
          onRetry={() => navigate("/inventory/stocktakes")}
        />
      </div>
    );
  }

  const warehouse = warehouseMap[stocktake.warehouse_id];
  const whName    = warehouse
    ? (lang === "ar" ? warehouse.name_ar : warehouse.name_en)
    : stocktake.warehouse_id;
  const isApproved = status === "approved";
  const BackIcon   = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PageHeader
        title={stocktake.number}
        subtitle={whName}
        crumbLabel={stocktake.number}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/inventory/stocktakes")}
            >
              <BackIcon className="h-4 w-4 me-1" />
              {t("actions.back")}
            </Button>

            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
              {stocktake.mode === "freeze"
                ? t("stocktakes.mode_freeze")
                : t("stocktakes.mode_live")}
            </Badge>

            <StatusPill
              variant={STATUS_VARIANT[status] ?? "pending"}
              label={t(`stock_status.${status}`)}
            />

            {!isApproved && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
                  {t("stocktakes.save_draft")}
                </Button>
                {can("inventory.stocktake.approve") && (
                  <Button
                    size="sm"
                    onClick={() => setConfirm(true)}
                    disabled={saving}
                  >
                    <CheckCircle2 className="h-4 w-4 me-1.5" />
                    {t("stocktakes.approve")}
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Mode banner */}
      {stocktake.mode === "freeze" && !isApproved && (
        <div className="mx-0 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <Snowflake className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <span className="text-destructive">{t("stocktakes.freeze_banner")}</span>
        </div>
      )}
      {stocktake.mode === "live" && !isApproved && (
        <div className="mx-0 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          <Activity className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <span className="text-warning">{t("stocktakes.live_note")}</span>
        </div>
      )}

      {/* Barcode scan bar */}
      {!isApproved && (
        <PageSection padded>
          <div className="flex items-center gap-3">
            <ScanLine className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              ref={scanRef}
              value={scanVal}
              onChange={e => setScanVal(e.target.value)}
              onKeyDown={handleScan}
              placeholder={t("stocktakes.scan_ph")}
              className="max-w-sm"
              autoComplete="off"
            />
          </div>
        </PageSection>
      )}

      {/* Count table */}
      <PageSection padded={false}>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent border-b border-border">
              {[
                { key: "name",    label: t("columns.name"),           cls: "font-semibold" },
                { key: "code",    label: t("columns.code"),           cls: "font-semibold hidden sm:table-cell" },
                { key: "book",    label: t("stocktakes.book"),        cls: "font-semibold text-end" },
                { key: "actual",  label: t("stocktakes.actual"),      cls: "font-semibold text-end" },
                { key: "diff",    label: t("stocktakes.diff"),        cls: "font-semibold text-end" },
              ].map(col => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "h-10 py-2 px-3 text-xs text-muted-foreground whitespace-nowrap",
                    col.cls
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {stocktake.lines.map(line => {
              const item   = itemMap[line.item_id];
              const actual = counts[line.item_id] ?? line.actual_qty;
              const diff   = actual - line.book_qty;
              const name   = item
                ? (lang === "ar" ? item.name_ar : item.name_en)
                : line.item_id;

              return (
                <TableRow
                  key={line.item_id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  {/* Name */}
                  <TableCell className="px-3 py-2">
                    <span className="text-sm font-medium">{name}</span>
                  </TableCell>

                  {/* Code */}
                  <TableCell className="px-3 py-2 hidden sm:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">
                      {item?.code ?? "—"}
                    </span>
                  </TableCell>

                  {/* Book qty */}
                  <TableCell className="px-3 py-2 text-end tabular-nums text-sm text-muted-foreground">
                    {formatNumber(line.book_qty)}
                  </TableCell>

                  {/* Actual qty — editable */}
                  <TableCell className="px-3 py-2 text-end">
                    {isApproved ? (
                      <span className="tabular-nums text-sm">{formatNumber(actual)}</span>
                    ) : (
                      <Input
                        id={`count-${line.item_id}`}
                        type="number"
                        min={0}
                        step={1}
                        value={actual}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v >= 0) {
                            setCounts(c => ({ ...c, [line.item_id]: v }));
                          }
                        }}
                        className="w-24 ms-auto text-end tabular-nums h-8 text-sm"
                      />
                    )}
                  </TableCell>

                  {/* Diff */}
                  <TableCell className="px-3 py-2 text-end tabular-nums text-sm">
                    <span className={cn(
                      "font-medium",
                      diff > 0
                        ? "text-emerald-600"
                        : diff < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    )}>
                      {diff > 0 ? "+" : ""}{formatNumber(diff)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </PageSection>

      {/* Sticky summary bar */}
      <div className="fixed bottom-0 inset-x-0 z-10 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-6 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {t("stocktakes.items_counted", {
              counted: summary.counted,
              total:   summary.total,
            })}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t("stocktakes.net_diff_qty")}:</span>
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              summary.netDiffQty > 0
                ? "text-emerald-600"
                : summary.netDiffQty < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}>
              {summary.netDiffQty > 0 ? "+" : ""}{formatNumber(summary.netDiffQty)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t("stocktakes.net_diff_value")}:</span>
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              summary.netDiffValue > 0
                ? "text-emerald-600"
                : summary.netDiffValue < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}>
              {summary.netDiffValue > 0 ? "+" : ""}{formatMoney(summary.netDiffValue, lang)}
            </span>
          </div>
        </div>
      </div>

      {/* Approve confirm */}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("stocktakes.approve")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("stocktakes.approve_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("stocktakes.approve")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
