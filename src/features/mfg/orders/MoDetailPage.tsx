import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Info, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusPill } from "@/components/patterns/StatusPill";
import { ProgressRow } from "@/components/patterns/ProgressRow";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useMfgOrders } from "@/stores/mfgOrders";
import { getItems, getWarehouses } from "@/lib/mock/mfg";
import type { BomComponent } from "@/types/mfg";
import { moStatusPillVariant, isMoCancellable } from "./moStatus";
import { resolveLineAvailability } from "./shortage";
import { useMoDetail } from "./useMoDetail";
import { ActionButton as HeaderActionButton } from "./ActionButton";
import { StagesTab } from "./StagesTab";
import { CostTab } from "./CostTab";
import { FinishedReceiptDialog } from "./FinishedReceiptDialog";

type TabKey = "overview" | "bom" | "stages" | "cost";

interface EditableLine extends BomComponent {
  _key: string;
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}

export function MoDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const { order: mo, notFound, loading, error, isOffline, reload } = useMoDetail(id);
  const cancelOrder = useMfgOrders((s) => s.cancelOrder);
  const approveOrder = useMfgOrders((s) => s.approveOrder);
  const startOrder = useMfgOrders((s) => s.startOrder);
  const setNotes = useMfgOrders((s) => s.setNotes);
  const updateOrderBom = useMfgOrders((s) => s.updateOrderBom);

  const items = useMemo(() => getItems(), []);
  const warehouses = useMemo(() => getWarehouses(), []);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [notesDraft, setNotesDraft] = useState("");
  const [notesInit, setNotesInit] = useState(false);
  const [bomLines, setBomLines] = useState<EditableLine[]>([]);
  const [bomInit, setBomInit] = useState(false);
  const [newLineItem, setNewLineItem] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  useEffect(() => {
    if (mo && !notesInit) { setNotesDraft(mo.notes ?? ""); setNotesInit(true); }
    if (mo && !bomInit) { setBomLines(mo.order_bom.map((l) => ({ ...l, _key: crypto.randomUUID() }))); setBomInit(true); }
  }, [mo, notesInit, bomInit]);

  if (loading) return <div className="p-4"><DetailSkeleton /></div>;
  if (error) {
    return (
      <div className="p-4">
        <ErrorState title={t("mo.error_title")} description={t("mo.error_body")} onRetry={reload} />
      </div>
    );
  }
  if (notFound || !mo) {
    return (
      <div className="p-4">
        <EmptyState
          title={t("mo.not_found_title")}
          description={t("mo.not_found_body")}
          action={{ label: t("mo.back_to_list"), onClick: () => navigate("/mfg/orders") }}
        />
      </div>
    );
  }

  if (!can("mfg.order.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("mo.permission_required")}</p>
      </div>
    );
  }

  function itemName(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : itemId;
  }
  function warehouseName(whId: string) {
    const wh = warehouses.find((w) => w.id === whId);
    return wh ? (lang === "ar" ? wh.name_ar : wh.name_en) : whId;
  }
  function isManufactured(itemId: string) {
    return items.find((i) => i.id === itemId)?.item_type === "manufactured";
  }

  const availability = resolveLineAvailability(mo, items);
  const shortageLines = availability.filter((l) => l.short);
  const isDraft = mo.status === "draft";

  function handleApprove() {
    approveOrder(mo!.id);
    toast.success(t("mo.approve_success"));
    setApproveOpen(false);
  }
  function handleStart() {
    startOrder(mo!.id);
    toast.success(t("mo.start_success"));
  }
  function handleCancel() {
    cancelOrder(mo!.id);
    toast.success(t("orders.cancel_success"));
    setCancelOpen(false);
  }
  function handleSaveNotes() {
    setNotes(mo!.id, notesDraft.trim());
    toast.success(t("mo.notes_saved_toast"));
  }
  function patchBomLine(key: string, patch: Partial<EditableLine>) {
    setBomLines((ls) => ls.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  }
  function removeBomLine(key: string) {
    setBomLines((ls) => ls.filter((l) => l._key !== key));
  }
  function addBomLine() {
    if (!newLineItem) return;
    const item = items.find((i) => i.id === newLineItem);
    if (!item) return;
    setBomLines((ls) => [...ls, { _key: crypto.randomUUID(), item_id: item.id, qty: 0, uom: item.base_uom, expected_scrap_pct: 0 }]);
    setNewLineItem("");
  }
  function handleSaveBom() {
    updateOrderBom(mo!.id, bomLines.map(({ _key, ...line }) => line));
    toast.success(t("mo.bom_saved_toast"));
  }

  const canCancelPermission = can("mfg.order.create");
  const canApprovePermission = can("mfg.order.approve");
  const canExecutePermission = can("mfg.order.execute");
  const canReceivePermission = can("mfg.finished.receive");

  return (
    <div className="space-y-4">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-6 -mt-6 px-6 pt-4 pb-4 bg-background border-b border-border space-y-3">
        {isOffline && <OfflineBanner message={t("mo.offline_note")} />}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <span className="font-mono text-sm font-semibold text-foreground" dir="ltr">{mo.number}</span>
            <StatusPill variant={moStatusPillVariant(mo.status)} label={t(`orders.status_${mo.status}`)} />
            <span className="text-sm text-muted-foreground truncate">{itemName(mo.output_item_id)}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {mo.qty_received}/{mo.qty_ordered}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {mo.status === "draft" && (
              <HeaderActionButton
                label={t("mo.approve")}
                onClick={() => setApproveOpen(true)}
                disabled={!canApprovePermission}
                tooltip={t("mo.no_permission_tooltip")}
              />
            )}
            {mo.status === "approved" && (
              <HeaderActionButton
                label={t("mo.start")}
                onClick={handleStart}
                disabled={!canExecutePermission}
                tooltip={t("mo.no_permission_tooltip")}
              />
            )}
            {(mo.status === "in_progress" || mo.status === "partial") && (
              <HeaderActionButton
                label={t("mo.receive")}
                onClick={() => setReceiveOpen(true)}
                disabled={!canReceivePermission}
                tooltip={t("mo.no_permission_tooltip")}
              />
            )}
            <HeaderActionButton
              label={t("mo.cancel")}
              onClick={() => setCancelOpen(true)}
              disabled={!canCancelPermission || !isMoCancellable(mo.status)}
              tooltip={!canCancelPermission ? t("mo.no_permission_tooltip") : undefined}
              danger
            />
          </div>
        </div>

        {/* Running cost breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t("mo.materials")}</p>
            <p className="text-sm font-medium tabular-nums">{formatMoney(mo.cost_summary.materials, lang)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("mo.labor")}</p>
            <p className="text-sm font-medium tabular-nums">{formatMoney(mo.cost_summary.labor, lang)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("mo.overhead")}</p>
            <p className="text-sm font-medium tabular-nums">{formatMoney(mo.cost_summary.overhead, lang)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("mo.running_cost")}</p>
            <p className="text-sm font-semibold tabular-nums">{formatMoney(mo.cost_summary.total, lang)}</p>
          </div>
        </div>

        <ProgressRow
          label={t("mo.progress_label")}
          value={mo.qty_ordered > 0 ? (mo.qty_received / mo.qty_ordered) * 100 : 0}
          displayValue={`${mo.qty_received}/${mo.qty_ordered}`}
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="h-9 p-1 bg-muted">
          <TabsTrigger value="overview" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("mo.tab_overview")}
          </TabsTrigger>
          <TabsTrigger value="bom" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("mo.tab_bom")}
          </TabsTrigger>
          <TabsTrigger value="stages" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("mo.tab_stages")}
          </TabsTrigger>
          <TabsTrigger value="cost" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("mo.tab_cost")}
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-4">
          {shortageLines.length > 0 && (
            <div className="space-y-2">
              {shortageLines.map((l) => (
                <div key={l.item_id} className="flex items-center gap-2 rounded border border-warning/40 bg-warning-tint px-4 py-3 text-sm text-warning-text">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    {t("mo.shortage_line", { item: itemName(l.item_id), required: l.required, available: l.available })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("mo.product_label")}</p>
              <p className="text-sm font-medium">{itemName(mo.output_item_id)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("mo.qty_label")}</p>
              <p className="text-sm font-medium tabular-nums">{mo.qty_ordered}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("mo.customer_label")}</p>
              <p className="text-sm font-medium font-mono" dir="ltr">{mo.customer_order_id ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("new.issue_mode")}</p>
              <p className="text-sm font-medium">{mo.issue_mode === "backflush" ? t("new.backflush") : t("new.manual")}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">{t("mo.warehouses_label")}</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("new.wh_raw")}</p>
                <p className="text-sm">{warehouseName(mo.wh_raw)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("new.wh_wip")}</p>
                <p className="text-sm">{warehouseName(mo.wh_wip)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("new.wh_finished")}</p>
                <p className="text-sm">{warehouseName(mo.wh_finished)}</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-1.5">
            <p className="text-xs text-muted-foreground">{t("mo.notes_label")}</p>
            <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={3} placeholder={t("mo.notes_placeholder")} />
            {notesDraft !== (mo.notes ?? "") && (
              <Button size="sm" onClick={handleSaveNotes}>{t("mo.notes_save")}</Button>
            )}
          </div>
        </TabsContent>

        {/* BOM */}
        <TabsContent value="bom" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-3">
          {!isDraft && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" /> {t("mo.bom_readonly_note")}
            </p>
          )}

          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground">{t("mo.bom_col_item")}</th>
                  <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground w-24">{t("mo.bom_col_qty")}</th>
                  <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground w-20">{t("mo.bom_col_uom")}</th>
                  <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground w-28">{t("mo.bom_col_scrap")}</th>
                  <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground w-32">{t("mo.bom_col_available")}</th>
                  {isDraft && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {(isDraft ? bomLines : mo.order_bom.map((l) => ({ ...l, _key: l.item_id }))).map((l) => {
                  const avail = availability.find((a) => a.item_id === l.item_id);
                  return (
                    <tr key={l._key} className="border-t border-border">
                      <td className="px-3 py-2">{itemName(l.item_id)}</td>
                      <td className="px-3 py-2">
                        {isDraft ? (
                          <Input
                            type="number" min={0} step={0.01} value={l.qty}
                            onChange={(e) => patchBomLine(l._key, { qty: parseFloat(e.target.value) || 0 })}
                            className="h-8"
                          />
                        ) : (
                          <span className="tabular-nums">{l.qty}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{l.uom}</td>
                      <td className="px-3 py-2">
                        {isDraft ? (
                          <Input
                            type="number" min={0} max={100} step={1} value={l.expected_scrap_pct}
                            onChange={(e) => patchBomLine(l._key, { expected_scrap_pct: parseFloat(e.target.value) || 0 })}
                            className="h-8"
                          />
                        ) : (
                          <span className="tabular-nums">{l.expected_scrap_pct}%</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {avail && (
                          avail.short ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 text-warning-text font-medium tabular-nums cursor-help">
                                    <AlertTriangle className="h-3.5 w-3.5" /> {avail.available}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{`${t("mo.qty_label")}: ${avail.required}`}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="tabular-nums text-muted-foreground">{avail.available}</span>
                          )
                        )}
                      </td>
                      {isDraft && (
                        <td className="px-1 py-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeBomLine(l._key)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isDraft && (
            <>
              <div className="flex items-center gap-2">
                <Select value={newLineItem} onValueChange={setNewLineItem}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={t("mo.bom_item_placeholder")} /></SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {itemName(i.id)}{isManufactured(i.id) ? ` (${t("new.semi_finished_tag")})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={addBomLine} disabled={!newLineItem}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("mo.bom_add_line")}
                </Button>
              </div>
              <Button size="sm" onClick={handleSaveBom}>{t("mo.bom_save")}</Button>
            </>
          )}
        </TabsContent>

        {/* Stages */}
        <TabsContent value="stages" className="mt-3">
          <StagesTab mo={mo} />
        </TabsContent>

        {/* Cost */}
        <TabsContent value="cost" className="mt-3">
          <CostTab mo={mo} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={t("mo.approve_confirm_title")}
        description={t("mo.approve_confirm_body")}
        confirmTone="primary"
        confirmLabel={t("mo.approve")}
        onConfirm={handleApprove}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("orders.cancel_title")}
        description={t("orders.cancel_body")}
        confirmTone="danger"
        confirmLabel={t("orders.action_cancel")}
        onConfirm={handleCancel}
      />

      {receiveOpen && (
        <FinishedReceiptDialog open={receiveOpen} onOpenChange={setReceiveOpen} mo={mo} />
      )}
    </div>
  );
}
