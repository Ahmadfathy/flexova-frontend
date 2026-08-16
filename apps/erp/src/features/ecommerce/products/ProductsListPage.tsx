import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, Plus, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EntityCell } from "@/components/patterns/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useEcommerceProducts } from "@/stores/ecommerceProducts";
import { getStoreCategories } from "@/lib/mock/ecommerce";
import { PUBLISH_STATUS_PILL, effectivePrice, isAutoHidden, categoryLabel } from "../catalog";
import { useMockState } from "../useMockState";
import type { EcOnlineProduct } from "../types";

export function ProductsListPage() {
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();
  const productsMap = useEcommerceProducts((s) => s.products);
  const categories = getStoreCategories();

  const allProducts = useMemo(
    () => (forcedEmpty ? [] : Object.values(productsMap)),
    [productsMap, forcedEmpty]
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  function clearFilters() {
    setSearch(""); setCategory(""); setStatus("");
  }

  const filtered = useMemo(() => {
    let list = allProducts;
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.title_ar.includes(q) || (p.title_en ?? "").toLowerCase().includes(q));
    }
    if (category) list = list.filter((p) => p.store_category === category);
    if (status) list = list.filter((p) => p.publish_status === status);
    return list;
  }, [allProducts, search, category, status]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("products.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border" style={{ opacity: 1 - i * 0.15 }}>
              <Skeleton className="h-8 w-8 rounded" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3.5 w-16 tabular-nums" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("products.title")} />
        <PageSection><ErrorState description={t("products.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("products.title")}
        count={allProducts.length > 0 ? t("products.count", { n: allProducts.length }) : undefined}
        actions={
          can("ecommerce.products.manage") ? (
            <Button onClick={() => navigate("/ecommerce/products/new")}>
              <Plus className="h-4 w-4" /> {t("products.new")}
            </Button>
          ) : undefined
        }
      />

      {isOffline && <OfflineBanner message={t("products.offline_note")} />}

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("products.search_placeholder")} className="h-10" />
          </div>

          <Select value={category || "__all__"} onValueChange={(v) => setCategory(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-40"><SelectValue placeholder={t("products.all_categories")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("products.all_categories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{categoryLabel(c.id, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36"><SelectValue placeholder={t("products.all_statuses")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("products.all_statuses")}</SelectItem>
              {(["published", "draft", "hidden"] as const).map((s) => (
                <SelectItem key={s} value={s}>{t(`products.status_${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {allProducts.length === 0 ? (
          <EmptyState icon={Package} title={t("products.no_products")} description={t("products.empty_sub")} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("products.no_results_title")}</p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>{t("products.clear_filters")}</Button>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("products.col_product")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("products.col_category")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("products.col_price")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("products.col_availability")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("products.col_status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <ProductRow key={p.id} product={p} lang={lang} t={t} onClick={() => navigate(`/ecommerce/products/${p.id}`)} />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {filtered.map((p) => {
                const hidden = isAutoHidden(p);
                return (
                  <div key={p.id} className="px-4 py-3 space-y-1.5 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/ecommerce/products/${p.id}`)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{p.title_ar}</span>
                      <StatusPill variant={PUBLISH_STATUS_PILL[p.publish_status]} label={t(`products.status_${p.publish_status}`)} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{categoryLabel(p.store_category, lang)}</span>
                      <span className="tabular-nums font-medium text-foreground">{formatMoney(effectivePrice(p), lang)}</span>
                    </div>
                    {hidden && (
                      <p className="flex items-center gap-1 text-xs text-danger-text">
                        <AlertTriangle className="h-3 w-3" /> {t("products.auto_hidden_note")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PageSection>
    </div>
  );
}

function ProductRow({
  product, lang, t, onClick,
}: {
  product: EcOnlineProduct;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"ecommerce">>["t"];
  onClick: () => void;
}) {
  const hidden = isAutoHidden(product);
  const outOfStock = (product.erp_stock ?? 0) <= 0 && !hidden;
  return (
    <TableRow className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer" onClick={onClick}>
      <TableCell className="px-4 py-3.5">
        <EntityCell name={product.title_ar} sub={product.title_en} avatarFallback={product.title_ar.slice(0, 2)} />
      </TableCell>
      <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">{categoryLabel(product.store_category, lang)}</TableCell>
      <TableCell className="tabular-nums font-medium px-4 py-3.5">
        {formatMoney(effectivePrice(product), lang)}
        {product.online_price != null && (
          <span className="ms-1.5 text-xs text-muted-foreground line-through">{formatMoney(product.erp_base_price, lang)}</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3.5 text-sm">
        {hidden ? (
          <span className="text-danger-text text-xs">{t("products.erp_unavailable")}</span>
        ) : outOfStock ? (
          <span className="text-danger-text text-xs">{t("products.out_of_stock")}</span>
        ) : (
          <span className="tabular-nums text-muted-foreground">{product.erp_stock}</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <StatusPill variant={PUBLISH_STATUS_PILL[product.publish_status]} label={t(`products.status_${product.publish_status}`)} />
          {hidden && (
            <Badge variant="outline" className="text-[10px] font-normal border-danger/40 text-danger-text">
              {t("products.auto_hidden_badge")}
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
