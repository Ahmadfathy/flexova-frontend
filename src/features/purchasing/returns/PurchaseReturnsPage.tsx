import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus, Download, Search, FileText, Printer, MoreVertical, AlertCircle, Loader2,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EntityCell }    from "@/components/patterns/DataTable";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ModalShell } from "@/components/patterns/ModalShell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { usePurchasingData } from "../data/usePurchasingData";

// ── Return line type ──────────────────────────────────────────────

interface ReturnLine {
  _key:    string;
  item_id: string;
  uom_id:  string;
  price:   number;
  max_qty: number;
  qty:     string;
}

function lineTotal(l: ReturnLine): number {
  return (parseFloat(l.qty) || 0) * l.price;
}

// ── Skeleton ──────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export function PurchaseReturnsPage() {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const can = useCan();

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  const [search, setSearch]             = useState("");
  const [supplierFilter, setSupplier]   = useState("");
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [sourceId, setSourceId]         = useState("");
  const [reason, setReason]             = useState("");
  const [returnLines, setReturnLines]   = useState<ReturnLine[]>([]);
  const [saving, setSaving]             = useState(false);

  // ── Auto-open from ?source= param ────────────────────────────
  useEffect(() => {
    const source = searchParams.get("source");
    if (source && data) {
      setSourceId(source);
      setDialogOpen(true);
    }
  }, [searchParams, data]);

  // ── Lookup maps ───────────────────────────────────────────────
  const supplierMap = useMemo(
    () => Object.fromEntries((data?.suppliers ?? []).map(s => [s.id, s])),
    [data?.suppliers],
  );

  // ── Pre-fill lines when source invoice changes ────────────────
  useEffect(() => {
    if (!data || !sourceId) { setReturnLines([]); return; }
    const inv = data.purchaseInvoices.find(i => i.id === sourceId);
    if (!inv) { setReturnLines([]); return; }
    setReturnLines(inv.lines.map(l => ({
      _key:    `${l.item_id}-${Math.random()}`,
      item_id: l.item_id,
      uom_id:  l.uom_id,
      price:   l.purchase_price,
      max_qty: l.qty,
      qty:     "0",
    })));
  }, [sourceId, data]);

  // ── Invoices eligible for return (completed receipt) ──────────
  const returnableInvoices = useMemo(() => {
    if (!data) return [];
    return data.purchaseInvoices.filter(i => i.receipt_status === "completed");
  }, [data]);

  const sourceInvoice = useMemo(
    () => data?.purchaseInvoices.find(i => i.id === sourceId),
    [data, sourceId],
  );

  const totalValue = useMemo(
    () => returnLines.reduce((s, l) => s + lineTotal(l), 0),
    [returnLines],
  );

  const hasLines = returnLines.some(l => parseFloat(l.qty) > 0);
  const overMax  = returnLines.some(l => (parseFloat(l.qty) || 0) > l.max_qty);

  // ── Filter list ───────────────────────────────────────────────
  const allReturns = data?.purchaseReturns ?? [];
  const filtered = useMemo(() => {
    let list = allReturns;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => {
        const s = supplierMap[r.supplier_id];
        return (
          r.number.toLowerCase().includes(q) ||
          s?.name_ar?.toLowerCase().includes(q) ||
          s?.name_en?.toLowerCase().includes(q)
        );
      });
    }
    if (supplierFilter) list = list.filter(r => r.supplier_id === supplierFilter);
    return list;
  }, [allReturns, search, supplierFilter, supplierMap]);

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!sourceId || !reason.trim() || !hasLines || overMax) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setDialogOpen(false);
    setSourceId("");
    setReason("");
    setReturnLines([]);
    toast.success(t("returns.saved_toast"));
    navigate("/purchasing/returns");
  }, [sourceId, reason, hasLines, overMax, t, navigate]);

  const openNew = useCallback(() => {
    setSourceId("");
    setReason("");
    setReturnLines([]);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("returns.title")} />
        <PageSection padded={false}><ListSkeleton /></PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("returns.title")} />
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
          title={t("returns.title")}
          subtitle={allReturns.length > 0 ? t("returns.count", { n: allReturns.length }) : undefined}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 me-1.5" />
                {t("returns.export")}
              </Button>
              {can("purchasing.return.create") && (
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("returns.new")}
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
              placeholder={t("returns.search_placeholder")}
              className="ps-9"
            />
          </div>
          <Select
            value={supplierFilter || "__all__"}
            onValueChange={v => setSupplier(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-10 w-auto min-w-40">
              <SelectValue placeholder={t("returns.all_suppliers")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("returns.all_suppliers")}</SelectItem>
              {(data?.suppliers ?? []).map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {lang === "ar" ? s.name_ar : s.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <PageSection padded={false}>
          {allReturns.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("returns.no_returns")}
              description={t("returns.empty_sub")}
              action={can("purchasing.return.create")
                ? { label: t("returns.new"), onClick: openNew }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("returns.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSupplier(""); }}>
                {t("returns.clear_filters")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_number")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_date")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_source")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_supplier")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_reason")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("returns.col_value")}
                  </TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const s = supplierMap[r.supplier_id];
                  const sName = s ? (lang === "ar" ? s.name_ar : s.name_en) : r.supplier_id;
                  const reasonText = lang === "ar" ? r.reason_ar : r.reason_en;
                  const sourceInv  = data?.purchaseInvoices.find(i => i.id === r.source_invoice);
                  return (
                    <TableRow
                      key={r.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <TableCell>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
                          {r.number}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(r.date)}
                      </TableCell>
                      <TableCell>
                        {sourceInv ? (
                          <button
                            className="font-mono text-xs text-brand hover:underline"
                            dir="ltr"
                            onClick={() => navigate(`/purchasing/invoices/${r.source_invoice}`)}
                          >
                            {sourceInv.number}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                            {r.source_invoice}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <EntityCell
                          name={sName}
                          sub={s?.code}
                          avatarFallback={sName.slice(0, 2)}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {reasonText}
                      </TableCell>
                      <TableCell className="text-start tabular-nums font-semibold">
                        {formatMoney(r.totals.value, lang)}
                      </TableCell>
                      <TableCell className="w-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast.info(t("returns.action_print"))}>
                              <Printer className="h-4 w-4 me-2" />
                              {t("returns.action_print")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      </div>

      {/* Create dialog */}
      <ModalShell
        open={dialogOpen}
        onOpenChange={open => { if (!open) closeDialog(); }}
        title={t("returns.form_title")}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeDialog}>
              {t("common:cancel", "Cancel")}
            </Button>
            <Button
              disabled={!sourceId || !reason.trim() || !hasLines || overMax || saving}
              onClick={handleSave}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              {t("common:save", "Save")}
            </Button>
          </>
        }
      >
          <div className="space-y-4 py-1">
            {/* Source invoice */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("returns.source_label")} *</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger className={cn(!sourceId && "border-muted-foreground/40")}>
                  <SelectValue placeholder={t("returns.source_ph")} />
                </SelectTrigger>
                <SelectContent>
                  {returnableInvoices.map(inv => {
                    const s = supplierMap[inv.supplier_id];
                    const sName = s ? (lang === "ar" ? s.name_ar : s.name_en) : inv.supplier_id;
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        <span dir="ltr" className="font-mono text-xs">{inv.number}</span>
                        <span className="ms-2 text-muted-foreground text-xs">{sName}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("returns.reason_label")} *</Label>
              <Textarea
                rows={2}
                className="resize-none"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            {/* Lines table */}
            {returnLines.length > 0 && (
              <div className="rounded-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">{t("returns.col_item")}</TableHead>
                      <TableHead className="text-xs w-28">{t("returns.col_price")}</TableHead>
                      <TableHead className="text-xs w-20">{t("returns.col_max")}</TableHead>
                      <TableHead className="text-xs w-24">{t("returns.col_qty")}</TableHead>
                      <TableHead className="text-xs w-28">{t("returns.col_total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnLines.map(l => {
                      const item    = data?.items.find(i => i.id === l.item_id);
                      const uom     = data?.uoms.find(u => u.id === l.uom_id);
                      const name    = item ? (lang === "ar" ? item.name_ar : item.name_en) : l.item_id;
                      const uomName = uom  ? (lang === "ar" ? uom.name_ar  : uom.name_en)  : l.uom_id;
                      const qty     = parseFloat(l.qty) || 0;
                      const qtyOver = qty > l.max_qty;
                      return (
                        <TableRow key={l._key}>
                          <TableCell className="text-sm">
                            {name}
                            <span className="ms-1 text-xs text-muted-foreground">{uomName}</span>
                          </TableCell>
                          <TableCell className="text-sm text-start tabular-nums text-muted-foreground">
                            {formatMoney(l.price, lang)}
                          </TableCell>
                          <TableCell className="text-sm text-start tabular-nums text-muted-foreground">
                            {l.max_qty}
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              type="number" min={0} max={l.max_qty} step="any"
                              className={cn(
                                "h-8 text-xs tabular-nums text-start",
                                qtyOver && "border-danger",
                              )}
                              value={l.qty}
                              onChange={e => setReturnLines(prev =>
                                prev.map(x => x._key === l._key ? { ...x, qty: e.target.value } : x)
                              )}
                            />
                          </TableCell>
                          <TableCell className={cn(
                            "text-sm text-start tabular-nums font-medium",
                            qty > 0 ? "text-foreground" : "text-muted-foreground",
                          )}>
                            {formatMoney(lineTotal(l), lang)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="px-4 py-2 border-t border-border flex justify-between items-center">
                  {overMax && (
                    <span className="flex items-center gap-1 text-xs text-danger">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {t("returns.qty_over_max")}
                    </span>
                  )}
                  <div className="ms-auto text-sm font-semibold">
                    {t("returns.total_label")}: {formatMoney(totalValue, lang)}
                  </div>
                </div>
              </div>
            )}

            {sourceId && !hasLines && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" />
                {t("returns.blocker_lines")}
              </div>
            )}
          </div>
      </ModalShell>
    </>
  );
}
