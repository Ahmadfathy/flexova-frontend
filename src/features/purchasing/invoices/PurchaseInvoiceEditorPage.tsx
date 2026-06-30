import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus, Trash2, AlertCircle, CheckCircle2, Loader2, ChevronDown,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { DatePicker }    from "@/components/patterns/DatePicker";

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
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

import { formatMoney } from "@/lib/format";
import { cn }          from "@/lib/utils";
import { useCan }      from "@/lib/permissions";
import {
  usePurchasingData,
  type InventoryItem,
  type TaxType,
  type PurchasingData,
} from "../data/usePurchasingData";

// ── Local types ──────────────────────────────────────────────────

interface PILine {
  _key: string;
  item_id: string;
  qty: string;
  uom_id: string;
  purchase_price: string;
  line_discount: string;
  tax_type_id: string;
}

interface PIHeader {
  supplier_id: string;
  supplier_invoice_no: string;
  date: string;
  warehouse_id: string;
  payment_method: string;
  inbound_eta_uuid: string;
  notes: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function newLine(): PILine {
  return {
    _key: `${Date.now()}-${Math.random()}`,
    item_id: "", qty: "1", uom_id: "",
    purchase_price: "0", line_discount: "0", tax_type_id: "",
  };
}

function lineNet(l: PILine): number {
  const qty   = parseFloat(l.qty) || 0;
  const price = parseFloat(l.purchase_price) || 0;
  const disc  = parseFloat(l.line_discount) || 0;
  return qty * price - disc;
}

function lineTax(l: PILine, taxTypes: TaxType[]): number {
  const net = lineNet(l);
  const tt  = taxTypes.find(t => t.id === l.tax_type_id);
  return tt ? net * tt.rate / 100 : 0;
}

function lineDistribution(l: PILine, subtotal: number, addCosts: number): number {
  if (!subtotal || !addCosts) return 0;
  return lineNet(l) / subtotal * addCosts;
}

function lineEffectivePrice(l: PILine, subtotal: number, addCosts: number): number {
  const qty = parseFloat(l.qty) || 1;
  return (lineNet(l) + lineDistribution(l, subtotal, addCosts)) / qty;
}

// ── Skeletons ────────────────────────────────────────────────────

function EditorSkeleton() {
  return (
    <div className="space-y-4 pb-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── UOM options for a given item ─────────────────────────────────

function itemUomIds(item: InventoryItem): string[] {
  const ids = new Set<string>([item.base_uom_id]);
  item.units.forEach(u => ids.add(u.uom_id));
  return Array.from(ids);
}

// ── Line row component ───────────────────────────────────────────

interface LineRowProps {
  line:     PILine;
  data:     PurchasingData;
  lang:     string;
  t:        ReturnType<typeof useTranslation>["t"];
  subtotal: number;
  addCosts: number;
  onUpdate: (key: string, field: keyof PILine, value: string) => void;
  onSelectItem: (key: string, itemId: string) => void;
  onRemove: (key: string) => void;
}

function LineRow({
  line, data, lang, t,
  subtotal, addCosts,
  onUpdate, onSelectItem, onRemove,
}: LineRowProps) {
  const item = line.item_id ? data.items.find(i => i.id === line.item_id) : null;
  const net  = lineNet(line);
  const uomIds = item ? itemUomIds(item) : [];
  const relevantUoms = data.uoms.filter(u => !item || uomIds.includes(u.id));
  const dist = lineDistribution(line, subtotal, addCosts);

  return (
    <TableRow>
      {/* Item */}
      <TableCell className="min-w-[160px] p-1">
        <Select value={line.item_id} onValueChange={v => onSelectItem(line._key, v)}>
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

      {/* Qty */}
      <TableCell className="w-20 p-1">
        <Input
          type="number" min={0.001} step="any"
          className="h-8 text-xs tabular-nums text-start"
          value={line.qty}
          onChange={e => onUpdate(line._key, "qty", e.target.value)}
        />
      </TableCell>

      {/* UOM */}
      <TableCell className="w-24 p-1">
        <Select
          value={line.uom_id}
          onValueChange={v => onUpdate(line._key, "uom_id", v)}
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

      {/* Purchase price */}
      <TableCell className="w-28 p-1">
        <Input
          type="number" min={0} step="0.01"
          className="h-8 text-xs tabular-nums text-start"
          value={line.purchase_price}
          onChange={e => onUpdate(line._key, "purchase_price", e.target.value)}
        />
      </TableCell>

      {/* Line discount */}
      <TableCell className="w-24 p-1">
        <Input
          type="number" min={0} step="0.01"
          className="h-8 text-xs tabular-nums text-start"
          value={line.line_discount}
          onChange={e => onUpdate(line._key, "line_discount", e.target.value)}
        />
      </TableCell>

      {/* Tax type */}
      <TableCell className="w-32 p-1">
        <Select
          value={line.tax_type_id}
          onValueChange={v => onUpdate(line._key, "tax_type_id", v)}
        >
          <SelectTrigger className={cn(
            "h-8 text-xs",
            !line.tax_type_id && line.item_id && "border-warning/70",
          )}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {data.taxTypes.map(tt => (
              <SelectItem key={tt.id} value={tt.id}>
                {lang === "ar" ? tt.name_ar : tt.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Line net */}
      <TableCell className="w-28 text-start tabular-nums text-sm font-medium p-1">
        <div>{formatMoney(net, lang)}</div>
        {dist > 0 && (
          <div className="text-[10px] text-muted-foreground">
            +{formatMoney(dist, lang)}
          </div>
        )}
      </TableCell>

      {/* Remove */}
      <TableCell className="w-8 p-1">
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-danger"
          onClick={() => onRemove(line._key)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ── Main component ───────────────────────────────────────────────

export function PurchaseInvoiceEditorPage() {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const can = useCan();

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  // ── Form state ─────────────────────────────────────────────────
  const [header, setHeader] = useState<PIHeader>({
    supplier_id: "", supplier_invoice_no: "",
    date: today(), warehouse_id: "", payment_method: "",
    inbound_eta_uuid: "", notes: "",
  });
  const [lines, setLines] = useState<PILine[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState("0");
  const [approving, setApproving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Pre-fill from low-stock deep-link ─────────────────────────
  useEffect(() => {
    if (!data) return;
    const ids = searchParams.get("ids");
    const from = searchParams.get("from");
    if (from === "lowstock" && ids) {
      const itemIds = ids.split(",").filter(Boolean);
      const prefilled = itemIds.flatMap(id => {
        const item = data.items.find(i => i.id === id);
        if (!item) return [];
        const line: PILine = {
          _key: `${Date.now()}-${Math.random()}`,
          item_id: item.id,
          qty: "1",
          uom_id: item.base_uom_id,
          purchase_price: String(item.last_purchase_price ?? 0),
          line_discount: "0",
          tax_type_id: item.tax_type_id,
        };
        return [line];
      });
      if (prefilled.length) setLines(prefilled);
    }
  }, [data, searchParams]);

  // ── Derived ────────────────────────────────────────────────────
  const addCostsNum = parseFloat(additionalCosts) || 0;

  const totals = useMemo(() => {
    const validLines = lines.filter(l => l.item_id);
    const subtotal = validLines.reduce((s, l) => s + lineNet(l), 0);
    const totalDisc = validLines.reduce(
      (s, l) => s + (parseFloat(l.line_discount) || 0), 0,
    );
    const totalTax = validLines.reduce(
      (s, l) => s + lineTax(l, data?.taxTypes ?? []), 0,
    );
    return { subtotal, totalDisc, totalTax, grandTotal: subtotal + totalTax + addCostsNum };
  }, [lines, data, addCostsNum]);

  // ── ETA options filtered by supplier ──────────────────────────
  const etaOptions = useMemo(() => {
    if (!data) return [];
    return data.inboundEta.filter(
      e => e.status === "pending" && e.matched_pi === null
        && e.supplier_id === header.supplier_id,
    );
  }, [data, header.supplier_id]);

  // ── Readiness blockers ─────────────────────────────────────────
  const blockers = useMemo(() => {
    const b: string[] = [];
    if (!header.supplier_id) b.push(t("editor.blocker_supplier"));
    if (!header.warehouse_id) b.push(t("editor.blocker_warehouse"));
    if (!header.date) b.push(t("editor.blocker_date"));
    if (!lines.some(l => l.item_id)) b.push(t("editor.blocker_lines"));
    return b;
  }, [header, lines, t]);

  const isReady = blockers.length === 0;

  // ── Line handlers ──────────────────────────────────────────────
  const addLine = useCallback(() => setLines(prev => [...prev, newLine()]), []);

  const removeLine = useCallback((key: string) => {
    setLines(prev => prev.filter(l => l._key !== key));
  }, []);

  const updateLine = useCallback(
    (key: string, field: keyof PILine, value: string) => {
      setLines(prev => prev.map(l => l._key === key ? { ...l, [field]: value } : l));
    },
    [],
  );

  const selectItem = useCallback((key: string, itemId: string) => {
    if (!data) return;
    const item = data.items.find(i => i.id === itemId);
    if (!item) return;
    setLines(prev => prev.map(l => l._key !== key ? l : {
      ...l,
      item_id: item.id,
      uom_id: item.base_uom_id,
      purchase_price: String(item.last_purchase_price ?? 0),
      tax_type_id: item.tax_type_id,
    }));
  }, [data]);

  // Reset ETA when supplier changes
  const setSupplier = useCallback((supplierId: string) => {
    setHeader(h => ({ ...h, supplier_id: supplierId, inbound_eta_uuid: "" }));
  }, []);

  // ── Save draft ─────────────────────────────────────────────────
  const saveDraft = useCallback(() => {
    toast.success(t("editor.draft_toast"));
  }, [t]);

  // ── Approve ────────────────────────────────────────────────────
  const handleApprove = useCallback(async () => {
    setApproving(true);
    await new Promise(r => setTimeout(r, 700));
    setApproving(false);
    setConfirmOpen(false);
    toast.success(t("editor.approved_toast"));
    navigate("/purchasing/invoices");
  }, [t, navigate]);

  // ── Distribution preview ───────────────────────────────────────
  const distributionRows = useMemo(() => {
    const validLines = lines.filter(l => l.item_id);
    return validLines.map(l => {
      const item = data?.items.find(i => i.id === l.item_id);
      const name = item
        ? (lang === "ar" ? item.name_ar : item.name_en)
        : l.item_id;
      const lineValue = lineNet(l);
      const share = lineDistribution(l, totals.subtotal, addCostsNum);
      const effPrice = lineEffectivePrice(l, totals.subtotal, addCostsNum);
      return { name, lineValue, share, effPrice };
    });
  }, [lines, data, lang, totals.subtotal, addCostsNum]);

  // ── Loading / error states ─────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader title={t("editor.new_title")} />
        <PageSection padded={false}><EditorSkeleton /></PageSection>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("editor.new_title")} />
        <PageSection>
          <ErrorState title={t("errors.load")} onRetry={reload} />
        </PageSection>
      </div>
    );
  }
  if (!data) return null;

  const fromLowstock = searchParams.get("from") === "lowstock";

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("editor.new_title")}
          crumbs={[
            { label: t("invoices.title"), href: "/purchasing/invoices" },
          ]}
          alert={(isOffline || fromLowstock) ? (
            <div className="space-y-2">
              {isOffline && <OfflineBanner />}
              {fromLowstock && (
                <div className="mx-6 flex items-center gap-2 rounded bg-brand/10 border border-brand/20 px-4 py-2 text-sm text-brand">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {t("editor.from_lowstock")}
                </div>
              )}
            </div>
          ) : undefined}
        />

        {/* ── Zone 1: Header ───────────────────────────────── */}
        <PageSection padded={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">

            {/* Supplier */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("editor.supplier_label")} *
              </Label>
              <Select value={header.supplier_id} onValueChange={setSupplier}>
                <SelectTrigger className={cn(!header.supplier_id && "border-muted-foreground/40")}>
                  <SelectValue placeholder={t("editor.supplier_ph")} />
                </SelectTrigger>
                <SelectContent>
                  {data.suppliers
                    .filter(s => s.status === "active")
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {lang === "ar" ? s.name_ar : s.name_en}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("editor.date_label")} *
              </Label>
              <DatePicker
                value={header.date}
                onChange={val => setHeader(h => ({ ...h, date: val }))}
              />
            </div>

            {/* Supplier invoice no */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("editor.supplier_inv")}
              </Label>
              <Input
                dir="ltr"
                className="font-mono"
                value={header.supplier_invoice_no}
                onChange={e => setHeader(h => ({ ...h, supplier_invoice_no: e.target.value }))}
              />
            </div>

            {/* Warehouse */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("editor.warehouse_label")} *
              </Label>
              <Select
                value={header.warehouse_id}
                onValueChange={v => setHeader(h => ({ ...h, warehouse_id: v }))}
              >
                <SelectTrigger className={cn(!header.warehouse_id && "border-muted-foreground/40")}>
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

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("editor.payment_label")}
              </Label>
              <Select
                value={header.payment_method}
                onValueChange={v => setHeader(h => ({ ...h, payment_method: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {data.paymentMethods.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {lang === "ar" ? m.name_ar : m.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inbound ETA link */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("editor.eta_link_label")}
              </Label>
              <Select
                value={header.inbound_eta_uuid}
                onValueChange={v => setHeader(h => ({ ...h, inbound_eta_uuid: v }))}
                disabled={!header.supplier_id || etaOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !header.supplier_id
                        ? t("editor.supplier_ph")
                        : etaOptions.length === 0
                          ? t("editor.eta_link_none")
                          : t("editor.eta_link_ph")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {etaOptions.map(e => (
                    <SelectItem key={e.uuid} value={e.uuid}>
                      <span dir="ltr" className="font-mono text-xs">
                        {e.uuid}
                      </span>
                      <span className="ms-2 text-muted-foreground">
                        {formatMoney(e.value, lang)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes — full width */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs text-muted-foreground">
                {t("editor.notes_label")}
              </Label>
              <Textarea
                rows={2}
                className="resize-none"
                value={header.notes}
                onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))}
              />
            </div>
          </div>
        </PageSection>

        {/* ── Zone 2 + Zone 3 ─────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* Zone 2: Lines grid */}
          <div className="flex-1 min-w-0">
            <PageSection padded={false}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">{t("editor.col_item")}</TableHead>
                      <TableHead className="text-xs w-20">{t("editor.col_qty")}</TableHead>
                      <TableHead className="text-xs w-24">{t("editor.col_uom")}</TableHead>
                      <TableHead className="text-xs w-28">{t("editor.col_price")}</TableHead>
                      <TableHead className="text-xs w-24">{t("editor.col_discount")}</TableHead>
                      <TableHead className="text-xs w-32">{t("editor.col_tax")}</TableHead>
                      <TableHead className="text-xs w-28">{t("editor.col_total")}</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map(line => (
                      <LineRow
                        key={line._key}
                        line={line}
                        data={data}
                        lang={lang}
                        t={t}
                        subtotal={totals.subtotal}
                        addCosts={addCostsNum}
                        onUpdate={updateLine}
                        onSelectItem={selectItem}
                        onRemove={removeLine}
                      />
                    ))}
                    {lines.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          {t("editor.blocker_lines")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={addLine}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("editor.add_item")}
                </Button>
              </div>
            </PageSection>
          </div>

          {/* Zone 3: Totals + readiness + actions */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <PageSection>
              <div className="space-y-3 p-1">

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("editor.subtotal")}</span>
                    <span className="tabular-nums">{formatMoney(totals.subtotal, lang)}</span>
                  </div>
                  {totals.totalDisc > 0 && (
                    <div className="flex justify-between text-warning">
                      <span>{t("editor.discount")}</span>
                      <span className="tabular-nums">−{formatMoney(totals.totalDisc, lang)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("editor.tax")}</span>
                    <span className="tabular-nums">{formatMoney(totals.totalTax, lang)}</span>
                  </div>

                  {/* Additional costs */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("editor.additional_costs")}</span>
                      {addCostsNum > 0 && distributionRows.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs gap-1">
                              {t("editor.dist_preview")}
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="end">
                            <div className="p-3 border-b border-border text-xs font-medium">
                              {t("editor.distribute_hint")}
                            </div>
                            <div className="p-2">
                              <Table className="text-xs">
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-0">
                                    <TableHead className="h-auto py-1 px-0 pe-2 text-start font-normal text-muted-foreground">{t("editor.dist_col_item")}</TableHead>
                                    <TableHead className="h-auto py-1 px-0 pe-2 text-start font-normal text-muted-foreground">{t("editor.dist_col_share")}</TableHead>
                                    <TableHead className="h-auto py-1 px-0 text-start font-normal text-muted-foreground">{t("editor.dist_col_eff")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {distributionRows.map((row, i) => (
                                    <TableRow key={i} className="border-t border-border/40 hover:bg-transparent">
                                      <TableCell className="py-1 px-0 pe-2 truncate max-w-[120px]">{row.name}</TableCell>
                                      <TableCell className="py-1 px-0 pe-2 text-start tabular-nums">
                                        +{formatMoney(row.share, lang)}
                                      </TableCell>
                                      <TableCell className="py-1 px-0 text-start tabular-nums">
                                        {formatMoney(row.effPrice, lang)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <Input
                      type="number" min={0} step="0.01"
                      className="h-8 text-sm tabular-nums text-start"
                      value={additionalCosts}
                      onChange={e => setAdditionalCosts(e.target.value)}
                    />
                  </div>

                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>{t("editor.grand_total")}</span>
                    <span className="tabular-nums">{formatMoney(totals.grandTotal, lang)}</span>
                  </div>
                </div>

                <Separator />

                {/* Readiness */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("editor.readiness_title")}
                  </p>
                  {isReady ? (
                    <div className="flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {t("editor.ready")}
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {blockers.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-warning" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Separator />

                {/* Action buttons */}
                <div className="space-y-2">
                  {can("purchasing.invoice.approve") && (
                    <Button
                      className="w-full"
                      disabled={!isReady || approving}
                      onClick={() => setConfirmOpen(true)}
                    >
                      {approving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
                      {approving ? t("editor.approving") : t("editor.approve")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={saveDraft}
                  >
                    {t("editor.save_draft")}
                  </Button>
                </div>
              </div>
            </PageSection>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("editor.approve_title")}
        description={t("editor.approve_body")}
        confirmTone="primary"
        confirmLabel={t("editor.approve")}
        onConfirm={handleApprove}
        loading={approving}
      />
    </>
  );
}
