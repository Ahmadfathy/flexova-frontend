import type { LucideIcon } from "lucide-react";
import { LayoutGrid, ShoppingBasket, CupSoda, Beef, Shirt } from "lucide-react";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  cat_grocery: ShoppingBasket,
  cat_beverages: CupSoda,
  cat_butchery: Beef,
  cat_clothing: Shirt,
};

export function getCategoryIcon(categoryId: string): LucideIcon {
  return CATEGORY_ICON[categoryId] ?? LayoutGrid;
}
