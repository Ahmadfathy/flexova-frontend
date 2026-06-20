import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { Skeleton }    from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { ArrowLeft, ArrowRight, Loader2, Save, Tag, Percent } from "lucide-react";

import { formatMoney, formatNumber } from "@/lib/format";
import { cn }     from "@/lib/utils";
import { useItems } from "../items/useItems";

/* ─── Skeleton ───────────────────────────────────────────────── */

function EditorSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[100, 200, 120, 120].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24 hidden md:block" />
          <Skeleton className="h-8 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

export function PriceListEditorPage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";

  const { data, loading, error, reload } = useItems();

  const priceList  = data?.price_lists.find(pl => pl.id === id);
  const defaultPL  = data?.price_lists.find(pl => pl.is_default);
  const stockItems = useMemo(
    () => (data?.items ?? []).filter(it => it.item_type !== "service"),
    [data]
  );

  const [prices,      setPrices]      = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [search,      setSearch]      = useState("");
  const [markupPct,   setMarkupPct]   = useState("");
  const [saving,      setSaving]      = useState(false);

  /* Initialise price state once data loads */
  useEffect(() => {
    if (data && id && !initialized) {
      const init: Record<string, string> = {};
      stockItems.forEach(it => {
        const v = it.prices[id];
        init[it.id] = v !== undefined ? String(v) : "";
      });
      setPrices(init);
      setInitialized(true);
    }
  }, [data, id, initialized, stockItems]);

  /* Filtered items */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stockItems;
    return stockItems.filter(it =>
      it.name_ar.includes(search.trim()) ||
      it.name_en.toLowerCase().includes(q) ||
      it.code.toLowerCase().includes(q)
    );
  }, [stockItems, search]);

  /* Apply markup from default list */
  function applyMarkup() {
    const pct = parseFloat(markupPct);
    if (isNaN(pct) || !defaultPL) return;
    const next = { ...prices };
    stockItems.forEach(it => {
      const def = it.prices[defaultPL.id];
      if (def !== undefined) {
        next[it.id] = (def * (1 + pct / 100)).toFixed(2);
      }
    });
    setPrices(next);
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success(lang === "ar" ? "تم حفظ الأسعار" : "Prices saved");
  }

  /* ── Render states ───────────────────────────────────────── */

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <PageSection padded={false}><EditorSkeleton /></PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState description={t("errors.load")} onRetry={reload} />
      </div>
    );
  }

  if (!priceList) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Tag}
          title={lang === "ar" ? "القائمة غير موجودة" : "Price list not found"}
          description=""
          action={{ label: t("actions.back"), onClick: () => navigate("/inventory/price-lists") }}
        />
      </div>
    );
  }

  const plName = lang === "ar" ? priceList.name_ar : priceList.name_en;
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={plName}
        subtitle={t("price_lists.editor_title")}
        crumbLabel={plName}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/inventory/price-lists")}
            >
              <BackIcon className="h-4 w-4 me-1" />
              {t("actions.back")}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving
                ? <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                : <Save className="h-4 w-4 me-1.5" />}
              {t("actions.save")}
            </Button>
          </div>
        }
      />

      <PageSection padded={false}>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("price_lists.search_ph")}
            className="sm:max-w-64"
          />

          {/* Markup tool — hidden for default list */}
          {!priceList.is_default && defaultPL && (
            <div className="flex items-center gap-2 ms-auto">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {t("price_lists.markup_label")}
              </span>
              <Input
                type="number"
                value={markupPct}
                onChange={e => setMarkupPct(e.target.value)}
                placeholder="0"
                className="w-20 h-8 text-sm"
              />
              <Percent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Button variant="outline" size="sm" onClick={applyMarkup}>
                {t("price_lists.markup_apply")}
              </Button>
            </div>
          )}
        </div>

        {/* Price table */}
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent border-b border-border">
              {[
                { key: "code",    label: t("columns.code"),                cls: "font-semibold" },
                { key: "name",    label: t("columns.name"),                cls: "font-semibold" },
                { key: "default", label: t("price_lists.default_price"),   cls: "font-semibold text-end hidden md:table-cell" },
                { key: "price",   label: t("price_lists.set_price"),       cls: "font-semibold text-end" },
              ].map(col => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "h-10 py-2 px-3 text-xs text-muted-foreground whitespace-nowrap",
                    col.cls
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map(item => {
              const defPrice = defaultPL ? item.prices[defaultPL.id] : undefined;
              const rawPrice = prices[item.id] ?? "";
              const priceNum = parseFloat(rawPrice);
              const diffNum  = !isNaN(priceNum) && defPrice !== undefined
                ? priceNum - defPrice : null;

              return (
                <TableRow
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  {/* Code */}
                  <TableCell className="px-3 py-2 w-28">
                    <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="px-3 py-2">
                    <span className="text-sm font-medium">
                      {lang === "ar" ? item.name_ar : item.name_en}
                    </span>
                  </TableCell>

                  {/* Default price + diff */}
                  <TableCell className="px-3 py-2 text-end tabular-nums text-sm text-muted-foreground hidden md:table-cell">
                    {defPrice !== undefined ? formatMoney(defPrice, lang) : "—"}
                    {diffNum !== null && diffNum !== 0 && (
                      <span className={cn(
                        "ms-2 text-xs",
                        diffNum > 0 ? "text-emerald-600" : "text-destructive"
                      )}>
                        {diffNum > 0 ? "+" : ""}{formatNumber(diffNum)}
                      </span>
                    )}
                  </TableCell>

                  {/* Editable price */}
                  <TableCell className="px-3 py-2 text-end">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={rawPrice}
                      onChange={e => setPrices(p => ({ ...p, [item.id]: e.target.value }))}
                      className="w-28 ms-auto text-end tabular-nums h-8 text-sm"
                      placeholder="—"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {lang === "ar" ? "لا توجد أصناف مطابقة" : "No items found"}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground tabular-nums">
            {filtered.length}{" "}{lang === "ar" ? "صنف" : "items"}
          </span>
          {priceList.is_default && (
            <Badge variant="secondary" className="text-xs">
              {t("price_lists.default_badge")}
            </Badge>
          )}
        </div>
      </PageSection>
    </div>
  );
}
