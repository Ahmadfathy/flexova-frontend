import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { formatMoney } from "@/lib/format";
import type { NextTierHint } from "@/lib/wholesale/pricing";

interface TierHintBannerProps {
  /** Current line qty, in the selling unit. */
  currentQty: number;
  nextTier: NextTierHint | undefined;
  unitLabel: string;
  onApply: (newQty: number) => void;
  className?: string;
}

/**
 * In-cart upsell nudge (FE_13 §3.2) — only renders when the gap to the next tier
 * is within 25% of the qty that would land on that tier ("زوّد 4 قطع توصل لسعر 42 ج.م").
 */
export function TierHintBanner({ currentQty, nextTier, unitLabel, onApply, className }: TierHintBannerProps) {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();

  if (!nextTier || nextTier.qtyToReachSelling <= 0) return null;

  const targetQty = currentQty + nextTier.qtyToReachSelling;
  const withinRange = nextTier.qtyToReachSelling <= targetQty * 0.25;
  if (!withinRange) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded border border-brand/30 bg-brand-tint px-3 py-2 text-sm text-brand-text",
        className,
      )}
    >
      <span className="flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4 shrink-0" />
        {t("tier_hint.banner", {
          qty: nextTier.qtyToReachSelling,
          unit: unitLabel,
          price: formatMoney(nextTier.price, lang),
        })}
      </span>
      <Button size="sm" variant="solid" tone="primary" onClick={() => onApply(targetQty)}>
        {t("tier_hint.apply")}
      </Button>
    </div>
  );
}
