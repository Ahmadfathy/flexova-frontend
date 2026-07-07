import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { findModifierGroup, type MenuItem } from "./menu";
import type { FnbLineModifier } from "@/stores/fnbOrder";

interface ModifiersDialogProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (modifiers: FnbLineModifier[]) => void;
}

/** Modifiers overlay — single/multi groups, required groups block confirm, price deltas shown ±. */
export function ModifiersDialog({ item, open, onOpenChange, onConfirm }: ModifiersDialogProps) {
  const { t } = useTranslation("fnb");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();

  const [selected, setSelected] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open) setSelected({});
  }, [open, item?.id]);

  if (!item) return null;
  const groups = item.modifier_groups.map(findModifierGroup).filter((g): g is NonNullable<typeof g> => !!g);

  const toggleOption = (groupId: string, optionId: string, type: "single" | "multi") => {
    setSelected((s) => {
      const current = s[groupId] ?? [];
      if (type === "single") {
        return { ...s, [groupId]: [optionId] };
      }
      const next = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      return { ...s, [groupId]: next };
    });
  };

  const missingRequired = groups.some(g => g.required && (selected[g.id]?.length ?? 0) === 0);

  const deltaTotal = groups.reduce((sum, g) => {
    const picks = selected[g.id] ?? [];
    return sum + picks.reduce((gSum, optId) => gSum + (g.options.find(o => o.id === optId)?.delta ?? 0), 0);
  }, 0);

  const handleConfirm = () => {
    const modifiers: FnbLineModifier[] = [];
    for (const g of groups) {
      for (const optId of selected[g.id] ?? []) {
        const opt = g.options.find(o => o.id === optId);
        if (opt) modifiers.push({ group: g.id, option: opt.id, delta: opt.delta });
      }
    }
    onConfirm(modifiers);
    onOpenChange(false);
  };

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("modifiers.title")}
      description={lang === "ar" ? item.name_ar : item.name_en}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button variant="solid" tone="primary" disabled={missingRequired} onClick={handleConfirm}>
            {t("modifiers.confirm")} · {formatMoney(item.price + deltaTotal, lang)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {groups.map(g => (
          <div key={g.id}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-foreground">{lang === "ar" ? g.name_ar : g.name_en}</p>
              <span className={cn(
                "text-[11px] font-medium rounded px-1.5 py-0.5",
                g.required ? "bg-warning-tint text-warning-text" : "bg-muted text-muted-foreground"
              )}>
                {g.required ? t("modifiers.required") : t("modifiers.optional")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {g.options.map(opt => {
                const isSelected = (selected[g.id] ?? []).includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleOption(g.id, opt.id, g.type)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded border-2 px-3 h-11 text-start transition-colors",
                      isSelected
                        ? "border-brand bg-brand-tint text-brand-text"
                        : "border-foreground/15 hover:border-foreground/30"
                    )}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 text-sm font-medium truncate">
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      {lang === "ar" ? opt.name_ar : opt.name_en}
                    </span>
                    <span className="text-xs tabular-nums shrink-0 text-muted-foreground">
                      {opt.delta > 0 ? `+${formatMoney(opt.delta, lang)}` : t("modifiers.price_delta_free")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
