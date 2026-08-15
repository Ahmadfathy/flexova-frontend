import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TierPillProps {
  /** Threshold quantity of the active tier, in the tier's reference unit. */
  fromQty: number;
  unitLabel: string;
  className?: string;
}

/** Active-tier label for a cart/order line (FE_13 §3.2 — e.g. "جملة ≥ 3 كراتين"). */
export function TierPill({ fromQty, unitLabel, className }: TierPillProps) {
  const { t } = useTranslation("wholesale");
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent bg-brand-tint text-brand-text gap-1 whitespace-nowrap font-medium",
        className,
      )}
    >
      {t("tier_pill.label", { qty: fromQty, unit: unitLabel })}
    </Badge>
  );
}
