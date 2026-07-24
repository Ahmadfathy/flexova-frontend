import { useTranslation } from "react-i18next";

import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { isFlagEnabled } from "@/lib/flags";
import { getItems, getScrapReasons } from "@/lib/mock/mfg";
import { getEmployees } from "@/lib/mock/hr";
import type { ManufacturingOrder } from "@/types/mfg";

interface CostTabProps {
  mo: ManufacturingOrder;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground whitespace-nowrap">{children}</th>;
}

/** FE_14 §7.4 — breakdown + per-movement drill-down ("visible trust"). */
export function CostTab({ mo }: CostTabProps) {
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();

  const items = getItems();
  const employees = isFlagEnabled("hr") ? getEmployees() : [];
  const scrapReasons = getScrapReasons();

  function itemName(id: string) {
    const item = items.find((i) => i.id === id);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : id;
  }
  function employeeName(id: string | null) {
    if (!id) return t("mo.labor_manual_cost");
    const emp = employees.find((e) => e.id === id);
    return emp ? (lang === "ar" ? emp.name_ar : emp.name_en) : id;
  }
  function stageName(id?: string) {
    if (!id) return "—";
    return mo.stages.find((s) => s.id === id)?.name_ar ?? id;
  }
  function reasonName(id: string) {
    const r = scrapReasons.find((r) => r.id === id);
    return r ? (lang === "ar" ? r.name_ar : r.name_en) : id;
  }

  const issueLines = mo.material_issues.flatMap((mi) =>
    mi.lines.map((l) => ({ key: `${mi.id}_${l.item_id}`, type: mi.type, stage_id: mi.stage_id, ...l }))
  );

  const noMovements = issueLines.length === 0 && mo.labor_entries.length === 0 && mo.scrap.length === 0 && mo.finished_receipts.length === 0;

  return (
    <div className="space-y-4">
      {/* Breakdown */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium mb-3">{t("mo.cost_breakdown_title")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t("mo.materials")}</p>
            <p className="text-sm font-medium tabular-nums">{formatMoney(mo.cost_summary.materials, lang)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("mo.labor")}</p>
            <p className="text-sm font-medium tabular-nums">{formatMoney(mo.cost_summary.labor, lang)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("mo.overhead")}</p>
            <p className="text-sm font-medium tabular-nums">{formatMoney(mo.cost_summary.overhead, lang)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("mo.scrap_effect")}</p>
            <p className="text-sm font-medium tabular-nums">{formatMoney(mo.cost_summary.scrap_effect, lang)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("mo.unit_cost")}</p>
            <p className="text-sm font-semibold tabular-nums">{formatMoney(mo.cost_summary.unit_cost, lang)}</p>
          </div>
        </div>
      </div>

      {/* Movements drill-down */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-sm font-medium">{t("mo.cost_movements_title")}</p>

        {noMovements && <p className="text-sm text-muted-foreground">{t("mo.movement_empty")}</p>}

        {issueLines.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("mo.movement_issue")}</p>
            <div className="rounded border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <Th>{t("mo.bom_col_item")}</Th>
                    <Th>{t("mo.col_stage")}</Th>
                    <Th>{t("mo.col_qty")}</Th>
                    <Th>{t("mo.col_unit_cost")}</Th>
                    <Th>{t("mo.col_subtotal")}</Th>
                    <Th>{""}</Th>
                  </tr>
                </thead>
                <tbody>
                  {issueLines.map((l) => (
                    <tr key={l.key} className="border-t border-border">
                      <td className="px-3 py-2">{itemName(l.item_id)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{stageName(l.stage_id)}</td>
                      <td className="px-3 py-2 tabular-nums">{l.qty}</td>
                      <td className="px-3 py-2 tabular-nums">{formatMoney(l.unit_cost, lang)}</td>
                      <td className="px-3 py-2 tabular-nums font-medium">{formatMoney(l.qty * l.unit_cost, lang)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {l.type === "manual" ? t("mo.movement_type_manual")
                          : l.type === "reversal" ? t("mo.movement_type_reversal")
                          : t("mo.movement_type_backflush")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {mo.labor_entries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("mo.movement_labor")}</p>
            <div className="rounded border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <Th>{t("mo.labor_employee")}</Th>
                    <Th>{t("mo.col_stage")}</Th>
                    <Th>{t("mo.labor_hours")}</Th>
                    <Th>{t("mo.labor_cost")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {mo.labor_entries.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-3 py-2">{employeeName(l.employee_id)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{stageName(l.stage_id)}</td>
                      <td className="px-3 py-2 tabular-nums">{l.hours}</td>
                      <td className="px-3 py-2 tabular-nums font-medium">{formatMoney(l.cost, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {mo.scrap.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("mo.movement_scrap")}</p>
            <div className="rounded border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <Th>{t("mo.bom_col_item")}</Th>
                    <Th>{t("mo.col_stage")}</Th>
                    <Th>{t("mo.col_qty")}</Th>
                    <Th>{t("mo.col_reason")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {mo.scrap.map((sc) => (
                    <tr key={sc.id} className="border-t border-border">
                      <td className="px-3 py-2">{itemName(sc.item_id)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{stageName(sc.stage_id)}</td>
                      <td className="px-3 py-2 tabular-nums">{sc.qty}</td>
                      <td className="px-3 py-2 text-muted-foreground">{reasonName(sc.reason_id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {mo.finished_receipts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("mo.movement_receipt")}</p>
            <div className="rounded border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <Th>{t("mo.col_date")}</Th>
                    <Th>{t("mo.col_qty")}</Th>
                    <Th>{t("mo.col_unit_cost")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {mo.finished_receipts.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDate(r.date)}</td>
                      <td className="px-3 py-2 tabular-nums">{r.qty_good}</td>
                      <td className="px-3 py-2 tabular-nums font-medium">{formatMoney(r.unit_cost, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
