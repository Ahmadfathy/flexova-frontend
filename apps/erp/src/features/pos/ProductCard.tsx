import { useTranslation } from "react-i18next";
import { Plus, Check, Flag, Layers, Scale } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { usePosRegister, cartQtyForItem, cartWeightForItem } from "@/stores/posRegister";
import { getCategoryIcon } from "./categoryIcons";
import type { PosItem } from "./useCashierCatalog";

interface ProductCardProps {
  item: PosItem;
  onActivate: (item: PosItem) => void;
}

export function ProductCard({ item, onActivate }: ProductCardProps) {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const lines = usePosRegister(s => s.lines);

  const Icon = getCategoryIcon(item.category);
  const isModel = !!item.is_model;
  const soldByWeight = item.sold_by === "weight";
  const etaMissing = item.eta_code === "";
  const oos = !isModel && !soldByWeight && (item.stock ?? 1) <= 0;

  const qty = isModel || !soldByWeight ? cartQtyForItem(lines, item.item_id) : 0;
  const weightInCart = soldByWeight ? cartWeightForItem(lines, item.item_id) : null;
  const inCart = soldByWeight ? weightInCart != null : qty > 0;

  const name = lang === "ar" ? item.name_ar : item.name_en;
  const hint = item.barcode
    ? item.barcode
    : isModel
      ? `${item.variants?.length ?? 0} ${lang === "ar" ? "مقاس/لون" : "variants"}`
      : soldByWeight
        ? t("weight.per_kg")
        : "";

  const priceLabel = soldByWeight
    ? `${formatMoney(item.price_per_kg ?? 0, lang)}/${lang === "ar" ? "كجم" : "kg"}`
    : formatMoney(item.price ?? item.variants?.[0]?.price ?? 0, lang);

  return (
    <button
      type="button"
      onClick={() => onActivate(item)}
      className="group relative flex h-[176px] w-full flex-col overflow-hidden rounded-lg border border-border bg-card p-2 text-start transition-colors hover:border-brand/40 hover:shadow-sm"
    >
      {/* Top — fixed-height image/fallback area (category icon; no image dependency) */}
      <div className="relative h-14 w-full shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
        <Icon className="h-6 w-6 text-muted-foreground" />
        {oos && (
          <span className="absolute inset-x-0 bottom-0 bg-danger-tint text-danger-text text-[9px] font-semibold text-center py-0.5">
            {t("grid.oos")}
          </span>
        )}
      </div>

      {/* Badges — fixed-height slot, reserved even when empty so names line up across cards */}
      <div className="flex h-4 shrink-0 items-center gap-1 mt-1 overflow-hidden">
        {isModel && (
          <span className="inline-flex items-center gap-0.5 rounded bg-brand-tint text-brand-text text-[10px] font-medium px-1 py-0.5 shrink-0">
            <Layers className="h-2.5 w-2.5" /> ▾
          </span>
        )}
        {soldByWeight && (
          <span className="inline-flex items-center gap-0.5 rounded bg-info-tint text-brand-text text-[10px] font-medium px-1 py-0.5 shrink-0">
            <Scale className="h-2.5 w-2.5" />
          </span>
        )}
        {etaMissing && (
          <span
            title={t("grid.no_eta_code_hint")}
            className="inline-flex items-center gap-0.5 rounded bg-warning-tint text-warning-text text-[10px] font-medium px-1 py-0.5 shrink-0"
          >
            <Flag className="h-2.5 w-2.5" />
          </span>
        )}
      </div>

      {/* Middle — name + SKU/hint, clipped, flexible */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{name}</p>
        {hint && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{hint}</p>}
      </div>

      {/* Bottom — price · action, pinned to the bottom, fixed height */}
      <div className="mt-auto flex shrink-0 items-center justify-between gap-1 pt-1.5">
        <span className="min-w-0 flex-1 text-sm font-bold tabular-nums text-foreground truncate">{priceLabel}</span>

        {inCart ? (
          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center gap-0.5 rounded-full bg-brand px-1.5 text-[11px] font-bold tabular-nums text-on-brand">
            <Check className="h-3 w-3" />
            {soldByWeight ? `${weightInCart}` : qty}
          </span>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-brand-tint group-hover:text-brand-text">
            <Plus className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </button>
  );
}
