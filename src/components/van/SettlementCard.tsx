import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SettlementReasonOption {
  value: string;
  label: string;
}

interface SettlementCardProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  expected: number;
  actual: string;
  onActualChange: (value: string) => void;
  format: (n: number) => string;
  reasonOptions?: SettlementReasonOption[];
  reason?: string;
  onReasonChange?: (value: string) => void;
  reasonPlaceholder?: string;
  className?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** One expected/actual/variance(+reason) settlement row — reused for both the
 * per-item goods count and the single cash-declared row (FE_13 §3.5). Reason
 * is only rendered when `reasonOptions` is passed (goods rows; the cash row
 * has none per spec). */
export function SettlementCard({
  label, hint, expected, actual, onActualChange, format,
  reasonOptions, reason, onReasonChange, reasonPlaceholder, className,
}: SettlementCardProps) {
  const { t } = useTranslation("van");
  const actualNum = parseFloat(actual) || 0;
  const variance = round2(actualNum - expected);
  const hasVariance = Math.abs(variance) > 0.005;
  const needsReason = hasVariance && !!reasonOptions;
  const missingReason = needsReason && !reason;

  return (
    <div className={cn("grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2", className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {hint && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
      </div>

      <div className="text-end w-24">
        <p className="text-[10px] text-muted-foreground">{t("shift_close.expected")}</p>
        <p className="text-sm tabular-nums">{format(expected)}</p>
      </div>

      <div className="w-28">
        <p className="text-[10px] text-muted-foreground text-end">{t("shift_close.actual")}</p>
        <Input
          type="number" step="any" value={actual}
          onChange={(e) => onActualChange(e.target.value)}
          className="h-8 text-end tabular-nums"
        />
      </div>

      <div className="text-end w-24">
        <p className="text-[10px] text-muted-foreground">{t("shift_close.variance")}</p>
        <p className={cn("text-sm font-semibold tabular-nums", hasVariance ? "text-warning-text" : "text-success-text")}>
          {variance > 0 ? "+" : ""}{format(variance)}
        </p>
      </div>

      {needsReason && reasonOptions && (
        <div className="col-span-4">
          <Select value={reason ?? ""} onValueChange={onReasonChange}>
            <SelectTrigger className={cn("h-8", missingReason && "border-danger")}>
              <SelectValue placeholder={reasonPlaceholder ?? t("shift_close.reason_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {reasonOptions.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
