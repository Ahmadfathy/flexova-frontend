import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { formatMoney } from "@/lib/format";
import type { PriceListLine } from "@/types/wholesale";
import type { ResolvedPrice } from "@/lib/wholesale/pricing";

interface TierPanelProps {
  line: PriceListLine;
  resolved: ResolvedPrice;
  /** Current line qty, in the selling unit (`uomId`). */
  qty: number;
  unitLabel: string;
  /** Label for `line.tier_uom` — may differ from the selling unit. */
  tierUnitLabel: string;
  className?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Side panel for the focused order line (FE_13 §5) — lists all tiers for the item in
 * the customer's price list, highlights the active one, and shows the upsell delta
 * ("زوّد 4 → 42 ج.م/قطعة، توفير 380 ج.م").
 */
export function TierPanel({ line, resolved, qty, unitLabel, tierUnitLabel, className }: TierPanelProps) {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const sortedTiers = [...line.tiers].sort((a, b) => a.from_qty - b.from_qty);

  const nextTier = resolved.nextTier;
  const savings = nextTier
    ? Math.max(0, round2((resolved.price - nextTier.price) * (qty + nextTier.qtyToReachSelling)))
    : 0;

  return (
    <div className={cn("rounded border border-border bg-card p-3 space-y-3", className)}>
      <p className="text-xs font-semibold text-muted-foreground">{t("tier_panel.title")}</p>

      <ul className="space-y-1.5">
        {sortedTiers.map((tier) => {
          const active = tier.id === resolved.tierId;
          const priceLabel = tier.mode === "price"
            ? formatMoney(tier.value, lang)
            : t("tier_panel.discount_value", { pct: tier.value });
          return (
            <li
              key={tier.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm",
                active ? "bg-brand-tint text-brand-text font-medium" : "text-foreground",
              )}
            >
              <span>
                {tier.to_qty == null
                  ? t("tier_panel.range_open", { from: tier.from_qty, unit: tierUnitLabel })
                  : t("tier_panel.range", { from: tier.from_qty, to: tier.to_qty, unit: tierUnitLabel })}
              </span>
              <span className="tabular-nums">{priceLabel}</span>
            </li>
          );
        })}
      </ul>

      {nextTier && nextTier.qtyToReachSelling > 0 && (
        <p className="text-xs text-brand-text bg-brand-tint rounded px-2 py-1.5">
          {t("tier_panel.upsell", {
            qty: nextTier.qtyToReachSelling,
            unit: unitLabel,
            price: formatMoney(nextTier.price, lang),
            savings: formatMoney(savings, lang),
          })}
        </p>
      )}
    </div>
  );
}
