import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Search, ScanBarcode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { useAppearance } from "@/stores/appearance";
import { usePosRegister } from "@/stores/posRegister";
import { usePosTerminalSettings } from "@/stores/posTerminalSettings";
import { useCan } from "@/lib/permissions";
import { useCashierCatalog, type PosItem, type PosVariant } from "./useCashierCatalog";
import { ProductCard } from "./ProductCard";
import { GridDensity } from "./GridDensity";
import { VariantPickerDialog } from "./VariantPickerDialog";
import { WeightEntryDialog } from "./WeightEntryDialog";

function GridSkeleton({ density }: { density: number }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))` }}>
      {Array.from({ length: density * 2 }).map((_, i) => (
        <Skeleton key={i} className="h-[176px] rounded-lg" />
      ))}
    </div>
  );
}

export default function CashierGridPage() {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const can = useCan();

  const { items, loading, error, isOffline, reload } = useCashierCatalog();
  const category = usePosRegister(s => s.category);
  const searchQuery = usePosRegister(s => s.searchQuery);
  const setSearchQuery = usePosRegister(s => s.setSearchQuery);
  const addUnitLine = usePosRegister(s => s.addUnitLine);
  const addWeightLine = usePosRegister(s => s.addWeightLine);

  const gridDensity = usePosTerminalSettings(s => s.gridDensity);
  const setGridDensity = usePosTerminalSettings(s => s.setGridDensity);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [variantItem, setVariantItem] = useState<PosItem | null>(null);
  const [weightItem, setWeightItem] = useState<PosItem | null>(null);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const filtered = useMemo(() => {
    if (forcedNoResults && !searchQuery) return [];
    const byCategory = category === "all" ? items : items.filter(i => i.category === category);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(i =>
      i.name_ar.includes(q) ||
      i.name_en.toLowerCase().includes(q) ||
      (i.barcode ?? "").includes(q)
    );
  }, [items, category, searchQuery, forcedNoResults]);

  const resolveBarcode = (code: string): { item: PosItem; variant?: PosVariant } | null => {
    for (const item of items) {
      if (item.barcode && item.barcode === code) return { item };
      const variant = item.variants?.find(v => v.barcode === code);
      if (variant) return { item, variant };
    }
    return null;
  };

  const activate = (item: PosItem) => {
    if (!can("pos.sell")) return;
    if (item.is_model) { setVariantItem(item); return; }
    if (item.sold_by === "weight") { setWeightItem(item); return; }
    addUnitLine({
      item_id: item.item_id,
      name: lang === "ar" ? item.name_ar : item.name_en,
      price: item.price ?? 0,
      uom_id: item.uom_id,
      tax_type_id: item.tax_type_id,
      line_discount: 0,
      eta_code_missing: item.eta_code === "",
    });
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const code = searchQuery.trim();
    if (!code) return;
    const match = resolveBarcode(code);
    if (!match) return;

    const { item, variant } = match;
    if (variant) {
      addUnitLine({
        item_id: item.item_id,
        sku: variant.sku,
        name: lang === "ar" ? item.name_ar : item.name_en,
        variant_label: `${variant.size} · ${lang === "ar" ? variant.color_ar : variant.color_en}`,
        price: variant.price,
        uom_id: item.uom_id,
        tax_type_id: item.tax_type_id,
        line_discount: 0,
        eta_code_missing: item.eta_code === "",
      });
    } else if (item.sold_by === "weight") {
      setWeightItem(item);
    } else {
      addUnitLine({
        item_id: item.item_id,
        name: lang === "ar" ? item.name_ar : item.name_en,
        price: item.price ?? 0,
        uom_id: item.uom_id,
        tax_type_id: item.tax_type_id,
        line_discount: 0,
        eta_code_missing: item.eta_code === "",
      });
    }
    setSearchQuery("");
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {isOffline && <OfflineBanner message={t("grid.offline_note")} />}

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("search_placeholder")}
            className="ps-9 h-11 border-2 border-foreground/20 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <button
          type="button"
          onClick={() => searchInputRef.current?.focus()}
          aria-label={t("scanner")}
          title={t("scanner")}
          className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded border-2 border-foreground/20 bg-muted text-foreground hover:border-brand hover:bg-brand-tint hover:text-brand-text transition-colors"
        >
          <ScanBarcode className="h-4 w-4" />
        </button>

        <GridDensity value={gridDensity} onChange={setGridDensity} />
      </div>

      {loading ? (
        <GridSkeleton density={gridDensity} />
      ) : error ? (
        <ErrorState title={t("grid.error_title")} description={t("grid.error_body")} onRetry={reload} />
      ) : filtered.length === 0 ? (
        (searchQuery.trim() || forcedNoResults) ? (
          <EmptyState
            title={t("grid.no_results_title", { query: searchQuery || "—" })}
            description={t("grid.no_results_body")}
          />
        ) : (
          <EmptyState title={t("grid.empty_category_title")} description={t("grid.empty_category_body")} />
        )
      ) : (
        <div
          className="grid gap-3 overflow-auto"
          style={{ gridTemplateColumns: `repeat(${gridDensity}, minmax(0, 1fr))` }}
        >
          {filtered.map(item => (
            <ProductCard key={item.item_id} item={item} onActivate={activate} />
          ))}
        </div>
      )}

      <VariantPickerDialog
        item={variantItem}
        open={!!variantItem}
        onOpenChange={(o) => !o && setVariantItem(null)}
        onPick={(variant) => {
          if (!variantItem) return;
          addUnitLine({
            item_id: variantItem.item_id,
            sku: variant.sku,
            name: lang === "ar" ? variantItem.name_ar : variantItem.name_en,
            variant_label: `${variant.size} · ${lang === "ar" ? variant.color_ar : variant.color_en}`,
            price: variant.price,
            uom_id: variantItem.uom_id,
            tax_type_id: variantItem.tax_type_id,
            line_discount: 0,
            eta_code_missing: variantItem.eta_code === "",
          });
          setVariantItem(null);
        }}
      />

      <WeightEntryDialog
        item={weightItem}
        open={!!weightItem}
        onOpenChange={(o) => !o && setWeightItem(null)}
        onConfirm={(weightKg) => {
          if (!weightItem) return;
          addWeightLine({
            item_id: weightItem.item_id,
            name: lang === "ar" ? weightItem.name_ar : weightItem.name_en,
            price: weightItem.price_per_kg ?? 0,
            uom_id: weightItem.uom_id,
            tax_type_id: weightItem.tax_type_id,
            line_discount: 0,
            eta_code_missing: weightItem.eta_code === "",
          }, weightKg);
        }}
      />
    </div>
  );
}
