import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { findMenuItem, modifierLabels } from "./menu";
import { lineNet } from "./billTotals";
import type { FnbCheckLine } from "@/stores/fnbOrder";

interface BillAssignmentMatrixProps {
  lines: FnbCheckLine[];
  groupCount: number;
  /** lineId → 1-based group indices sharing that line (a line can be ticked into more than one group, split evenly). */
  assignments: Record<string, number[]>;
  onToggle: (lineId: string, groupIndex: number) => void;
  /** "group" for by-item, "seat" for by-seat — only changes the pill labels. */
  unitLabel: "group" | "seat";
}

export function BillAssignmentMatrix({ lines, groupCount, assignments, onToggle, unitLabel }: BillAssignmentMatrixProps) {
  const { t } = useTranslation("fnb");
  const { lang } = useAppearance();
  const groupIndexes = Array.from({ length: groupCount }, (_, i) => i + 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground ps-1">
        <span className="flex-1">{t("bill.split.assign_hint")}</span>
      </div>
      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
        {lines.map(line => {
          const item = findMenuItem(line.item_id);
          const name = item ? (lang === "ar" ? item.name_ar : item.name_en) : line.name;
          const mods = modifierLabels(line.modifiers, lang);
          const assigned = assignments[line.id] ?? [];
          return (
            <div key={line.id} className="flex flex-wrap items-center gap-2 p-2.5 bg-card">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {line.qty}× {name}
                </p>
                {mods.length > 0 && <p className="text-xs text-muted-foreground truncate">{mods.join(" · ")}</p>}
                <p className="text-xs tabular-nums text-muted-foreground">{formatMoney(lineNet(line), lang)}</p>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {groupIndexes.map(i => {
                  const active = assigned.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onToggle(line.id, i)}
                      className={cn(
                        "h-9 min-w-9 px-2 rounded-full border text-xs font-semibold tabular-nums transition-colors",
                        active
                          ? "border-brand bg-brand text-on-brand"
                          : "border-border text-muted-foreground hover:border-brand/40"
                      )}
                      aria-pressed={active}
                    >
                      {t(`bill.split.${unitLabel}_label`, { n: i })}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
