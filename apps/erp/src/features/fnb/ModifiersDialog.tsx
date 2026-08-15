import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { findModifierGroup, type MenuItem, type ModifierGroup } from "./menu";
import type { FnbLineModifier } from "@/stores/fnbOrder";

interface ModifiersDialogInitial {
  modifiers: FnbLineModifier[];
  qty: number;
}

interface ModifiersDialogProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when reopening an existing not-yet-fired line for editing — seeds selections/qty and switches the footer to "Save". */
  initial?: ModifiersDialogInitial;
  onConfirm: (modifiers: FnbLineModifier[], qty: number) => void;
}

/** Modifiers overlay — single (radio) / multi (checkbox) groups, required groups block confirm, price deltas ±, qty stepper with live total. */
export function ModifiersDialog({ item, open, onOpenChange, initial, onConfirm }: ModifiersDialogProps) {
  const { t } = useTranslation("fnb");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const byGroup: Record<string, string[]> = {};
      for (const m of initial.modifiers) byGroup[m.group] = [...(byGroup[m.group] ?? []), m.option];
      setSelected(byGroup);
      setQty(initial.qty);
    } else {
      setSelected({});
      setQty(1);
    }
    // Re-seed only on open/item change — not on every keystroke of the caller's re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  if (!item) return null;
  const groups = item.modifier_groups.map(findModifierGroup).filter((g): g is ModifierGroup => !!g);
  const isEditing = !!initial;

  const setSingle = (groupId: string, optionId: string) => {
    setSelected((s) => ({ ...s, [groupId]: [optionId] }));
  };

  const toggleMulti = (groupId: string, optionId: string) => {
    setSelected((s) => {
      const current = s[groupId] ?? [];
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
  const unitPrice = item.price + deltaTotal;

  const handleConfirm = () => {
    const modifiers: FnbLineModifier[] = [];
    for (const g of groups) {
      for (const optId of selected[g.id] ?? []) {
        const opt = g.options.find(o => o.id === optId);
        if (opt) modifiers.push({ group: g.id, option: opt.id, delta: opt.delta });
      }
    }
    onConfirm(modifiers, qty);
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
            {isEditing ? t("modifiers.save") : t("modifiers.add")}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {groups.map(g => {
          const picks = selected[g.id] ?? [];
          const unmet = g.required && picks.length === 0;

          return (
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

              {g.type === "single" ? (
                <RadioGroup
                  value={picks[0] ?? ""}
                  onValueChange={(val) => setSingle(g.id, val)}
                  className="grid grid-cols-2 gap-2"
                >
                  {g.options.map(opt => {
                    const isSelected = picks.includes(opt.id);
                    const inputId = `${item.id}-${g.id}-${opt.id}`;
                    return (
                      <label
                        key={opt.id}
                        htmlFor={inputId}
                        className={cn(
                          "flex items-center gap-2.5 rounded border-2 px-3 h-11 cursor-pointer transition-colors",
                          isSelected
                            ? "border-brand bg-brand-tint text-brand-text"
                            : "border-foreground/15 hover:border-foreground/30"
                        )}
                      >
                        <RadioGroupItem value={opt.id} id={inputId} className="shrink-0" />
                        <span className="flex-1 min-w-0 text-sm font-medium truncate">
                          {lang === "ar" ? opt.name_ar : opt.name_en}
                        </span>
                        <span className="text-xs tabular-nums shrink-0 text-muted-foreground">
                          {opt.delta > 0 ? `+${formatMoney(opt.delta, lang)}` : t("modifiers.price_delta_free")}
                        </span>
                      </label>
                    );
                  })}
                </RadioGroup>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {g.options.map(opt => {
                    const isSelected = picks.includes(opt.id);
                    const inputId = `${item.id}-${g.id}-${opt.id}`;
                    return (
                      <label
                        key={opt.id}
                        htmlFor={inputId}
                        className={cn(
                          "flex items-center gap-2.5 rounded border-2 px-3 h-11 cursor-pointer transition-colors",
                          isSelected
                            ? "border-brand bg-brand-tint text-brand-text"
                            : "border-foreground/15 hover:border-foreground/30"
                        )}
                      >
                        <Checkbox
                          id={inputId}
                          checked={isSelected}
                          onCheckedChange={() => toggleMulti(g.id, opt.id)}
                          className="shrink-0"
                        />
                        <span className="flex-1 min-w-0 text-sm font-medium truncate">
                          {lang === "ar" ? opt.name_ar : opt.name_en}
                        </span>
                        <span className="text-xs tabular-nums shrink-0 text-muted-foreground">
                          {opt.delta > 0 ? `+${formatMoney(opt.delta, lang)}` : t("modifiers.price_delta_free")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {unmet && <p className="text-[11px] text-danger-text mt-1.5">{t("modifiers.required_hint")}</p>}
            </div>
          );
        })}

        {/* Live preview — qty stepper + running total, recomputed on every selection/qty change */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <div className="inline-flex items-center rounded border-2 border-foreground/20 bg-card overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="-"
              className="h-11 w-11 inline-flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="h-11 min-w-[2.75rem] px-2 inline-flex items-center justify-center text-sm font-bold tabular-nums border-x-2 border-foreground/20">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(q => q + 1)}
              aria-label="+"
              className="h-11 w-11 inline-flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <span className="text-base font-bold tabular-nums text-foreground">{formatMoney(unitPrice * qty, lang)}</span>
        </div>
      </div>
    </ModalShell>
  );
}
