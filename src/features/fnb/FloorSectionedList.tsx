import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { ListRow } from "@/components/patterns/ListRow";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import type { FnbSection, FnbTable, TableStatus } from "@/stores/fnbFloor";
import { findFnbCheck } from "./checks";

const STATUS_PILL_VARIANT: Record<TableStatus, PillVariant> = {
  available: "inactive",
  occupied: "active",
  reserved: "pending",
  dirty: "default",
};

interface FloorSectionedListProps {
  sections: FnbSection[];
  tables: FnbTable[];
  onTapTable: (table: FnbTable) => void;
}

/** Small-screen fallback — same statuses as the canvas, stacked by section. */
export function FloorSectionedList({ sections, tables, onTapTable }: FloorSectionedListProps) {
  const { t } = useTranslation("fnb");
  const { lang } = useAppearance();

  return (
    <div className="space-y-4">
      {sections.map(section => {
        const sectionTables = tables.filter(tb => tb.section_id === section.id);
        if (sectionTables.length === 0) return null;

        return (
          <div key={section.id} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
              {lang === "ar" ? section.name_ar : section.name_en}
            </p>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {sectionTables.map(table => {
                const check = findFnbCheck(table.current_check_id);
                return (
                  <ListRow
                    key={table.id}
                    leading={<span className="text-sm font-bold tabular-nums">{table.number}</span>}
                    title={t("table.seats_count", { n: table.seats })}
                    subtitle={table.status === "reserved" && table.reserved_for ? table.reserved_for : undefined}
                    onClick={() => onTapTable(table)}
                    chevron
                    trailing={
                      <div className="flex flex-col items-end gap-1">
                        {check && (
                          <span className="tabular-nums font-semibold text-sm">
                            {formatMoney(check.totals.grand_total, lang)}
                          </span>
                        )}
                        <StatusPill variant={STATUS_PILL_VARIANT[table.status]} label={t(`table.status.${table.status}`)} />
                      </div>
                    }
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
