import { useTranslation } from "react-i18next";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { formatMoney } from "@/lib/format";
import type { Lang } from "@/stores/appearance";
import { getLinkableInventoryItems } from "@/lib/mock/ecommerce";
import type { LinkableInventoryItem } from "../types";

interface InventoryItemPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  /** Already-linked item ids (other products) — excluded so the same
   * ERP item can't back two online products at once. */
  excludeIds?: string[];
  onPick: (item: LinkableInventoryItem) => void;
}

/** spec §3.2 "search + select existing inventory item" — same
 * `CommandDialog` picker pattern Repair's `RprPartPicker` established. */
export function InventoryItemPicker({ open, onOpenChange, lang, excludeIds, onPick }: InventoryItemPickerProps) {
  const { t } = useTranslation("ecommerce");
  const items = getLinkableInventoryItems().filter((i) => !excludeIds?.includes(i.id));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("products.picker_search_placeholder")} />
      <CommandList>
        <CommandEmpty>{t("products.picker_no_results")}</CommandEmpty>
        <CommandGroup>
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.name_ar} ${item.name_en} ${item.id}`}
              disabled={item.status === "suspended"}
              onSelect={() => { onPick(item); onOpenChange(false); }}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex flex-col">
                <span className="text-sm">{lang === "ar" ? item.name_ar : item.name_en}</span>
                {item.status === "suspended" && (
                  <span className="text-xs text-danger-text">{t("products.picker_item_suspended")}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums shrink-0">
                <span>{formatMoney(item.base_price, lang)}</span>
                <span>{t("products.picker_stock", { n: item.stock })}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
