import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, EyeOff, Ban } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useEcommerceCatalogModes } from "@/stores/ecommerceCatalogModes";
import { getMirrorPool, inventoryCategoryLabel } from "@/lib/mock/ecommerce";

const ArrowBack = ({ className }: { className?: string }) =>
  document.dir === "rtl" ? <ArrowRight className={className} /> : <ArrowLeft className={className} />;

/**
 * §3.7 Mode 4 sub-screen — "search inventory · toggle 'مخفي أونلاين' per
 * item · bulk hide". `mirrorHidden` is the exceptions log itself: absent
 * = visible (mirror's opt-out default), present+true = hidden. Non-
 * sellable rows (`sellable: false`, e.g. raw materials) start hidden and
 * their toggle is disabled — spec §3.7 "excluded from mirror by default".
 * Permission: `ecommerce.products.manage` (day-to-day, not policy).
 */
export function MirrorExceptionsPage() {
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can("ecommerce.products.manage");

  const mirrorHidden = useEcommerceCatalogModes((s) => s.mirrorHidden);
  const toggleMirrorHidden = useEcommerceCatalogModes((s) => s.toggleMirrorHidden);
  const bulkHideMirror = useEcommerceCatalogModes((s) => s.bulkHideMirror);

  const pool = useMemo(() => getMirrorPool(), []);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return pool;
    const q = search.trim();
    return pool.filter((p) => p.name_ar.includes(q) || (p.name_en ?? "").toLowerCase().includes(q.toLowerCase()));
  }, [pool, search]);

  function isHidden(id: string, sellable: boolean) {
    return sellable ? (mirrorHidden[id] ?? false) : true;
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleBulkHide() {
    if (selected.size === 0) return;
    bulkHideMirror(Array.from(selected));
    toast.success(t("products.mirror.bulk_hidden_toast", { n: selected.size }));
    setSelected(new Set());
  }

  const visibleCount = pool.filter((p) => !isHidden(p.inventory_item_id, p.sellable)).length;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={t("products.mirror.title")} count={t("products.mirror.visible_count", { n: visibleCount })} />

      <div className="px-4 -mt-3 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ecommerce/products")}>
          <ArrowBack className="h-4 w-4" /> {t("products.mirror.back_to_products")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("products.mirror.subtitle")}</p>
      </div>

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("products.mirror.search_placeholder")} className="h-9 flex-1 min-w-40" />
          {canManage && (
            <Button size="sm" variant="outline" onClick={handleBulkHide} disabled={selected.size === 0}>
              <EyeOff className="h-3.5 w-3.5" /> {t("products.mirror.bulk_hide", { n: selected.size })}
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Ban} title={t("products.mirror.no_results")} />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((item) => {
              const hidden = isHidden(item.inventory_item_id, item.sellable);
              return (
                <div key={item.inventory_item_id} className="flex items-center gap-3 px-4 py-3">
                  {canManage && item.sellable && (
                    <Checkbox checked={selected.has(item.inventory_item_id)} onCheckedChange={() => toggleSelect(item.inventory_item_id)} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{item.name_ar}</p>
                      {!item.sellable && (
                        <span className="text-[10px] rounded-full border border-border px-1.5 py-0.5 text-muted-foreground shrink-0">
                          {t("products.mirror.not_sellable_badge")}
                        </span>
                      )}
                      {item.status === "suspended" && (
                        <span className="text-[10px] rounded-full border border-danger/40 text-danger-text px-1.5 py-0.5 shrink-0">
                          {t("products.mirror.suspended_badge")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{inventoryCategoryLabel(item.inventory_category_id, lang)}</p>
                  </div>
                  <span className="tabular-nums text-xs text-muted-foreground">{formatMoney(item.erp_price, lang)}</span>
                  <label className="flex items-center gap-2 text-xs shrink-0">
                    {hidden ? t("products.mirror.hidden_label") : t("products.mirror.visible_label")}
                    <Switch
                      checked={!hidden}
                      onCheckedChange={() => toggleMirrorHidden(item.inventory_item_id)}
                      disabled={!canManage || !item.sellable}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </PageSection>
    </div>
  );
}
