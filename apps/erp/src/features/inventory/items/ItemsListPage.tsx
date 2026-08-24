import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";

// Patterns
import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";

// UI primitives
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Badge }     from "@/components/ui/badge";
import { Checkbox }  from "@/components/ui/checkbox";
import { Switch }    from "@/components/ui/switch";
import { Label }     from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";

// Icons
import {
  Plus, Upload, Download, MoreVertical, Package, X,
  SlidersHorizontal, Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight,
  Printer, Copy, Ban, CheckCircle2, Trash2, Pencil,
} from "lucide-react";

// Lib
import { toast } from "sonner";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn }             from "@/lib/utils";
import { useCan }         from "@/lib/permissions";
import { useItems }       from "./useItems";
import { ImportDrawer }   from "./ImportDrawer";
import { VariantQuickEditDrawer } from "./VariantQuickEditDrawer";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import type {
  InventoryItem, InventoryCategory, InventoryWarehouse, InventoryUom, InventoryAttribute,
  InventoryAttributeValue, InventoryVariant, ItemStatus, ItemFilters,
} from "./types";
import { variantBalance as getVariantBalance, comboLabel } from "./variants";

/* ─── Module-level helpers ──────────────────────────────────── */

const colHelper = createColumnHelper<InventoryItem>();

function getTotalBalance(item: InventoryItem): number | null {
  if (item.item_type === "service") return null;
  return item.balances.reduce((s, b) => s + b.qty, 0);
}

function getEffectiveStatus(item: InventoryItem): ItemStatus {
  if (item.incomplete) return "incomplete";
  if (item.status === "suspended") return "suspended";
  const bal = getTotalBalance(item);
  if (bal !== null && item.reorder_level !== null && bal <= item.reorder_level)
    return "low-stock";
  return "active";
}

function getRetailPrice(item: InventoryItem): number {
  return item.prices["pl_retail"] ?? Object.values(item.prices)[0] ?? 0;
}

/* ── DD-1 — product-parent display helpers (D5: parent never has an editable
   balance/price, only a computed rollup) ───────────────────────────────── */

function getDisplayBalance(item: InventoryItem): number | null {
  if (item.is_product_parent) return item.rollup?.balance_total ?? 0;
  return getTotalBalance(item);
}

function isProductAnyLowStock(item: InventoryItem): boolean {
  return !!item.is_product_parent && !!item.rollup?.any_low_stock;
}

function getPriceRangeParts(item: InventoryItem): { min: number; max: number } | null {
  if (!item.is_product_parent || !item.rollup) return null;
  return item.rollup.price_range;
}

const STATUS_VARIANT: Record<ItemStatus, "paid" | "credit" | "default"> = {
  active:      "paid",
  suspended:   "default",
  incomplete:  "credit",
  "low-stock": "credit",
};

const DEFAULT_FILTERS: ItemFilters = {
  category: "", warehouse: "", item_type: "",
  status: "", low_stock: false, price_min: "", price_max: "",
  attribute_value: "", has_variants: "",
};

/* ─── Skeleton (8 rows, thumb + bars) ────────────────────────── */

function ItemsSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[16, 36, 64, 120, 88, 56, 52, 64, 60, 32].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded shrink-0" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.09 }}
        >
          <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <Skeleton className="h-3.5 w-16 shrink-0" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24 hidden lg:block shrink-0" />
          <Skeleton className="h-3.5 w-14 hidden lg:block shrink-0" />
          <Skeleton className="h-3.5 w-12 shrink-0" />
          <Skeleton className="h-3.5 w-20 shrink-0" />
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
          <Skeleton className="h-7 w-7 rounded-sm shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ─── NoResults ─────────────────────────────────────────────── */

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  const { t } = useTranslation("inventory");
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="flex items-center justify-center h-12 w-12 rounded bg-muted text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">
          {query ? t("items.no_results", { q: query }) : t("items.no_results_empty")}
        </p>
        <p className="text-sm text-muted-foreground">{t("actions.clear_filters")}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        {t("actions.clear_filters")}
      </Button>
    </div>
  );
}

/* ─── Variant sub-row (DD-1 §2 — expanded under a product-parent row) ──── */

