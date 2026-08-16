import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FolderTree, Plus, ChevronUp, ChevronDown, Pencil, Trash2, CornerDownLeft } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useEcommerceCategories } from "@/stores/ecommerceCategories";
import { useEcommerceProducts } from "@/stores/ecommerceProducts";
import { categoryTreeOrder, categoryDepth, productCountByCategory } from "../catalog";
import { useMockState } from "../useMockState";
import { CategoryFormDialog } from "./CategoryFormDialog";
import type { EcStoreCategory } from "../types";

/** spec §4 — marketing category tree, independent of inventory categories.
 * Add/edit/reorder (siblings, up/down) · assign products (read-only count
 * badge here — assignment itself happens from the product editor's own
 * category picker) · SEO slug per category. */
export function CategoriesPage() {
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const can = useCan();

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();
  const rawCategories = useEcommerceCategories((s) => s.categories);
  const createCategory = useEcommerceCategories((s) => s.createCategory);
  const updateCategory = useEcommerceCategories((s) => s.updateCategory);
  const deleteCategory = useEcommerceCategories((s) => s.deleteCategory);
  const reorder = useEcommerceCategories((s) => s.reorder);
  const products = useEcommerceProducts((s) => s.products);

  const categories = useMemo(() => (forcedEmpty ? [] : rawCategories), [rawCategories, forcedEmpty]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EcStoreCategory | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<EcStoreCategory | null>(null);

  const ordered = categoryTreeOrder(categories);
  const counts = productCountByCategory(Object.values(products));
  const canManage = can("ecommerce.products.manage");

  function openCreate() { setEditing(undefined); setFormOpen(true); }
  function openEdit(c: EcStoreCategory) { setEditing(c); setFormOpen(true); }

  function handleSave(input: Omit<EcStoreCategory, "id">) {
    if (editing) {
      updateCategory(editing.id, input);
      toast.success(t("categories.saved_toast"));
    } else {
      createCategory(input);
      toast.success(t("categories.created_toast"));
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const hasChildren = categories.some((c) => c.parent_id === deleteTarget.id);
    if (hasChildren) {
      toast.error(t("categories.delete_blocked_children"));
      setDeleteTarget(null);
      return;
    }
    if ((counts[deleteTarget.id] ?? 0) > 0) {
      toast.error(t("categories.delete_blocked_products"));
      setDeleteTarget(null);
      return;
    }
    deleteCategory(deleteTarget.id);
    toast.success(t("categories.deleted_toast"));
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("categories.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border" style={{ opacity: 1 - i * 0.15 }}>
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("categories.title")} />
        <PageSection><ErrorState description={t("categories.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("categories.title")}
        count={categories.length > 0 ? t("categories.count", { n: categories.length }) : undefined}
        actions={
          canManage ? (
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t("categories.new")}</Button>
          ) : undefined
        }
      />

      {isOffline && <OfflineBanner message={t("categories.offline_note")} />}

      <PageSection padded={false}>
        {categories.length === 0 ? (
          <EmptyState icon={FolderTree} title={t("categories.no_categories")} description={t("categories.empty_sub")} />
        ) : (
          <div className="divide-y divide-border">
            {ordered.map((c) => {
              const depth = categoryDepth(c, categories);
              const siblings = categories.filter((x) => x.parent_id === c.parent_id);
              const posInSiblings = siblings.findIndex((x) => x.id === c.id);
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                  <div style={{ width: depth * 20 }} className="shrink-0" />
                  {depth > 0 && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{lang === "ar" ? c.name_ar : (c.name_en || c.name_ar)}</span>
                      {c._flag === "empty_category" && counts[c.id] === undefined && (
                        <Badge variant="outline" className="text-[10px] font-normal">{t("categories.empty_flag")}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground" dir="ltr">/{c.seo_slug || c.id}</p>
                  </div>
                  <Badge variant="outline" className="tabular-nums font-normal shrink-0">
                    {t("categories.product_count", { n: counts[c.id] ?? 0 })}
                  </Badge>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={posInSiblings <= 0} onClick={() => reorder(c.id, "up")} aria-label={t("categories.move_up")}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={posInSiblings >= siblings.length - 1} onClick={() => reorder(c.id, "down")} aria-label={t("categories.move_down")}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)} aria-label={t("categories.edit")}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-danger-text hover:text-danger-text" onClick={() => setDeleteTarget(c)} aria-label={t("categories.delete")}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageSection>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        categories={categories}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("categories.delete_title")}
        description={t("categories.delete_body", { name: deleteTarget?.name_ar ?? "" })}
        confirmLabel={t("categories.delete")}
        confirmTone="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
