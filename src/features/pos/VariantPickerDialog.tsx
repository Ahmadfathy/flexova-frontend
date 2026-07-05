import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { usePosRegister } from "@/stores/posRegister";
import { ModalShell } from "@/components/patterns/ModalShell";
import type { PosItem, PosVariant } from "./useCashierCatalog";

interface VariantPickerDialogProps {
  item: PosItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (variant: PosVariant) => void;
}

export function VariantPickerDialog({ item, open, onOpenChange, onPick }: VariantPickerDialogProps) {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const lines = usePosRegister(s => s.lines);

  const variants = item?.variants ?? [];

  const sizes = useMemo(() => Array.from(new Set(variants.map(v => v.size))), [variants]);
  const colors = useMemo(
    () => Array.from(new Set(variants.map(v => (lang === "ar" ? v.color_ar : v.color_en)))),
    [variants, lang]
  );

  if (!item) return null;

  const name = lang === "ar" ? item.name_ar : item.name_en;

  const variantAt = (size: string, colorLabel: string) =>
    variants.find(v => v.size === size && (lang === "ar" ? v.color_ar : v.color_en) === colorLabel);

  const skuQty = (sku: string) => lines.find(l => l.sku === sku)?.qty ?? 0;

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      description={t("variant.pick")}
      size="sm"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-1" />
              {colors.map(color => (
                <th key={color} className="p-1 text-xs font-semibold text-muted-foreground">{color}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map(size => (
              <tr key={size}>
                <th className="p-1 text-xs font-semibold text-muted-foreground text-start">{size}</th>
                {colors.map(color => {
                  const variant = variantAt(size, color);
                  if (!variant) return <td key={color} className="p-1" />;
                  const oos = variant.stock <= 0;
                  const qty = skuQty(variant.sku);
                  return (
                    <td key={color} className="p-1">
                      <button
                        type="button"
                        disabled={oos}
                        onClick={() => onPick(variant)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-0.5 h-14 w-full min-w-[64px] rounded border text-xs font-medium transition-colors",
                          oos
                            ? "border-border bg-muted text-muted-foreground/60 cursor-not-allowed"
                            : qty > 0
                              ? "border-brand bg-brand-tint text-brand-text"
                              : "border-border hover:border-brand/40 hover:bg-muted"
                        )}
                      >
                        {oos ? (
                          <span className="text-[10px]">{t("variant.oos")}</span>
                        ) : (
                          <>
                            {qty > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px]">
                                <Check className="h-2.5 w-2.5" /> {qty}
                              </span>
                            )}
                            <span className="tabular-nums">{formatMoney(variant.price, lang)}</span>
                          </>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}