function VariantSubRow({
  variant, attributeOrder, attributeValues, colSpan, lang, t, highlighted, onEdit,
}: {
  variant: InventoryVariant;
  attributeOrder: string[];
  attributeValues: InventoryAttributeValue[];
  colSpan: number;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation>["t"];
  highlighted: boolean;
  onEdit: (variant: InventoryVariant) => void;
}) {
  const bal = getVariantBalance(variant);
  const price = variant.prices["pl_retail"] ?? Object.values(variant.prices)[0] ?? 0;
  return (
    <TableRow className={cn("border-b border-border bg-muted/20", highlighted && "bg-warning-tint")}>
      <TableCell colSpan={colSpan} className="px-3 py-2">
        <div className="flex items-center gap-3 ps-8 flex-wrap">
          <span className="text-sm font-medium">{comboLabel(variant.attrs, attributeOrder, attributeValues, lang)}</span>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">{variant.code}</span>
          <span className="text-xs tabular-nums text-muted-foreground ms-auto">{formatNumber(bal)}</span>
          <span className="text-xs tabular-nums text-muted-foreground w-20 text-end">{formatMoney(price, lang)}</span>
          <StatusPill
            variant={variant.status === "suspended" ? "default" : "paid"}
            label={t(`status.${variant.status}`)}
            className="text-xs"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onEdit(variant)}>
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ─── Row actions (shared between table + card) ─────────────── */

function RowActions({
  item,
  can,
  t,
  onEdit,
  onDuplicate,
  onToggleSuspend,
  onPrintBarcode,
  onDeleteRequest,
}: {
  item: InventoryItem;
  can: (p: string) => boolean;
  t: ReturnType<typeof useTranslation>["t"];
  onEdit: (item: InventoryItem) => void;
  onDuplicate: (item: InventoryItem) => void;
  onToggleSuspend: (item: InventoryItem) => void;
  onPrintBarcode: (item: InventoryItem) => void;
  onDeleteRequest: (item: InventoryItem) => void;
}) {
  const status   = getEffectiveStatus(item);
  const isActive = status === "active" || status === "low-stock";

  return (
    <>
      <RowActionItem icon={Pencil} onClick={() => onEdit(item)}>{t("actions.edit")}</RowActionItem>
      {can("inventory.item.create") && (
        <RowActionItem icon={Copy} onClick={() => onDuplicate(item)}>{t("actions.duplicate")}</RowActionItem>
      )}
      {can("inventory.item.suspend") && (
        <>
          <DropdownMenuSeparator />
          <RowActionItem icon={isActive ? Ban : CheckCircle2} onClick={() => onToggleSuspend(item)}>
            {isActive ? t("actions.suspend") : t("actions.activate")}
          </RowActionItem>
        </>
      )}
      <RowActionItem icon={Printer} onClick={() => onPrintBarcode(item)}>{t("actions.print_barcode")}</RowActionItem>
      {can("inventory.item.delete") && (
        <>
          <DropdownMenuSeparator />
          <RowActionItem icon={Trash2} destructive onClick={() => onDeleteRequest(item)}>
            {t("actions.delete")}
          </RowActionItem>
        </>
      )}
    </>
  );
}

/* ─── Mobile ItemCard ───────────────────────────────────────── */

function ItemCard({
  item, selected, onToggle, lang, categoryMap, uomMap, can, t,
  onEdit, onDuplicate, onToggleSuspend, onPrintBarcode, onDeleteRequest,
  expanded, onToggleExpand, attributeValues,
}: {
  item: InventoryItem;
  selected: boolean;
  onToggle: (v: boolean) => void;
  lang: "ar" | "en";
  categoryMap: Record<string, InventoryCategory>;
  uomMap: Record<string, InventoryUom>;
  can: (p: string) => boolean;
  t: ReturnType<typeof useTranslation>["t"];
  onEdit: (item: InventoryItem) => void;
  onDuplicate: (item: InventoryItem) => void;
  onToggleSuspend: (item: InventoryItem) => void;
  onPrintBarcode: (item: InventoryItem) => void;
  onDeleteRequest: (item: InventoryItem) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  attributeValues: InventoryAttributeValue[];
}) {
  const status  = getEffectiveStatus(item);
  const balance = getDisplayBalance(item);
  const price   = getRetailPrice(item);
  const priceRange = getPriceRangeParts(item);
  const cat     = categoryMap[item.category_id];
  const uom     = uomMap[item.base_uom_id];

  return (
    <div
      className={cn(
        "flex flex-col rounded-sm border border-border bg-card transition-colors",
        selected && "bg-muted/50 border-primary/40"
      )}
    >
      <div className="flex items-start gap-3 p-3">
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-1 shrink-0"
      />
      <div className="h-10 w-10 rounded-sm bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {item.image
          ? <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
          : <Package className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate">
              {lang === "ar" ? item.name_ar : item.name_en}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {item.code}
              {item.is_product_parent && (
                <button
                  type="button"
                  className="ms-1.5 text-brand underline-offset-2 hover:underline"
                  onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                >
                  {t("items.variants_badge", { n: item.variants?.length ?? 0 })}
                </button>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusPill
              variant={STATUS_VARIANT[status]}
              label={t(`status.${status.replace("-", "_")}`)}
              className="text-xs"
            />
            {isProductAnyLowStock(item) && (
              <StatusPill variant="credit" label={t("status.low_stock")} className="text-xs" />
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {(lang === "ar" ? cat?.name_ar : cat?.name_en) ?? ""}
          {" · "}
          {(lang === "ar" ? uom?.name_ar : uom?.name_en) ?? ""}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm tabular-nums font-medium">
            {balance === null ? "—" : formatNumber(balance)}
          </span>
          <span className="text-sm tabular-nums">
            {priceRange
              ? (priceRange.min === priceRange.max
                  ? formatMoney(priceRange.min, lang)
                  : t("variants.price_range", { min: formatNumber(priceRange.min), max: formatNumber(priceRange.max) }))
              : formatMoney(price, lang)}
          </span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 shrink-0 mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <RowActionsContent>
          <RowActions
            item={item} can={can} t={t}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onToggleSuspend={onToggleSuspend}
            onPrintBarcode={onPrintBarcode}
            onDeleteRequest={onDeleteRequest}
          />
        </RowActionsContent>
      </DropdownMenu>
      </div>

      {/* DD-1 §2/§7 — mobile: tap the variants badge to expand a stacked list */}
      {item.is_product_parent && expanded && (
        <div className="border-t border-border divide-y divide-border">
          {(item.variants ?? []).map((v) => {
            const bal = getVariantBalance(v);
            const vp = v.prices["pl_retail"] ?? Object.values(v.prices)[0] ?? 0;
            return (
              <div key={v.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="font-medium">{comboLabel(v.attrs, item.attributes_used ?? Object.keys(v.attrs), attributeValues, lang)}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{v.code}</span>
                <span className="tabular-nums">{formatNumber(bal)}</span>
                <span className="tabular-nums">{formatMoney(vp, lang)}</span>
                <StatusPill variant={v.status === "suspended" ? "default" : "paid"} label={t(`status.${v.status}`)} className="text-xs" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── BulkBar ───────────────────────────────────────────────── */

function BulkBar({
  count, can, t, onClear, onActivate, onSuspend, onPrintBarcode, onExport, onDeleteRequest,
}: {
  count: number;
  can: (p: string) => boolean;
  t: ReturnType<typeof useTranslation>["t"];
  onClear: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onPrintBarcode: () => void;
  onExport: () => void;
  onDeleteRequest: () => void;
}) {
  return (
    <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-card shadow-lg px-4 py-2 text-sm font-medium animate-in slide-in-from-bottom-4 duration-150">
        <span className="text-muted-foreground tabular-nums me-1">
          {count} {t("actions.selected")}
        </span>
        <Separator orientation="vertical" className="h-4 mx-1" />
        {can("inventory.item.suspend") && (
          <>
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full px-3" onClick={onActivate}>
              {t("actions.bulk_activate")}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full px-3" onClick={onSuspend}>
              {t("actions.bulk_suspend")}
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full px-3" onClick={onPrintBarcode}>
          {t("actions.print_barcode")}
        </Button>
        {can("inventory.item.export") && (
          <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full px-3" onClick={onExport}>
            {t("actions.export_selected")}
          </Button>
        )}
        {can("inventory.item.delete") && (
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs rounded-full px-3 text-destructive hover:text-destructive"
            onClick={onDeleteRequest}
          >
            {t("actions.delete")}
          </Button>
        )}
        <Separator orientation="vertical" className="h-4 mx-1" />
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Inline filter selects ─────────────────────────────────── */

function FilterSelects({
  filters,
  setFilters,
  categories,
  warehouses,
  attributes,
  attributeValues,
  t,
  lang,
}: {
  filters: ItemFilters;
  setFilters: React.Dispatch<React.SetStateAction<ItemFilters>>;
  categories: InventoryCategory[];
  warehouses: InventoryWarehouse[];
  attributes: InventoryAttribute[];
  attributeValues: InventoryAttributeValue[];
  t: ReturnType<typeof useTranslation>["t"];
  lang: "ar" | "en";
}) {
  const attrById = Object.fromEntries(attributes.map((a) => [a.id, a]));
  return (
    <>
      {/* Category */}
      <Select
        value={filters.category || "_all"}
        onValueChange={(v) => setFilters((f) => ({ ...f, category: v === "_all" ? "" : v }))}
      >
        <SelectTrigger className="h-9 w-40 text-sm">
          <SelectValue placeholder={t("filters.all_categories")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t("filters.all_categories")}</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {lang === "ar" ? c.name_ar : c.name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Warehouse */}
      <Select
        value={filters.warehouse || "_all"}
        onValueChange={(v) => setFilters((f) => ({ ...f, warehouse: v === "_all" ? "" : v }))}
      >
        <SelectTrigger className="h-9 w-40 text-sm">
          <SelectValue placeholder={t("filters.all_warehouses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t("filters.all_warehouses")}</SelectItem>
          {warehouses.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {lang === "ar" ? w.name_ar : w.name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Item type */}
      <Select
        value={filters.item_type || "_all"}
        onValueChange={(v) => setFilters((f) => ({ ...f, item_type: v === "_all" ? "" : v }))}
      >
        <SelectTrigger className="h-9 w-36 text-sm">
          <SelectValue placeholder={t("filters.all_types")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t("filters.all_types")}</SelectItem>
          <SelectItem value="stocked">{t("item_types.stocked")}</SelectItem>
          <SelectItem value="service">{t("item_types.service")}</SelectItem>
          <SelectItem value="non_stock">{t("item_types.non_stock")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status || "_all"}
        onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "_all" ? "" : v }))}
      >
        <SelectTrigger className="h-9 w-36 text-sm">
          <SelectValue placeholder={t("filters.all_statuses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t("filters.all_statuses")}</SelectItem>
          <SelectItem value="active">{t("status.active")}</SelectItem>
          <SelectItem value="suspended">{t("status.suspended")}</SelectItem>
          <SelectItem value="incomplete">{t("status.incomplete")}</SelectItem>
          <SelectItem value="low-stock">{t("status.low_stock")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Low stock toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="low-stock-toggle"
          checked={filters.low_stock}
          onCheckedChange={(v) => setFilters((f) => ({ ...f, low_stock: v }))}
        />
        <Label htmlFor="low-stock-toggle" className="text-sm cursor-pointer whitespace-nowrap">
          {t("filters.low_stock")}
        </Label>
      </div>

      {/* Price range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 text-sm px-3">
            {t("filters.price_range")}
            {(filters.price_min || filters.price_max) && (
              <Badge variant="secondary" className="ms-1.5 h-4 text-xs px-1">
                {filters.price_min && `≥${filters.price_min}`}
                {filters.price_min && filters.price_max && " "}
                {filters.price_max && `≤${filters.price_max}`}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 space-y-3 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("filters.price_from")}</Label>
            <Input
              type="number"
              min={0}
              className="h-8 text-sm tabular-nums"
              value={filters.price_min}
              onChange={(e) => setFilters((f) => ({ ...f, price_min: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("filters.price_to")}</Label>
            <Input
              type="number"
              min={0}
              className="h-8 text-sm tabular-nums"
              value={filters.price_max}
              onChange={(e) => setFilters((f) => ({ ...f, price_max: e.target.value }))}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* DD-1 — item-type filter (all / simple / product) */}
      <Select
        value={filters.has_variants || "_all"}
        onValueChange={(v) => setFilters((f) => ({ ...f, has_variants: (v === "_all" ? "" : v) as ItemFilters["has_variants"] }))}
      >
        <SelectTrigger className="h-9 w-32 text-sm">
          <SelectValue placeholder={t("filters.has_variants")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t("filters.has_variants_all")}</SelectItem>
          <SelectItem value="simple">{t("filters.has_variants_simple")}</SelectItem>
          <SelectItem value="product">{t("filters.has_variants_product")}</SelectItem>
        </SelectContent>
      </Select>

      {/* DD-1 — attribute value filter (e.g. Color = Red) */}
      {attributeValues.length > 0 && (
        <Select
          value={filters.attribute_value || "_all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, attribute_value: v === "_all" ? "" : v }))}
        >
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder={t("filters.attribute")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t("filters.all_attributes")}</SelectItem>
            {attributeValues.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {(lang === "ar" ? attrById[v.attribute_id]?.name_ar : attrById[v.attribute_id]?.name_en) ?? ""}
                {" = "}
                {lang === "ar" ? v.value_ar : v.value_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );
}

/* ─── Sort icon ─────────────────────────────────────────────── */

function SortIcon({ dir }: { dir: "asc" | "desc" | false }) {
  if (dir === "asc")  return <ChevronUp   className="h-3.5 w-3.5" />;
  if (dir === "desc") return <ChevronDown className="h-3.5 w-3.5" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
}

/* ─── Main page ─────────────────────────────────────────────── */

export function ItemsListPage() {
  const { t, i18n }   = useTranslation("inventory");
  const lang           = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can            = useCan();
  const navigate       = useNavigate();
  const openCreate     = useCreateDispatcher(s => s.openCreate);

  const { data, loading, error, isOffline, reload, mutate } = useItems();

  const [importOpen,   setImportOpen]     = useState(false);
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebounced]   = useState("");
  const [deleteTarget, setDeleteTarget]   = useState<InventoryItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [filters, setFilters]             = useState<ItemFilters>(DEFAULT_FILTERS);
  const [sorting, setSorting]             = useState<SortingState>([]);
  const [rowSelection, setRowSelection]   = useState<RowSelectionState>({});
  const [expandedIds, setExpandedIds]     = useState<Set<string>>(new Set());
  const [editVariantTarget, setEditVariantTarget] = useState<{ item: InventoryItem; variant: InventoryVariant } | null>(null);

  // 300ms debounce on search
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Lookup maps
  const categoryMap = useMemo<Record<string, InventoryCategory>>(() => {
    if (!data) return {};
    return Object.fromEntries(data.categories.map((c) => [c.id, c]));
  }, [data]);

  const uomMap = useMemo<Record<string, InventoryUom>>(() => {
    if (!data) return {};
    return Object.fromEntries(data.uoms.map((u) => [u.id, u]));
  }, [data]);

  // Filtered items (client-side — maps 1:1 to mock's server-side semantics)
  const filteredItems = useMemo<InventoryItem[]>(() => {
    if (!data) return [];
    let items = data.items;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(
        (it) =>
          it.code.toLowerCase().includes(q) ||
          it.name_ar.includes(q) ||
          it.name_en.toLowerCase().includes(q) ||
          it.barcodes.some((b) => b.includes(q)) ||
          // DD-1 §2/§8 — search also matches variant code/barcode; a hit on a
          // variant surfaces (and later auto-expands) its parent row.
          (it.variants ?? []).some(
            (v) => v.code.toLowerCase().includes(q) || v.barcodes.some((b) => b.includes(q))
          )
      );
    }
    if (filters.category)
      items = items.filter((it) => it.category_id === filters.category);

    if (filters.warehouse)
      items = items.filter(
        (it) =>
          it.item_type === "service" ||
          it.balances.some((b) => b.warehouse_id === filters.warehouse) ||
          (it.variants ?? []).some((v) => v.balances.some((b) => b.warehouse_id === filters.warehouse))
      );

    if (filters.item_type)
      items = items.filter((it) => it.item_type === filters.item_type);

    if (filters.status)
      items = items.filter((it) => getEffectiveStatus(it) === filters.status);

    if (filters.low_stock)
      items = items.filter((it) => {
        if (it.is_product_parent) return isProductAnyLowStock(it);
        const bal = getTotalBalance(it);
        return bal !== null && it.reorder_level !== null && bal <= it.reorder_level;
      });

    if (filters.price_min) {
      const min = parseFloat(filters.price_min);
      if (!isNaN(min)) items = items.filter((it) => {
        const range = getPriceRangeParts(it);
        return range ? range.max >= min : getRetailPrice(it) >= min;
      });
    }
    if (filters.price_max) {
      const max = parseFloat(filters.price_max);
      if (!isNaN(max)) items = items.filter((it) => {
        const range = getPriceRangeParts(it);
        return range ? range.min <= max : getRetailPrice(it) <= max;
      });
    }

    // DD-1 §2 — has_variants filter: all / simple / product
    if (filters.has_variants === "simple") items = items.filter((it) => !it.is_product_parent);
    if (filters.has_variants === "product") items = items.filter((it) => !!it.is_product_parent);

    // DD-1 §2 — Attribute filter: products with a variant carrying this value
    if (filters.attribute_value)
      items = items.filter((it) => (it.variants ?? []).some((v) => Object.values(v.attrs).includes(filters.attribute_value)));

    return items;
  }, [data, debouncedSearch, filters]);

  // DD-1 §8 — which variant (if any) matched the current search inside each
  // product parent, so we can auto-expand + highlight it.
  const searchVariantHits = useMemo<Record<string, string>>(() => {
    if (!debouncedSearch) return {};
    const q = debouncedSearch.toLowerCase();
    const hits: Record<string, string> = {};
    for (const it of filteredItems) {
      if (!it.is_product_parent) continue;
      const ownHit =
        it.code.toLowerCase().includes(q) || it.name_ar.includes(q) || it.name_en.toLowerCase().includes(q);
      if (ownHit) continue;
      const hitVariant = (it.variants ?? []).find(
        (v) => v.code.toLowerCase().includes(q) || v.barcodes.some((b) => b.includes(q))
      );
      if (hitVariant) hits[it.id] = hitVariant.id;
    }
    return hits;
  }, [filteredItems, debouncedSearch]);

  useEffect(() => {
    const hitIds = Object.keys(searchVariantHits);
    if (hitIds.length === 0) return;
    setExpandedIds((prev) => new Set([...prev, ...hitIds]));
  }, [searchVariantHits]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Active filter chips
  const chips = useMemo(() => {
    const arr: Array<{ key: keyof ItemFilters | "search"; label: string }> = [];
    if (debouncedSearch) arr.push({ key: "search", label: debouncedSearch });
    if (filters.category) {
      const cat = categoryMap[filters.category];
      arr.push({ key: "category", label: lang === "ar" ? (cat?.name_ar ?? "") : (cat?.name_en ?? "") });
    }
    if (filters.warehouse && data) {
      const wh = data.warehouses.find((w) => w.id === filters.warehouse);
      arr.push({ key: "warehouse", label: lang === "ar" ? (wh?.name_ar ?? "") : (wh?.name_en ?? "") });
    }
    if (filters.item_type) arr.push({ key: "item_type", label: t(`item_types.${filters.item_type}`) });
    if (filters.status)    arr.push({ key: "status",    label: t(`status.${filters.status.replace("-", "_")}`) });
    if (filters.low_stock) arr.push({ key: "low_stock", label: t("filters.low_stock") });
    if (filters.price_min) arr.push({ key: "price_min", label: `≥ ${filters.price_min}` });
    if (filters.price_max) arr.push({ key: "price_max", label: `≤ ${filters.price_max}` });
    if (filters.has_variants) arr.push({ key: "has_variants", label: t(`filters.has_variants_${filters.has_variants}`) });
    if (filters.attribute_value && data) {
      const av = data.attribute_values.find((v) => v.id === filters.attribute_value);
      const attr = data.attributes.find((a) => a.id === av?.attribute_id);
      arr.push({
        key: "attribute_value",
        label: av ? `${lang === "ar" ? attr?.name_ar : attr?.name_en} = ${lang === "ar" ? av.value_ar : av.value_en}` : "",
      });
    }
    return arr;
  }, [debouncedSearch, filters, categoryMap, data, lang, t]);

  const removeFilter = useCallback((key: keyof ItemFilters | "search") => {
    if (key === "search") { setSearch(""); return; }
    if (key === "low_stock") { setFilters((f) => ({ ...f, low_stock: false })); return; }
    setFilters((f) => ({ ...f, [key]: "" }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
  }, []);

  const clearSelection = useCallback(() => setRowSelection({}), []);

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  );

  const handleEdit = useCallback((item: InventoryItem) => {
    navigate(`/inventory/items/${item.id}`);
  }, [navigate]);

  // DD-1 §3.6 — variant quick-edit drawer save: patches only the overridden
  // fields on that one variant, then recomputes the parent rollup so the
  // list stays consistent (never touches the variant's balance/ledger).
  const handleSaveVariantOverride = useCallback((variantId: string, patch: Partial<InventoryVariant>) => {
    mutate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => {
          if (!it.variants?.some((v) => v.id === variantId)) return it;
          const nextVariants = it.variants.map((v) => (v.id === variantId ? { ...v, ...patch } : v));
          return { ...it, variants: nextVariants };
        }),
      };
    });
  }, [mutate]);

  const handleDuplicate = useCallback((item: InventoryItem) => {
    const copy: InventoryItem = {
      ...item,
      id: `${item.id}-copy-${Date.now()}`,
      code: `${item.code}-COPY`,
      name_ar: `${item.name_ar} (نسخة)`,
      name_en: `${item.name_en} (Copy)`,
    };
    mutate((prev) => prev && { ...prev, items: [copy, ...prev.items] });
    toast.success(t("items.duplicated_toast", { name: lang === "ar" ? item.name_ar : item.name_en }));
  }, [mutate, t, lang]);

  const handleToggleSuspend = useCallback((item: InventoryItem) => {
    const nextStatus = item.status === "suspended" ? "active" : "suspended";
    mutate((prev) => prev && {
      ...prev,
      items: prev.items.map((i) => i.id === item.id ? {
        ...i,
        status: nextStatus,
        // DD-1 §2 — bulk/row actions on a product parent apply to all its variants.
        variants: i.is_product_parent ? i.variants?.map((v) => ({ ...v, status: nextStatus })) : i.variants,
      } : i),
    });
    toast.success(nextStatus === "suspended" ? t("items.suspended_toast") : t("items.activated_toast"));
  }, [mutate, t]);

  const handlePrintBarcode = useCallback((item: InventoryItem) => {
    toast.success(t("items.barcode_print_toast", { code: item.code }));
  }, [t]);

  // DD-1 §2 — deletion is blocked if the item (or, for a product parent, ANY
  // of its variants) has recorded ledger movements — same golden-rule spirit
  // as the existing v1 `items.cant_delete` copy, now checked for real.
  const itemHasMovements = useCallback((item: InventoryItem): boolean => {
    if (!data) return false;
    if (item.is_product_parent) {
      const variantIds = new Set((item.variants ?? []).map((v) => v.id));
      return data.ledger.some((m) => m.variant_id && variantIds.has(m.variant_id));
    }
    return data.ledger.some((m) => m.item_id === item.id && !m.variant_id);
  }, [data]);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const removedName = lang === "ar" ? deleteTarget.name_ar : deleteTarget.name_en;
    mutate((prev) => prev && { ...prev, items: prev.items.filter((i) => i.id !== deleteTarget.id) });
    setDeleteTarget(null);
    toast.success(t("items.deleted_toast", { name: removedName }));
  }, [deleteTarget, mutate, t, lang]);

  const handleBulkActivate = useCallback(() => {
    mutate((prev) => prev && {
      ...prev,
      items: prev.items.map((i) => selectedIds.includes(i.id) ? {
        ...i, status: "active",
        variants: i.is_product_parent ? i.variants?.map((v) => ({ ...v, status: "active" as const })) : i.variants,
      } : i),
    });
    toast.success(t("items.bulk_activated_toast", { n: selectedIds.length }));
    clearSelection();
  }, [mutate, selectedIds, t, clearSelection]);

  const handleBulkSuspend = useCallback(() => {
    mutate((prev) => prev && {
      ...prev,
      items: prev.items.map((i) => selectedIds.includes(i.id) ? {
        ...i, status: "suspended",
        variants: i.is_product_parent ? i.variants?.map((v) => ({ ...v, status: "suspended" as const })) : i.variants,
      } : i),
    });
    toast.success(t("items.bulk_suspended_toast", { n: selectedIds.length }));
    clearSelection();
  }, [mutate, selectedIds, t, clearSelection]);

  const handleBulkPrintBarcode = useCallback(() => {
    toast.success(t("items.bulk_barcode_print_toast", { n: selectedIds.length }));
  }, [selectedIds, t]);

  // DD-1 §2 — export flattens a product parent to one row per variant; this
  // app has no real file-export anywhere yet (every export button here is a
  // toast stub), so this stays a stub too, but the flattened count is real.
  const handleBulkExport = useCallback(() => {
    if (!data) return;
    const flatCount = selectedIds.reduce((n, id) => {
      const it = data.items.find((i) => i.id === id);
      return n + (it?.is_product_parent ? (it.variants?.length ?? 0) : 1);
    }, 0);
    toast.success(t("items.bulk_export_toast", { n: flatCount }));
  }, [selectedIds, t, data]);

  const confirmBulkDelete = useCallback(() => {
    const blocked = selectedIds.filter((id) => {
      const it = data?.items.find((i) => i.id === id);
      return it && itemHasMovements(it);
    });
    mutate((prev) => prev && { ...prev, items: prev.items.filter((i) => !selectedIds.includes(i.id) || blocked.includes(i.id)) });
    const deletedCount = selectedIds.length - blocked.length;
    if (deletedCount > 0) toast.success(t("items.bulk_deleted_toast", { n: deletedCount }));
    if (blocked.length > 0) toast.error(t("items.cant_delete"));
    setBulkDeleteOpen(false);
    clearSelection();
  }, [mutate, selectedIds, t, clearSelection, data, itemHasMovements]);

  // TanStack Table columns
  const columns = useMemo(() => [
    // DD-1 §2 — expander (chevron at logical start) for product-parent rows
    colHelper.display({
      id: "expander",
      cell: ({ row }) =>
        row.original.is_product_parent ? (
          <button
            type="button"
            className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); toggleExpanded(row.original.id); }}
            aria-label={expandedIds.has(row.original.id) ? t("items.collapse_variants") : t("items.expand_variants")}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 rtl:rotate-180 transition-transform", expandedIds.has(row.original.id) && "rotate-90 rtl:rotate-90")} />
          </button>
        ) : null,
    }),
    // Select
    colHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    }),

    // Thumbnail
    colHelper.display({
      id: "thumb",
      cell: ({ row }) => (
        <div className="h-9 w-9 rounded-sm bg-muted shrink-0 overflow-hidden">
          {row.original.image && (
            <img
              src={row.original.image}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>
      ),
    }),

    // Code — a product-parent shows a "N variants" badge alongside its code (DD-1 §2)
    colHelper.accessor("code", {
      header: t("columns.code"),
      enableSorting: true,
      sortingFn: "alphanumeric",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="tabular-nums text-xs font-mono">{row.original.code}</span>
          {row.original.is_product_parent && (
            <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
              {t("items.variants_badge", { n: row.original.variants?.length ?? 0 })}
            </Badge>
          )}
        </span>
      ),
    }),

    // Name
    colHelper.accessor(
      (row) => (lang === "ar" ? row.name_ar : row.name_en),
      {
        id: "name",
        header: t("columns.name"),
        enableSorting: true,
        sortingFn: "alphanumeric",
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium leading-tight">
              {lang === "ar" ? row.original.name_ar : row.original.name_en}
            </span>
            {lang === "ar" && row.original.name_en && (
              <span className="text-xs text-muted-foreground leading-tight">{row.original.name_en}</span>
            )}
            {lang === "en" && row.original.name_ar && (
              <span className="text-xs text-muted-foreground leading-tight">{row.original.name_ar}</span>
            )}
          </div>
        ),
      }
    ),

    // Category (hidden on <lg)
    colHelper.display({
      id: "category",
      header: t("columns.category"),
      cell: ({ row }) => {
        const cat = categoryMap[row.original.category_id];
        return (
          <span className="text-sm text-muted-foreground">
            {lang === "ar" ? (cat?.name_ar ?? "—") : (cat?.name_en ?? "—")}
          </span>
        );
      },
    }),

    // Unit (hidden on <lg)
    colHelper.display({
      id: "unit",
      cell: ({ row }) => {
        const uom = uomMap[row.original.base_uom_id];
        return <span className="text-sm">{lang === "ar" ? (uom?.name_ar ?? "—") : (uom?.name_en ?? "—")}</span>;
      },
      header: t("columns.unit"),
    }),

    // Balance — a product-parent shows the scope-respecting rollup, never an
    // editable balance (D5/§8 #4); tooltip explains it's a computed sum.
    colHelper.accessor(
      (row) => getDisplayBalance(row) ?? -Infinity,
      {
        id: "balance",
        header: t("columns.balance"),
        enableSorting: true,
        sortingFn: "basic",
        cell: ({ row }) => {
          const bal = getDisplayBalance(row.original);
          return bal === null
            ? <span className="text-muted-foreground">—</span>
            : (
              <span className="tabular-nums" title={row.original.is_product_parent ? t("variants.rollup_hint") : undefined}>
                {formatNumber(bal)}
              </span>
            );
        },
      }
    ),

    // Sale price — a range when variant prices differ, single value otherwise
    colHelper.accessor(
      (row) => getPriceRangeParts(row)?.min ?? getRetailPrice(row),
      {
        id: "sale_price",
        header: t("columns.price"),
        enableSorting: true,
        sortingFn: "basic",
        cell: ({ row }) => {
          const range = getPriceRangeParts(row.original);
          if (range) {
            return range.min === range.max
              ? <span className="tabular-nums">{formatMoney(range.min, lang)}</span>
              : <span className="tabular-nums whitespace-nowrap">{t("variants.price_range", { min: formatNumber(range.min), max: formatNumber(range.max) })}</span>;
          }
          return <span className="tabular-nums">{formatMoney(getRetailPrice(row.original), lang)}</span>;
        },
      }
    ),

    // Status — a product-parent additionally shows a low-stock pill when ANY
    // variant is below its reorder level (§2)
    colHelper.display({
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => {
        const st = getEffectiveStatus(row.original);
        return (
          <span className="inline-flex items-center gap-1">
            <StatusPill
              variant={STATUS_VARIANT[st]}
              label={t(`status.${st.replace("-", "_")}`)}
            />
            {isProductAnyLowStock(row.original) && (
              <StatusPill variant="credit" label={t("status.low_stock")} />
            )}
          </span>
        );
      },
    }),

    // Actions
    colHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <RowActionsContent>
            <RowActions
              item={row.original} can={can} t={t}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onToggleSuspend={handleToggleSuspend}
              onPrintBarcode={handlePrintBarcode}
              onDeleteRequest={setDeleteTarget}
            />
          </RowActionsContent>
        </DropdownMenu>
      ),
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, lang, categoryMap, uomMap, can, handleEdit, handleDuplicate, handleToggleSuspend, handlePrintBarcode, expandedIds, toggleExpanded]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;
  const totalCount    = data?.items.length ?? 0;

  /* ── Derived state flags ── */
  const showSkeleton   = loading && !data;
  const showError      = !!error && !isOffline;
  const isEmpty        = !showSkeleton && !showError && (data?.items.length ?? 0) === 0;
  const hasNoResults   = !isEmpty && filteredItems.length === 0 && chips.length > 0;
  const showTable      = !showSkeleton && !showError && !isEmpty && !hasNoResults;

  /* ── Page actions ── */
  const pageActions = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {can("inventory.item.create") && (
        <Button size="sm" onClick={() => openCreate("new_item")}>
          <Plus className="h-4 w-4 me-1.5" />
          {t("items.new")}
        </Button>
      )}
      {can("inventory.item.import") && (
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 me-1.5" />
          {t("actions.import")}
        </Button>
      )}
      {can("inventory.item.export") && (
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 me-1.5" />
          {t("actions.export")}
        </Button>
      )}
      <Button variant="outline" size="sm">
        <Printer className="h-4 w-4 me-1.5" />
        {t("actions.print_barcode")}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* ── Page header ── */}
      <PageHeader
        title={t("items.title")}
        count={
          data && totalCount > 0
            ? t("items.count", { n: formatNumber(totalCount) })
            : undefined
        }
        actions={pageActions}
        alert={isOffline ? <OfflineBanner message={t("offline.banner")} /> : undefined}
      />

      {/* ── Card: toolbar + content + pagination ── */}
      <PageSection padded={false}>

        {/* Toolbar — search + filters + chips; its own padding row */}
        <div className="px-4 py-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="ps-9 h-9 text-sm"
              placeholder={t("items.search_ph")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("items.search_ph")}
            />
            {search && (
              <button
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Inline filters — desktop only */}
          {data && (
            <div className="hidden lg:flex items-center gap-2 flex-wrap">
              <FilterSelects
                filters={filters}
                setFilters={setFilters}
                categories={data.categories}
                warehouses={data.warehouses}
                attributes={data.attributes}
                attributeValues={data.attribute_values}
                t={t}
                lang={lang}
              />
            </div>
          )}

          {/* Filters popover — tablet + mobile */}
          {data && (
            <div className="lg:hidden">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t("actions.filters")}
                    {chips.filter((c) => c.key !== "search").length > 0 && (
                      <Badge className="h-4 min-w-4 px-1 text-xs">
                        {chips.filter((c) => c.key !== "search").length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-3 p-4" align="end">
                  <FilterSelects
                    filters={filters}
                    setFilters={setFilters}
                    categories={data.categories}
                    warehouses={data.warehouses}
                    attributes={data.attributes}
                    attributeValues={data.attribute_values}
                    t={t}
                    lang={lang}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="gap-1 pe-1.5 cursor-pointer hover:bg-muted"
                onClick={() => removeFilter(chip.key)}
              >
                {chip.label}
                <X className="h-3 w-3 opacity-60" />
              </Badge>
            ))}
            <Button
              variant="ghost" size="sm"
              className="h-6 text-xs px-2 text-muted-foreground"
              onClick={clearAllFilters}
            >
              {t("actions.clear_filters")}
            </Button>
          </div>
        )}
        </div>{/* end toolbar */}

        {/* Content states */}
        {showSkeleton && <ItemsSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={Package}
              title={t("items.empty_title")}
              description={t("items.empty_sub")}
              action={
                can("inventory.item.create")
                  ? { label: t("items.new"), onClick: () => openCreate("new_item") }
                  : undefined
              }
            />
          </div>
        )}

        {hasNoResults && !showSkeleton && (
          <NoResults query={debouncedSearch} onClear={clearAllFilters} />
        )}

        {showTable && (
          <>
            {/* Desktop / tablet table — card provides the border; no extra wrapper needed */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader className="bg-muted/40">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="hover:bg-transparent border-b border-border">
                      {hg.headers.map((header) => {
                        const isSortable = header.column.getCanSort();
                        const sortDir    = header.column.getIsSorted();
                        const isNumeric  = ["balance", "sale_price"].includes(header.column.id);
                        const isHiddenOnMd = ["category", "unit"].includes(header.column.id);

                        return (
                          <TableHead
                            key={header.id}
                            className={cn(
                              "h-10 py-2 px-3 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap select-none",
                              isNumeric && "text-start",
                              isSortable && "cursor-pointer hover:text-foreground",
                              isHiddenOnMd && "hidden lg:table-cell",
                              header.column.id === "expander" && "w-8 px-0",
                              header.column.id === "select" && "w-14 px-0 ps-4 pe-2",
                              header.column.id === "thumb" && "w-12",
                              header.column.id === "actions" && "w-10",
                            )}
                            onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                          >
                            {header.isPlaceholder ? null : (
                              <span className="inline-flex items-center gap-1">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {isSortable && <SortIcon dir={sortDir} />}
                              </span>
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {table.getRowModel().rows.map((row) => {
                    const item = row.original;
                    const isExpanded = item.is_product_parent && expandedIds.has(item.id);
                    const highlightVariantId = searchVariantHits[item.id];
                    return (
                      <Fragment key={row.id}>
                        <TableRow
                          data-state={row.getIsSelected() ? "selected" : undefined}
                          className="border-b border-border last:border-0"
                        >
                          {row.getVisibleCells().map((cell) => {
                            const isNumeric  = ["balance", "sale_price"].includes(cell.column.id);
                            const isHiddenMd = ["category", "unit"].includes(cell.column.id);

                            return (
                              <TableCell
                                key={cell.id}
                                className={cn(
                                  "px-3 py-2.5 align-middle",
                                  isNumeric && "text-start tabular-nums",
                                  isHiddenMd && "hidden lg:table-cell",
                                  cell.column.id === "expander" && "w-8 px-0",
                                  cell.column.id === "select" && "w-14 px-0 ps-4 pe-2",
                                  cell.column.id === "thumb"  && "w-12",
                                  cell.column.id === "actions" && "w-10",
                                )}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            );
                          })}
                        </TableRow>

                        {/* DD-1 §2 — expanded variant sub-rows (not top-level rows) */}
                        {isExpanded && (item.variants ?? []).map((v) => (
                          <VariantSubRow
                            key={v.id}
                            variant={v}
                            attributeOrder={item.attributes_used ?? Object.keys(v.attrs)}
                            attributeValues={data?.attribute_values ?? []}
                            colSpan={row.getVisibleCells().length}
                            lang={lang}
                            t={t}
                            highlighted={v.id === highlightVariantId}
                            onEdit={(variant) => setEditVariantTarget({ item, variant })}
                          />
                        ))}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination footer — inside the card at the bottom */}
              <div className="flex items-center justify-end px-4 py-2 border-t border-border bg-muted/20">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("items.showing", {
                    from: filteredItems.length > 0 ? 1 : 0,
                    to:   filteredItems.length,
                    total: filteredItems.length,
                  })}
                </span>
              </div>
            </div>

            {/* Mobile card list — padded inside the card */}
            <div className="sm:hidden p-3 space-y-2">
              {table.getRowModel().rows.map((row) => (
                <ItemCard
                  key={row.original.id}
                  item={row.original}
                  selected={row.getIsSelected()}
                  onToggle={(v) => row.toggleSelected(!!v)}
                  lang={lang}
                  categoryMap={categoryMap}
                  uomMap={uomMap}
                  can={can}
                  t={t}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onToggleSuspend={handleToggleSuspend}
                  onPrintBarcode={handlePrintBarcode}
                  onDeleteRequest={setDeleteTarget}
                  expanded={expandedIds.has(row.original.id)}
                  onToggleExpand={() => toggleExpanded(row.original.id)}
                  attributeValues={data?.attribute_values ?? []}
                />
              ))}
              {/* Mobile pagination note */}
              <p className="text-xs text-muted-foreground text-center tabular-nums py-2">
                {t("items.showing", {
                  from: filteredItems.length > 0 ? 1 : 0,
                  to:   filteredItems.length,
                  total: filteredItems.length,
                })}
              </p>
            </div>
          </>
        )}

      </PageSection>{/* end card */}

      {/* ── Bulk action bar — fixed position, outside the card ── */}
      {selectedCount > 0 && (
        <BulkBar
          count={selectedCount} can={can} t={t} onClear={clearSelection}
          onActivate={handleBulkActivate}
          onSuspend={handleBulkSuspend}
          onPrintBarcode={handleBulkPrintBarcode}
          onExport={handleBulkExport}
          onDeleteRequest={() => setBulkDeleteOpen(true)}
        />
      )}

      {/* ── Import wizard drawer ──────────────────────────────── */}
      <ImportDrawer
        open={importOpen}
        onOpenChange={setImportOpen}
        data={data}
      />

      {/* ── Delete confirm (single row) ──────────────────────── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget && itemHasMovements(deleteTarget) ? t("items.cant_delete") : t("items.delete_title")}
        description={deleteTarget && itemHasMovements(deleteTarget) ? t("items.cant_delete") : t("items.delete_desc")}
        cancelLabel={deleteTarget && itemHasMovements(deleteTarget) ? t("actions.close") : t("actions.cancel")}
        confirmTone="danger"
        confirmLabel={t("actions.confirm_delete")}
        onConfirm={deleteTarget && itemHasMovements(deleteTarget) ? undefined : confirmDelete}
      />

      {/* ── Delete confirm (bulk) ─────────────────────────────── */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t("items.bulk_delete_title", { n: selectedIds.length })}
        description={t("items.delete_desc")}
        confirmTone="danger"
        confirmLabel={t("actions.confirm_delete")}
        onConfirm={confirmBulkDelete}
      />

      {/* ── Variant quick-edit drawer (DD-1 §3.6) ─────────────── */}
      <VariantQuickEditDrawer
        open={editVariantTarget !== null}
        onOpenChange={(o) => !o && setEditVariantTarget(null)}
        item={editVariantTarget?.item ?? null}
        variant={editVariantTarget?.variant ?? null}
        priceLists={data?.price_lists ?? []}
        attributeValues={data?.attribute_values ?? []}
        lang={lang}
        canEdit={can("inventory.item.variants")}
        isOffline={isOffline}
        onSave={handleSaveVariantOverride}
      />
    </div>
  );
}
