import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, Flag, ListPlus, type LucideIcon, Soup, Beef, CupSoda, IceCreamCone, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { MENU_ITEMS, MENU_CATEGORIES, type MenuItem } from "./menu";
import { useOrderMenu } from "./useOrderMenu";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  mcat_starters: Soup,
  mcat_mains: Beef,
  mcat_drinks: CupSoda,
  mcat_dessert: IceCreamCone,
};

function MenuSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-[140px] rounded-lg" />
      ))}
    </div>
  );
}

interface OrderMenuGridProps {
  onActivate: (item: MenuItem) => void;
}

export function OrderMenuGrid({ onActivate }: OrderMenuGridProps) {
  const { t } = useTranslation("fnb");
  const { lang } = useAppearance();
  const { loading, error, isOffline, forcedEmpty, reload } = useOrderMenu();

  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const filtered = useMemo(() => {
    if (forcedEmpty) return [];
    if (forcedNoResults && !query) return [];
    const byCategory = category === "all" ? MENU_ITEMS : MENU_ITEMS.filter(i => i.category === category);
    const q = query.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(i => i.name_ar.includes(q) || i.name_en.toLowerCase().includes(q));
  }, [category, query, forcedEmpty, forcedNoResults]);

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      {isOffline && <OfflineBanner message={t("order.menu_offline_note")} />}

      <div className="relative shrink-0">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("order.search_placeholder")}
          className="ps-9 h-11 border-2 border-foreground/20 focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <Tabs value={category} onValueChange={setCategory} className="shrink-0">
        <TabsList className="h-auto p-1 flex-wrap justify-start bg-muted gap-1">
          <TabsTrigger value="all" className="h-11 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("order.all_categories")}
          </TabsTrigger>
          {MENU_CATEGORIES.map(c => (
            <TabsTrigger
              key={c.id}
              value={c.id}
              className="h-11 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              {lang === "ar" ? c.name_ar : c.name_en}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <MenuSkeleton />
        ) : error ? (
          <ErrorState title={t("order.menu_error_title")} description={t("order.menu_error_body")} onRetry={reload} />
        ) : filtered.length === 0 ? (
          (query.trim() || forcedNoResults) ? (
            <EmptyState
              icon={Search}
              title={t("order.menu_no_results_title", { query: query || "—" })}
              description={t("order.menu_no_results_body")}
            />
          ) : (
            <EmptyState icon={UtensilsCrossed} title={t("order.menu_empty_title")} description={t("order.menu_empty_body")} />
          )
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map(item => {
              const Icon = CATEGORY_ICON[item.category] ?? UtensilsCrossed;
              const hasModifiers = item.modifier_groups.length > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onActivate(item)}
                  className="group relative flex h-[140px] w-full flex-col overflow-hidden rounded-lg border border-border bg-card p-2.5 text-start transition-colors hover:border-brand/40 hover:shadow-sm"
                >
                  <div className="flex h-9 shrink-0 items-center gap-1">
                    <span className="flex items-center justify-center h-7 w-7 rounded-md bg-muted text-muted-foreground shrink-0">
                      <Icon className="h-4 w-4" />
                    </span>
                    {hasModifiers && (
                      <span title={t("order.modifiers_hint")} className="inline-flex items-center rounded bg-brand-tint text-brand-text p-1 shrink-0">
                        <ListPlus className="h-3 w-3" />
                      </span>
                    )}
                    {item.eta_code === "" && (
                      <span title={t("order.no_eta_hint")} className="inline-flex items-center rounded bg-warning-tint text-warning-text p-1 shrink-0">
                        <Flag className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden mt-1">
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                      {lang === "ar" ? item.name_ar : item.name_en}
                    </p>
                  </div>

                  <div className="mt-auto flex shrink-0 items-center justify-between gap-1 pt-1.5">
                    <span className="text-sm font-bold tabular-nums text-foreground">{formatMoney(item.price, lang)}</span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-brand-tint group-hover:text-brand-text">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
