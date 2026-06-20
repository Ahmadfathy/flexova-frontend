import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

// Icons
import {
  Plus, Upload, Download, MoreVertical, Package, X,
  SlidersHorizontal, Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Printer,
} from "lucide-react";

// Lib
import { formatMoney, formatNumber } from "@/lib/format";
import { cn }             from "@/lib/utils";
import { useCan }         from "@/lib/permissions";
import { useItems }       from "./useItems";
import { QuickAddModal }  from "./QuickAddModal";
import type { InventoryItem, InventoryCategory, InventoryWarehouse, InventoryUom, ItemStatus, ItemFilters } from "./types";

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

const STATUS_VARIANT: Record<ItemStatus, "paid" | "credit" | "default"> = {
  active:      "paid",
  suspended:   "default",
  incomplete:  "credit",
  "low-stock": "credit",
};

const DEFAULT_FILTERS: ItemFilters = {
  category: "", warehouse: "", item_type: "",
  status: "", low_stock: false, price_min: "", price_max: "",
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
      <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-muted text-muted-foreground">
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

/* ─── Row actions (shared between table + card) ─────────────── */

function RowActions({
  item,
  can,
  t,
  onNavigate,
}: {
  item: InventoryItem;
  can: (p: string) => boolean;
  t: ReturnType<typeof useTranslation>["t"];
  onNavigate: (to: string) => void;
}) {
  const status   = getEffectiveStatus(item);
  const isActive = status === "active" || status === "low-stock";

  return (
    <>
      {can("inventory.item.edit") && (
        <DropdownMenuItem onClick={() => onNavigate(`/inventory/items/${item.id}`)}>
          {t("actions.edit")}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => {}}>{t("actions.ledger")}</DropdownMenuItem>
      {can("inventory.item.create") && (
        <DropdownMenuItem onClick={() => {}}>{t("actions.duplicate")}</DropdownMenuItem>
      )}
      {can("inventory.item.suspend") && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => {}}>
            {isActive ? t("actions.suspend") : t("actions.activate")}
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuItem onClick={() => {}}>{t("actions.print_barcode")}</DropdownMenuItem>
      {can("inventory.item.delete") && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {}}
          >
            {t("actions.delete")}
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}

/* ─── Mobile ItemCard ───────────────────────────────────────── */

function ItemCard({
  item, selected, onToggle, lang, categoryMap, uomMap, can, t, onNavigate,
}: {
  item: InventoryItem;
  selected: boolean;
  onToggle: (v: boolean) => void;
  lang: "ar" | "en";
  categoryMap: Record<string, InventoryCategory>;
  uomMap: Record<string, InventoryUom>;
  can: (p: string) => boolean;
  t: ReturnType<typeof useTranslation>["t"];
  onNavigate: (to: string) => void;
}) {
  const status  = getEffectiveStatus(item);
  const balance = getTotalBalance(item);
  const price   = getRetailPrice(item);
  const cat     = categoryMap[item.category_id];
  const uom     = uomMap[item.base_uom_id];

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border border-border bg-card cursor-pointer transition-colors hover:bg-muted/40",
        selected && "bg-muted/50 border-primary/40"
      )}
      onClick={() => onNavigate(`/inventory/items/${item.id}`)}
    >
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
            <p className="text-xs text-muted-foreground tabular-nums">{item.code}</p>
          </div>
          <StatusPill
            variant={STATUS_VARIANT[status]}
            label={t(`status.${status.replace("-", "_")}`)}
            className="shrink-0 text-xs"
          />
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
          <span className="text-sm tabular-nums">{formatMoney(price, lang)}</span>
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
        <DropdownMenuContent align="end">
          <RowActions item={item} can={can} t={t} onNavigate={onNavigate} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ─── BulkBar ───────────────────────────────────────────────── */

function BulkBar({
  count, can, t, onClear,
}: {
  count: number;
  can: (p: string) => boolean;
  t: ReturnType<typeof useTranslation>["t"];
  onClear: () => void;
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
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => {}}>
              {t("actions.bulk_activate")}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => {}}>
              {t("actions.bulk_suspend")}
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => {}}>
          {t("actions.print_barcode")}
        </Button>
        {can("inventory.item.export") && (
          <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => {}}>
            {t("actions.export_selected")}
          </Button>
        )}
        {can("inventory.item.delete") && (
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs rounded-full px-3 text-destructive hover:text-destructive"
            onClick={() => {}}
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
  t,
  lang,
}: {
  filters: ItemFilters;
  setFilters: React.Dispatch<React.SetStateAction<ItemFilters>>;
  categories: InventoryCategory[];
  warehouses: InventoryWarehouse[];
  t: ReturnType<typeof useTranslation>["t"];
  lang: "ar" | "en";
}) {
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
  const navigate       = useNavigate();
  const can            = useCan();

  const { data, loading, error, isOffline, reload } = useItems();

  const [quickAddOpen, setQuickAddOpen]   = useState(false);
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebounced]   = useState("");
  const [filters, setFilters]             = useState<ItemFilters>(DEFAULT_FILTERS);
  const [sorting, setSorting]             = useState<SortingState>([]);
  const [rowSelection, setRowSelection]   = useState<RowSelectionState>({});

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
          it.barcodes.some((b) => b.includes(q))
      );
    }
    if (filters.category)
      items = items.filter((it) => it.category_id === filters.category);

    if (filters.warehouse)
      items = items.filter(
        (it) =>
          it.item_type === "service" ||
          it.balances.some((b) => b.warehouse_id === filters.warehouse)
      );

    if (filters.item_type)
      items = items.filter((it) => it.item_type === filters.item_type);

    if (filters.status)
      items = items.filter((it) => getEffectiveStatus(it) === filters.status);

    if (filters.low_stock)
      items = items.filter((it) => {
        const bal = getTotalBalance(it);
        return bal !== null && it.reorder_level !== null && bal <= it.reorder_level;
      });

    if (filters.price_min) {
      const min = parseFloat(filters.price_min);
      if (!isNaN(min)) items = items.filter((it) => getRetailPrice(it) >= min);
    }
    if (filters.price_max) {
      const max = parseFloat(filters.price_max);
      if (!isNaN(max)) items = items.filter((it) => getRetailPrice(it) <= max);
    }

    return items;
  }, [data, debouncedSearch, filters]);

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

  // TanStack Table columns
  const columns = useMemo(() => [
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

    // Code
    colHelper.accessor("code", {
      header: t("columns.code"),
      enableSorting: true,
      sortingFn: "alphanumeric",
      cell: ({ getValue }) => (
        <span className="tabular-nums text-xs font-mono">{getValue()}</span>
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

    // Balance
    colHelper.accessor(
      (row) => getTotalBalance(row) ?? -Infinity,
      {
        id: "balance",
        header: t("columns.balance"),
        enableSorting: true,
        sortingFn: "basic",
        cell: ({ row }) => {
          const bal = getTotalBalance(row.original);
          return bal === null
            ? <span className="text-muted-foreground">—</span>
            : <span className="tabular-nums">{formatNumber(bal)}</span>;
        },
      }
    ),

    // Sale price
    colHelper.accessor(
      (row) => getRetailPrice(row),
      {
        id: "sale_price",
        header: t("columns.price"),
        enableSorting: true,
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(getRetailPrice(row.original), lang)}</span>
        ),
      }
    ),

    // Status
    colHelper.display({
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => {
        const st = getEffectiveStatus(row.original);
        return (
          <StatusPill
            variant={STATUS_VARIANT[st]}
            label={t(`status.${st.replace("-", "_")}`)}
          />
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
          <DropdownMenuContent align="end">
            <RowActions item={row.original} can={can} t={t} onNavigate={navigate} />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, lang, categoryMap, uomMap, can, navigate]);

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
        <Button size="sm" onClick={() => setQuickAddOpen(true)}>
          <Plus className="h-4 w-4 me-1.5" />
          {t("items.new")}
        </Button>
      )}
      {can("inventory.item.import") && (
        <Button variant="outline" size="sm">
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
      {/* ── Offline banner ── */}
      {isOffline && <OfflineBanner message={t("offline.banner")} />}

      {/* ── Page header ── */}
      <PageHeader
        title={t("items.title")}
        subtitle={
          data && totalCount > 0
            ? t("items.count", { n: formatNumber(totalCount) })
            : undefined
        }
        actions={pageActions}
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
                  ? { label: t("items.new"), onClick: () => setQuickAddOpen(true) }
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
                              isNumeric && "text-end",
                              isSortable && "cursor-pointer hover:text-foreground",
                              isHiddenOnMd && "hidden lg:table-cell",
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
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className="cursor-pointer border-b border-border last:border-0"
                      onClick={() => navigate(`/inventory/items/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isNumeric  = ["balance", "sale_price"].includes(cell.column.id);
                        const isHiddenMd = ["category", "unit"].includes(cell.column.id);

                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "px-3 py-2.5 align-middle",
                              isNumeric && "text-end tabular-nums",
                              isHiddenMd && "hidden lg:table-cell",
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
                  ))}
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
                  onNavigate={navigate}
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
        <BulkBar count={selectedCount} can={can} t={t} onClear={clearSelection} />
      )}

      {/* ── Quick-add item modal ─────────────────────────────── */}
      <QuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        data={data}
      />
    </div>
  );
}
