import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Flag, PackagePlus } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import type { Lang } from "@/stores/appearance";
import { useRprPartsStock, effectiveStock } from "@/stores/rprPartsStock";
import { PARTS, partName, type RprPart } from "./catalog";

interface RprPartPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  onPickPart: (part: RprPart) => void;
  /** Omit to hide the ad-hoc option — Quote lines are estimates from the registered
   * catalog only (RprQuotePartLine has no adhoc_name/_flag fields, unlike execution lines). */
  onAddAdhoc?: (name: string, price: number) => void;
}

/** Parts picker for WO execution/quote lines — small local catalog (rpr.fixtures.json's own
 * `parts`), search + flag-aware list + an ad-hoc entry (unregistered part). */
export function RprPartPicker({ open, onOpenChange, lang, onPickPart, onAddAdhoc }: RprPartPickerProps) {
  const { t } = useTranslation("repair");
  const depleted = useRprPartsStock((s) => s.depleted);
  const [adhocMode, setAdhocMode] = useState(false);
  const [adhocName, setAdhocName] = useState("");
  const [adhocPrice, setAdhocPrice] = useState("");

  function close(open: boolean) {
    onOpenChange(open);
    if (!open) { setAdhocMode(false); setAdhocName(""); setAdhocPrice(""); }
  }

  function handleAddAdhoc() {
    const price = parseFloat(adhocPrice);
    if (!adhocName.trim() || !(price > 0) || !onAddAdhoc) return;
    onAddAdhoc(adhocName.trim(), price);
    close(false);
  }

  if (adhocMode) {
    return (
      <CommandDialog open={open} onOpenChange={close}>
        <div className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">{t("wo.adhoc_part_title")}</p>
          <Input
            value={adhocName}
            onChange={(e) => setAdhocName(e.target.value)}
            placeholder={t("wo.adhoc_part_name")}
            className="h-11"
          />
          <Input
            type="number" min={0} step="1"
            value={adhocPrice}
            onChange={(e) => setAdhocPrice(e.target.value)}
            placeholder={t("wo.adhoc_part_price")}
            className="h-11 tabular-nums"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setAdhocMode(false)}>{t("intake.cancel")}</Button>
            <Button onClick={handleAddAdhoc} disabled={!adhocName.trim() || !(parseFloat(adhocPrice) > 0)}>
              {t("wo.add_part")}
            </Button>
          </div>
        </div>
      </CommandDialog>
    );
  }

  return (
    <CommandDialog open={open} onOpenChange={close}>
      <CommandInput placeholder={t("wo.part_search_placeholder")} />
      <CommandList>
        <CommandEmpty>—</CommandEmpty>
        <CommandGroup>
          {PARTS.map((part) => {
            const stock = effectiveStock(part.stock, part.id, depleted);
            return (
              <CommandItem
                key={part.id}
                value={`${part.name_ar} ${part.name_en} ${part.sku}`}
                onSelect={() => { onPickPart(part); close(false); }}
              >
                <span className="min-w-0 flex-1 truncate">{partName(part, lang)}</span>
                {!part.eta_code && (
                  <Flag className="h-3.5 w-3.5 text-warning shrink-0 me-1.5" />
                )}
                <span className={"text-xs tabular-nums shrink-0 me-2 " + (stock <= 0 ? "text-danger-text" : "text-muted-foreground")}>
                  {t("wo.stock_label")} {stock}
                </span>
                <span className="tabular-nums font-medium shrink-0">{formatMoney(part.price, lang)}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        {onAddAdhoc && (
          <CommandGroup>
            <CommandItem onSelect={() => setAdhocMode(true)}>
              <PackagePlus className="h-4 w-4 me-2" /> {t("wo.adhoc_part_title")}
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
