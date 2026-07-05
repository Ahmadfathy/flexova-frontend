import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Scale } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PosItem } from "./useCashierCatalog";

interface WeightEntryDialogProps {
  item: PosItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWeight?: number;
  onConfirm: (weightKg: number) => void;
}

export function WeightEntryDialog({ item, open, onOpenChange, initialWeight, onConfirm }: WeightEntryDialogProps) {
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();
  const [weight, setWeight] = useState("");

  useEffect(() => {
    if (open) setWeight(initialWeight ? String(initialWeight) : "");
  }, [open, initialWeight]);

  if (!item) return null;

  const name = lang === "ar" ? item.name_ar : item.name_en;
  const pricePerKg = item.price_per_kg ?? 0;
  const weightNum = parseFloat(weight) || 0;
  const lineTotal = weightNum * pricePerKg;

  const confirm = () => {
    if (weightNum > 0) {
      onConfirm(weightNum);
      onOpenChange(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={`${t("weight.title")} — ${name}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button variant="solid" tone="primary" disabled={weightNum <= 0} onClick={confirm}>
            {tCommon("confirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("weight.per_kg")}: <span className="font-semibold text-foreground tabular-nums">{formatMoney(pricePerKg, lang)}</span>
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="weight-input">{t("weight.title")} (kg)</Label>
          <div className="relative">
            <Scale className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="weight-input"
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              autoFocus
              placeholder={t("weight.placeholder")}
              value={weight}
              onChange={e => setWeight(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") confirm(); }}
              className="ps-9 text-lg tabular-nums h-12"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded bg-muted px-3 py-2">
          <span className="text-sm font-medium text-muted-foreground">{t("weight.line_total")}</span>
          <span className="text-lg font-bold tabular-nums">{formatMoney(lineTotal, lang)}</span>
        </div>
      </div>
    </ModalShell>
  );
}
