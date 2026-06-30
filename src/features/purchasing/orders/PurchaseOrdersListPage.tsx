import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus, Download, Search, FileText, Printer, MoreVertical,
  Truck, AlertCircle, Loader2, Package,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { EntityCell }    from "@/components/patterns/DataTable";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { DatePicker }    from "@/components/patterns/DatePicker";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { ModalShell }  from "@/components/patterns/ModalShell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import {
  usePurchasingData,
  type PurchaseOrder,
  type InventoryItem,
} from "../data/usePurchasingData";
import { poStatusPillVariant } from "../data/statusHelpers";

// ── Helpers ───────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function newPoLine() {
  return {
    _key: `${Date.now()}-${Math.random()}`,
    item_id: "", uom_id: "", qty: "1", price: "0",
  };
}

// ── Skeleton ──────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <Skeleton className="h-3.5 w-20 shrink-0" />
          <Skeleton className="h-3.5 w-16 shrink-0" />
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-24 shrink-0 ms-auto" />
          <Skeleton className="h-5 w-24 rounded-full shrink-0" />
          <Skeleton className="h-7 w-7 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── Receipt progress bar ──────────────────────────────────────────

function ReceiptProgress({
  ordered, received, lang,
}: {
  ordered: number; received: number; lang: "ar" | "en";
}) {
  const pct = ordered > 0 ? Math.min(received / ordered, 1) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 1 ? "bg-success" : pct > 0 ? "bg-brand" : "bg-muted-foreground/30",
          )}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {received}/{ordered}
      </span>
    </div>
  );
}

// ── Detail Sheet ──────────────────────────────────────────────────

