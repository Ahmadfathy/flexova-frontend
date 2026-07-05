import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { LayoutGrid, ShoppingBasket, CupSoda, Beef, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";

interface Category {
  id: string;
  name_ar: string;
  name_en: string;
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  cat_grocery: ShoppingBasket,
  cat_beverages: CupSoda,
  cat_butchery: Beef,
  cat_clothing: Shirt,
};

const categories = posFixtures.categories as Category[];

export function PosCategoryRail() {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const [active, setActive] = useState<string>("all");

  const items = [
    { id: "all", icon: LayoutGrid, label: t("category.all") },
    ...categories.map(c => ({
      id: c.id,
      icon: CATEGORY_ICON[c.id] ?? LayoutGrid,
      label: lang === "ar" ? c.name_ar : c.name_en,
    })),
  ];

  return (
    <>
      {/* Small screens — horizontal chips above the grid */}
      <nav className="lg:hidden flex items-center gap-2 overflow-x-auto px-3 py-2 border-b border-border bg-card shrink-0">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 h-11 px-3 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors",
              active === item.id
                ? "bg-brand-tint text-brand-text"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Landscape terminal/tablet — vertical icon rail */}
      <nav className="hidden lg:flex flex-col w-20 shrink-0 border-e border-border bg-card py-2 gap-1 overflow-y-auto">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 mx-2 min-h-[56px] rounded text-[11px] font-medium transition-colors px-1",
              active === item.id
                ? "bg-brand-tint text-brand-text"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="text-center leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
