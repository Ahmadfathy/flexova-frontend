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
      className="group flex flex-col rounded-lg border border-border bg-card p-2 text-start hover:border-brand/40 hover:shadow-sm transition-colors min-h-[168px]"
    >
      {/* Fallback art — category icon (no image dependency) */}
      <div className="relative aspect-square w-full rounded-md bg-muted flex items-center justify-center mb-2 overflow-hidden shrink-0">
        <Icon className="h-8 w-8 text-muted-foreground" />
        {oos && (
          <span className="absolute inset-x-0 bottom-0 bg-danger-tint text-danger-text text-[10px] font-semibold text-center py-0.5">
            {t("grid.oos")}
          </span>
        )}
      </div>

      {/* Badges */}
      {(isModel || soldByWeight || etaMissing) && (
        <div className="flex items-center gap-1 mb-1 flex-wrap">
          {isModel && (
            <span className="inline-flex items-center gap-0.5 rounded bg-brand-tint text-brand-text text-[10px] font-medium px-1.5 py-0.5">
              <Layers className="h-2.5 w-2.5" /> ▾
            </span>
          )}
          {soldByWeight && (
            <span className="inline-flex items-center gap-0.5 rounded bg-info-tint text-brand-text text-[10px] font-medium px-1.5 py-0.5">
              <Scale className="h-2.5 w-2.5" />
            </span>
          )}
          {etaMissing && (
            <span
              title={t("grid.no_eta_code_hint")}
              className="inline-flex items-center gap-0.5 rounded bg-warning-tint text-warning-text text-[10px] font-medium px-1.5 py-0.5"
            >
              <Flag className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      )}

      <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight min-h-[2.2em]">{name}</p>
      {hint && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{hint}</p>}

      <div className="mt-auto pt-1.5 flex items-center justify-between gap-1">
        <span className="min-w-0 flex-1 text-sm font-bold tabular-nums text-foreground truncate">{priceLabel}</span>

        {inCart ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-brand text-on-brand text-[11px] font-bold h-6 min-w-6 px-1.5 justify-center shrink-0 tabular-nums">
            <Check className="h-3 w-3" />
            {soldByWeight ? `${weightInCart}` : qty}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-foreground shrink-0 group-hover:bg-brand-tint group-hover:text-brand-text transition-colors">
            <Plus className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </button>
  );
}
