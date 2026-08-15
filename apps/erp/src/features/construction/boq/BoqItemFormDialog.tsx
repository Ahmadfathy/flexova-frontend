import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField, FormGrid, FormActions } from "@/components/patterns/FormLayout";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import type { BoqItem } from "@/features/construction/types";
import type { BoqItemFormInput } from "@/stores/constructionStore";

interface BoqItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseRef: string;
  /** null = creating a new item */
  item: BoqItem | null;
  defaultSection?: string;
  onSave: (input: BoqItemFormInput) => void;
}

const EMPTY = { code: "", section_header_ar: "", description_ar: "", unit_ar: "", estimated_qty: "", unit_price: "", estimated_unit_cost: "" };

export function BoqItemFormDialog({ open, onOpenChange, phaseRef, item, defaultSection, onSave }: BoqItemFormDialogProps) {
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();

  const [code, setCode] = useState("");
  const [section, setSection] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [unitAr, setUnitAr] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setCode(item.code);
      setSection(item.section_header_ar ?? "");
      setDescriptionAr(item.description_ar);
      setUnitAr(item.unit_ar);
      setQty(String(item.estimated_qty));
      setPrice(String(item.unit_price));
      setCost(String(item.estimated_unit_cost));
    } else {
      setCode(EMPTY.code);
      setSection(defaultSection ?? EMPTY.section_header_ar);
      setDescriptionAr(EMPTY.description_ar);
      setUnitAr(EMPTY.unit_ar);
      setQty(EMPTY.estimated_qty);
      setPrice(EMPTY.unit_price);
      setCost(EMPTY.estimated_unit_cost);
    }
    setAttempted(false);
  }, [open, item, defaultSection]);

  const qtyNum = Number(qty) || 0;
  const priceNum = Number(price) || 0;
  const costNum = Number(cost) || 0;
  const value = useMemo(() => Math.round(qtyNum * priceNum * 100) / 100, [qtyNum, priceNum]);
  const estCost = useMemo(() => Math.round(qtyNum * costNum * 100) / 100, [qtyNum, costNum]);
  const margin = useMemo(() => Math.round((value - estCost) * 100) / 100, [value, estCost]);

  const descriptionError = attempted && !descriptionAr.trim() ? t("boq.description") : undefined;
  const zeroWarn = qtyNum === 0 || priceNum === 0;
  const overCostWarn = costNum > priceNum && priceNum > 0;

  function handleSave() {
    setAttempted(true);
    if (!descriptionAr.trim() || !unitAr.trim()) return;
    onSave({
      phase_ref: phaseRef,
      code: code.trim(),
      section_header_ar: section.trim(),
      description_ar: descriptionAr.trim(),
      unit_ar: unitAr.trim(),
      estimated_qty: qtyNum,
      unit_price: priceNum,
      estimated_unit_cost: costNum,
    });
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={item ? t("boq.edit_item") : t("boq.add_item")}
      size="md"
      footer={
        <FormActions onCancel={() => onOpenChange(false)} onSave={handleSave} />
      }
    >
      <div className="space-y-4">
        <FormGrid cols={2}>
          <FormField label={t("boq.code")} htmlFor="boq-code">
            <Input id="boq-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("boq.code_placeholder")} />
          </FormField>
          <FormField label={t("boq.section")} htmlFor="boq-section">
            <Input id="boq-section" value={section} onChange={(e) => setSection(e.target.value)} placeholder={t("boq.section_placeholder")} />
          </FormField>
        </FormGrid>

        <FormField label={t("boq.description")} htmlFor="boq-desc" required error={descriptionError}>
          <Input id="boq-desc" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
        </FormField>

        <FormGrid cols={2}>
          <FormField label={t("boq.unit")} htmlFor="boq-unit" required>
            <Input id="boq-unit" value={unitAr} onChange={(e) => setUnitAr(e.target.value)} placeholder="م² / م.ط / عدد / م³ / مقطوعية" />
          </FormField>
          <FormField label={t("boq.qty")} htmlFor="boq-qty">
            <Input id="boq-qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="tabular-nums" />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label={t("boq.unit_price")} htmlFor="boq-price">
            <Input id="boq-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="tabular-nums" />
          </FormField>
          <FormField label={t("boq.est_cost")} htmlFor="boq-cost">
            <Input id="boq-cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="tabular-nums" />
          </FormField>
        </FormGrid>

        <div className="rounded border border-border p-3 grid grid-cols-2 gap-3 bg-muted/20">
          <div>
            <p className="text-xs text-muted-foreground">{t("boq.value")}</p>
            <p className="text-sm font-semibold tabular-nums">{formatMoney(value, lang)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("boq.margin")}</p>
            <p className={`text-sm font-semibold tabular-nums ${margin < 0 ? "text-danger-text" : "text-success-text"}`}>
              {formatMoney(margin, lang)}
            </p>
          </div>
        </div>

        {(zeroWarn || overCostWarn) && (
          <div className="flex items-start gap-2 text-xs text-warning-text">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{zeroWarn ? t("boq.cost_zero_warn") : t("boq.cost_over_price_warn")}</span>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
