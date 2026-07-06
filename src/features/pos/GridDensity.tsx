import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { GRID_DENSITY_MIN, GRID_DENSITY_MAX } from "@/stores/posTerminalSettings";

interface GridDensityProps {
  value: number;
  onChange: (n: number) => void;
}

/** Stepper (4–12 columns) — drives the product grid's CSS column count; persisted per-terminal. */
export function GridDensity({ value, onChange }: GridDensityProps) {
  const { t } = useTranslation("pos");

  return (
    <div className="inline-flex items-center gap-1.5 shrink-0" role="group" aria-label={t("density")}>
      <span className="hidden lg:inline text-xs text-muted-foreground whitespace-nowrap">{t("density")}</span>
      <div className="inline-flex items-center rounded border-2 border-foreground/20 bg-card overflow-hidden shrink-0">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= GRID_DENSITY_MIN}
          aria-label={t("density_decrease")}
          title={t("density_decrease")}
          className="h-11 w-11 inline-flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span
          className="h-11 min-w-[2.75rem] px-1 inline-flex items-center justify-center text-sm font-semibold tabular-nums border-x-2 border-foreground/20 shrink-0"
          title={t("density_cols", { n: value })}
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= GRID_DENSITY_MAX}
          aria-label={t("density_increase")}
          title={t("density_increase")}
          className="h-11 w-11 inline-flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