function PoDetailSheet({
  po,
  open,
  onClose,
  data,
  lang,
  t,
}: {
  po: PurchaseOrder | null;
  open: boolean;
  onClose: () => void;
  data: ReturnType<typeof usePurchasingData>["data"];
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"purchasing">>["t"];
}) {
  if (!po || !data) return null;

  const supplier    = data.suppliers.find(s => s.id === po.supplier_id);
  const warehouse   = data.warehouses.find(w => w.id === po.warehouse_id);
  const sName       = supplier   ? (lang === "ar" ? supplier.name_ar   : supplier.name_en)   : po.supplier_id;
  const wName       = warehouse  ? (lang === "ar" ? warehouse.name_ar  : warehouse.name_en)  : po.warehouse_id;
  const receipts    = data.goodsReceipts.filter(gr => gr.po_id === po.id);

  const totalOrdered  = po.lines.reduce((s, l) => s + l.qty_ordered,  0);
  const totalReceived = po.lines.reduce((s, l) => s + l.qty_received, 0);

  const statusLabel = t(`orders.status_${po.status}` as Parameters<typeof t>[0], po.status);

  return (
    <DrawerShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={
        <span className="flex items-center gap-2">
          <span dir="ltr" className="font-mono">{po.number}</span>
          <StatusPill variant={poStatusPillVariant(po.status)} label={statusLabel} />
        </span>
      }
      size="lg"
    >
        {/* Header info */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("orders.col_supplier")}</p>
            <p className="font-medium">{sName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("orders.col_date")}</p>
            <p>{formatDate(po.date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("orders.warehouse_label")}</p>
            <p>{wName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("orders.col_delivery")}</p>
            <p>{formatDate(po.expected_delivery)}</p>
          </div>
        </div>

        {po.from === "lowstock" && (
          <div className="flex items-center gap-2 rounded bg-warning/10 border border-warning/20 px-3 py-2 text-sm text-warning mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t("orders.from_lowstock")}
          </div>
        )}

        <Separator className="mb-4" />

        {/* Overall receipt progress */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("orders.receipt_progress")}
          </p>
          <ReceiptProgress ordered={totalOrdered} received={totalReceived} lang={lang} />
        </div>

        {/* Lines table */}
        <div className="rounded-sm overflow-hidden mb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">{t("orders.col_item")}</TableHead>
                <TableHead className="text-xs w-20">{t("orders.col_price")}</TableHead>
                <TableHead className="text-xs w-20">{t("orders.col_ordered")}</TableHead>
                <TableHead className="text-xs w-20">{t("orders.col_received")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lines.map((line, i) => {
                const item = data.items.find(it => it.id === line.item_id);
                const uom  = data.uoms.find(u  => u.id  === line.uom_id);
                const name = item ? (lang === "ar" ? item.name_ar : item.name_en) : line.item_id;
                const uomName = uom ? (lang === "ar" ? uom.name_ar : uom.name_en) : line.uom_id;
                const remaining = line.qty_ordered - line.qty_received;
                return (
                  <TableRow key={i}>
                    <TableCell className="text-sm">
                      {name}
                      <span className="ms-1 text-xs text-muted-foreground">{uomName}</span>
                    </TableCell>
                    <TableCell className="text-sm text-start tabular-nums text-muted-foreground">
                      {formatMoney(line.price, lang)}
                    </TableCell>
                    <TableCell className="text-sm text-start tabular-nums">
                      {line.qty_ordered}
                    </TableCell>
                    <TableCell className={cn(
                      "text-sm text-start tabular-nums font-medium",
                      line.qty_received >= line.qty_ordered
                        ? "text-success"
                        : line.qty_received > 0
                          ? "text-brand"
                          : "text-muted-foreground",
                    )}>
                      {line.qty_received}
                      {remaining > 0 && (
                        <span className="ms-1 text-xs text-muted-foreground font-normal">
                          ({remaining} {t("orders.remaining")})
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-sm mb-4">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("view.subtotal")}</span>
            <span className="tabular-nums">{formatMoney(po.totals.subtotal, lang)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("view.tax")}</span>
            <span className="tabular-nums">{formatMoney(po.totals.tax, lang)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>{t("view.grand_total")}</span>
            <span className="tabular-nums">{formatMoney(po.totals.grand_total, lang)}</span>
          </div>
        </div>

        {/* Goods receipts */}
        {receipts.length > 0 && (
          <>
            <Separator className="mb-3" />
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("orders.receipt_history")}
            </p>
            <div className="space-y-2">
              {receipts.map(gr => (
                <div key={gr.id} className="flex items-center gap-2 text-sm">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                    {gr.number}
                  </span>
                  <span className="text-muted-foreground">{formatDate(gr.date)}</span>
                </div>
              ))}
            </div>
          </>
        )}
    </DrawerShell>
  );
}

// ── Create PO Dialog ──────────────────────────────────────────────

interface PoForm {
  supplier_id:       string;
  date:              string;
  expected_delivery: string;
  warehouse_id:      string;
}

interface PoLine {
  _key:    string;
  item_id: string;
  uom_id:  string;
  qty:     string;
  price:   string;
}

function CreatePoDialog({
  open,
  onClose,
  data,
  lang,
  t,
}: {
  open: boolean;
  onClose: () => void;
  data: ReturnType<typeof usePurchasingData>["data"];
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"purchasing">>["t"];
}) {
  const [form, setForm]   = useState<PoForm>({
    supplier_id: "", date: today(), expected_delivery: "", warehouse_id: "",
  });
  const [lines, setLines] = useState<PoLine[]>([newPoLine()]);
  const [saving, setSaving] = useState(false);

  const set = useCallback(
    <K extends keyof PoForm>(k: K, v: string) =>
      setForm(prev => ({ ...prev, [k]: v })),
    [],
  );

  function itemUomIds(item: InventoryItem) {
    const ids = new Set([item.base_uom_id]);
    item.units.forEach(u => ids.add(u.uom_id));
    return Array.from(ids);
  }

  const subtotal = lines.reduce((s, l) => {
    return s + (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0);
  }, 0);

  const hasLines = lines.some(l => l.item_id && (parseFloat(l.qty) || 0) > 0);
  const isValid  = form.supplier_id && form.date && form.expected_delivery && form.warehouse_id && hasLines;

  async function handleSave(send: boolean) {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onClose();
    toast.success(send ? t("orders.sent_toast") : t("orders.saved_toast"));
  }

  if (!data) return null;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("orders.form_title")}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t("common:cancel", "Cancel")}</Button>
          <Button
            variant="outline"
            disabled={!isValid || saving}
            onClick={() => handleSave(false)}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("orders.save_draft")}
          </Button>
          <Button
            disabled={!isValid || saving}
            onClick={() => handleSave(true)}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("orders.send_po")}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs text-muted-foreground">{t("orders.supplier_label")} *</Label>
              <Select value={form.supplier_id} onValueChange={v => set("supplier_id", v)}>
                <SelectTrigger className={cn(!form.supplier_id && "border-muted-foreground/40")}>
                  <SelectValue placeholder={t("orders.supplier_ph")} />
                </SelectTrigger>
                <SelectContent>
                  {data.suppliers.filter(s => s.status === "active").map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {lang === "ar" ? s.name_ar : s.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("orders.col_date")} *</Label>
              <DatePicker value={form.date} onChange={val => set("date", val)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("orders.delivery_label")} *</Label>
              <DatePicker
                value={form.expected_delivery}
                min={form.date}
                onChange={val => set("expected_delivery", val)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("orders.warehouse_label")} *</Label>
              <Select value={form.warehouse_id} onValueChange={v => set("warehouse_id", v)}>
                <SelectTrigger className={cn(!form.warehouse_id && "border-muted-foreground/40")}>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {data.warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {lang === "ar" ? w.name_ar : w.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lines */}
          <div className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">{t("orders.col_item")}</TableHead>
                  <TableHead className="text-xs w-24">{t("orders.col_uom")}</TableHead>
                  <TableHead className="text-xs w-20">{t("orders.col_qty")}</TableHead>
                  <TableHead className="text-xs w-28">{t("orders.col_price")}</TableHead>
                  <TableHead className="text-xs w-28">{t("orders.col_line_total")}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(line => {
                  const item = line.item_id ? data.items.find(i => i.id === line.item_id) : null;
                  const relevantUoms = item
                    ? data.uoms.filter(u => itemUomIds(item).includes(u.id))
                    : data.uoms;
                  const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.price) || 0);
                  return (
                    <TableRow key={line._key}>
                      <TableCell className="p-1">
                        <Select
                          value={line.item_id}
                          onValueChange={itemId => {
                            const it = data.items.find(i => i.id === itemId);
                            setLines(prev => prev.map(l => l._key !== line._key ? l : {
                              ...l,
                              item_id: itemId,
                              uom_id:  it?.base_uom_id ?? "",
                              price:   String(it?.last_purchase_price ?? 0),
                            }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={t("editor.select_item")} />
                          </SelectTrigger>
                          <SelectContent>
                            {data.items
                              .filter(i => i.status === "active" || i.id === line.item_id)
                              .map(i => (
                                <SelectItem key={i.id} value={i.id}>
                                  {lang === "ar" ? i.name_ar : i.name_en}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <Select
                          value={line.uom_id}
                          onValueChange={v => setLines(prev => prev.map(l => l._key === line._key ? { ...l, uom_id: v } : l))}
                          disabled={!line.item_id}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {relevantUoms.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {lang === "ar" ? u.name_ar : u.name_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number" min={0.001} step="any"
                          className="h-8 text-xs tabular-nums text-start"
                          value={line.qty}
                          onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, qty: e.target.value } : l))}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number" min={0} step="0.01"
                          className="h-8 text-xs tabular-nums text-start"
                          value={line.price}
                          onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, price: e.target.value } : l))}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-start tabular-nums font-medium pe-3">
                        {formatMoney(lineTotal, lang)}
                      </TableCell>
                      <TableCell className="p-1 w-8">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-danger"
                          onClick={() => setLines(prev => prev.filter(l => l._key !== line._key))}
                          disabled={lines.length === 1}
                        >
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-3 py-2 border-t border-border">
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 text-muted-foreground text-xs"
                onClick={() => setLines(prev => [...prev, newPoLine()])}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("orders.add_item")}
              </Button>
              <span className="text-sm font-semibold tabular-nums">
                {t("view.subtotal")}: {formatMoney(subtotal, lang)}
              </span>
            </div>
          </div>
        </div>
    </ModalShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function PurchaseOrdersListPage() {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const can = useCan();

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  const [search, setSearch]           = useState("");
  const [supplierFilter, setSupplier] = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [selectedPo, setSelectedPo]   = useState<PurchaseOrder | null>(null);
  const [createOpen, setCreateOpen]   = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") setCreateOpen(true);
  }, [searchParams]);

  const supplierMap = useMemo(
    () => Object.fromEntries((data?.suppliers ?? []).map(s => [s.id, s])),
    [data?.suppliers],
  );

  const allOrders = data?.purchaseOrders ?? [];

  const filtered = useMemo(() => {
    let list = allOrders;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(po => {
        const s = supplierMap[po.supplier_id];
        return (
          po.number.toLowerCase().includes(q) ||
          s?.name_ar?.toLowerCase().includes(q) ||
          s?.name_en?.toLowerCase().includes(q)
        );
      });
    }
    if (supplierFilter) list = list.filter(po => po.supplier_id === supplierFilter);
    if (statusFilter)   list = list.filter(po => po.status === statusFilter);
    return list;
  }, [allOrders, search, supplierFilter, statusFilter, supplierMap]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("orders.title")} />
        <PageSection padded={false}><ListSkeleton /></PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("orders.title")} />
        <PageSection>
          <ErrorState description={t("errors.load")} onRetry={reload} />
        </PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("orders.title")}
          subtitle={allOrders.length > 0 ? t("orders.count", { n: allOrders.length }) : undefined}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 me-1.5" />
                {t("orders.export")}
              </Button>
              {can("purchasing.order.create") && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("orders.new")}
                </Button>
              )}
            </div>
          }
        />

        {isOffline && <OfflineBanner />}

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("orders.search_placeholder")}
              className="ps-9"
            />
          </div>
          <Select
            value={supplierFilter || "__all__"}
            onValueChange={v => setSupplier(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-10 w-auto min-w-40">
              <SelectValue placeholder={t("orders.all_suppliers")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_suppliers")}</SelectItem>
              {(data?.suppliers ?? []).map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {lang === "ar" ? s.name_ar : s.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter || "__all__"}
            onValueChange={v => setStatus(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-10 w-auto min-w-44">
              <SelectValue placeholder={t("orders.all_statuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("orders.all_statuses")}</SelectItem>
              <SelectItem value="draft">{t("orders.status_draft")}</SelectItem>
              <SelectItem value="sent">{t("orders.status_sent")}</SelectItem>
              <SelectItem value="partially_received">{t("orders.status_partially_received")}</SelectItem>
              <SelectItem value="completed">{t("orders.status_completed")}</SelectItem>
              <SelectItem value="cancelled">{t("orders.status_cancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <PageSection padded={false}>
          {allOrders.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t("orders.no_orders")}
              description={t("orders.empty_sub")}
              action={can("purchasing.order.create")
                ? { label: t("orders.new"), onClick: () => setCreateOpen(true) }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("orders.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSupplier(""); setStatus(""); }}>
                {t("orders.clear_filters")}
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      {[
                        "col_number", "col_date", "col_supplier",
                        "col_delivery", "col_total", "col_status", "col_receipt",
                      ].map(k => (
                        <TableHead key={k} className={cn(
                          "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                          k === "col_total" && "text-end",
                        )}>
                          {t(`orders.${k}` as Parameters<typeof t>[0])}
                        </TableHead>
                      ))}
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(po => {
                      const s = supplierMap[po.supplier_id];
                      const sName = s ? (lang === "ar" ? s.name_ar : s.name_en) : po.supplier_id;
                      const statusLabel = t(`orders.status_${po.status}` as Parameters<typeof t>[0], po.status);
                      const totalOrdered  = po.lines.reduce((acc, l) => acc + l.qty_ordered,  0);
                      const totalReceived = po.lines.reduce((acc, l) => acc + l.qty_received, 0);
                      return (
                        <TableRow
                          key={po.id}
                          className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                          onClick={() => setSelectedPo(po)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
                                {po.number}
                              </span>
                              {po.from === "lowstock" && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 text-warning border-warning/30">
                                  {t("orders.lowstock_badge")}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                            {formatDate(po.date)}
                          </TableCell>
                          <TableCell>
                            <EntityCell
                              name={sName}
                              sub={s?.code}
                              avatarFallback={sName.slice(0, 2)}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                            {formatDate(po.expected_delivery)}
                          </TableCell>
                          <TableCell className="text-start tabular-nums font-medium">
                            {formatMoney(po.totals.grand_total, lang)}
                          </TableCell>
                          <TableCell>
                            <StatusPill
                              variant={poStatusPillVariant(po.status)}
                              label={statusLabel}
                            />
                          </TableCell>
                          <TableCell>
                            <ReceiptProgress
                              ordered={totalOrdered}
                              received={totalReceived}
                              lang={lang}
                            />
                          </TableCell>
                          <TableCell className="w-8" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedPo(po)}>
                                  <FileText className="h-4 w-4 me-2" />
                                  {t("orders.action_view")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast.info(t("orders.action_print"))}>
                                  <Printer className="h-4 w-4 me-2" />
                                  {t("orders.action_print")}
                                </DropdownMenuItem>
                                {po.status === "sent" && can("purchasing.receipt.create") && (
                                  <DropdownMenuItem onClick={() => toast.info(t("orders.action_receive"))}>
                                    <Truck className="h-4 w-4 me-2" />
                                    {t("orders.action_receive")}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map(po => {
                  const s = supplierMap[po.supplier_id];
                  const sName = s ? (lang === "ar" ? s.name_ar : s.name_en) : po.supplier_id;
                  const statusLabel = t(`orders.status_${po.status}` as Parameters<typeof t>[0], po.status);
                  const totalOrdered  = po.lines.reduce((acc, l) => acc + l.qty_ordered,  0);
                  const totalReceived = po.lines.reduce((acc, l) => acc + l.qty_received, 0);
                  return (
                    <div
                      key={po.id}
                      className="px-4 py-3 space-y-2 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedPo(po)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                          {po.number}
                        </span>
                        <StatusPill variant={poStatusPillVariant(po.status)} label={statusLabel} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{sName}</span>
                        <span className="tabular-nums font-medium text-sm">
                          {formatMoney(po.totals.grand_total, lang)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(po.expected_delivery)}</span>
                        <ReceiptProgress ordered={totalOrdered} received={totalReceived} lang={lang} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </PageSection>
      </div>

      {/* Detail sheet */}
      <PoDetailSheet
        po={selectedPo}
        open={selectedPo !== null}
        onClose={() => setSelectedPo(null)}
        data={data}
        lang={lang}
        t={t}
      />

      {/* Create dialog */}
      <CreatePoDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        data={data}
        lang={lang}
        t={t}
      />
    </>
  );
}
