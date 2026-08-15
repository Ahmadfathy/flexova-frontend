import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { FormField, FormActions } from "@/components/patterns/FormLayout";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import type { CostBudgetBreakdown } from "@/features/construction/types";

interface CostBudgetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseLabel: string;
  phaseEstimatedCost: number;
  breakdown?: CostBudgetBreakdown;
  onSave: (breakdown: CostBudgetBreakdown | undefined) => void;
}

export function CostBudgetDrawer({ open, onOpenChange, phaseLabel, phaseEstimatedCost, breakdown, onSave }: CostBudgetDrawerProps) {
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();

  const [materials, setMaterials] = useState("");
  const [labor, setLabor] = useState("");
  const [subcontract, setSubcontract] = useState("");
  const [other, setOther] = useState("");

  useEffect(() => {
    if (!open) return;
    setMaterials(breakdown?.materials != null ? String(breakdown.materials) : "");
    setLabor(breakdown?.labor != null ? String(breakdown.labor) : "");
    setSubcontract(breakdown?.subcontract != null ? String(breakdown.subcontract) : "");
    setOther(breakdown?.other != null ? String(breakdown.other) : "");
  }, [open, breakdown]);

  const total = (Number(materials) || 0) + (Number(labor) || 0) + (Number(subcontract) || 0) + (Number(other) || 0);
  const allBlank = !materials && !labor && !subcontract && !other;

  function handleSave() {
    if (allBlank) {
      onSave(undefined);
    } else {
      onSave({
        materials: Number(materials) || 0,
        labor: Number(labor) || 0,
        subcontract: Number(subcontract) || 0,
        other: Number(other) || 0,
      });
    }
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("cost_budget.title")}
      description={phaseLabel}
      footer={<FormActions onCancel={() => onOpenChange(false)} onSave={handleSave} />}
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("cost_budget.hint")}</p>

        <div className="rounded border border-border p-3 bg-muted/20 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("boq.est_cost")}</span>
          <span className="text-sm font-semibold tabular-nums">{formatMoney(phaseEstimatedCost, lang)}</span>
        </div>

        <FormField label={t("profit.materials")} htmlFor="cb-materials">
          <Input id="cb-materials" type="number" value={materials} onChange={(e) => setMaterials(e.target.value)} className="tabular-nums" />
        </FormField>
        <FormField label={t("profit.labor")} htmlFor="cb-labor">
          <Input id="cb-labor" type="number" value={labor} onChange={(e) => setLabor(e.target.value)} className="tabular-nums" />
        </FormField>
        <FormField label={t("profit.subcontract")} htmlFor="cb-subcontract">
          <Input id="cb-subcontract" type="number" value={subcontract} onChange={(e) => setSubcontract(e.target.value)} className="tabular-nums" />
        </FormField>
        <FormField label={t("cost_budget.other")} htmlFor="cb-other">
          <Input id="cb-other" type="number" value={other} onChange={(e) => setOther(e.target.value)} className="tabular-nums" />
        </FormField>

        {!allBlank && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">{t("boq.phase_totals")}</span>
            <span className="text-sm font-semibold tabular-nums">{formatMoney(total, lang)}</span>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
