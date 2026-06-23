import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { Skeleton }    from "@/components/patterns/Skeletons";

import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Badge }   from "@/components/ui/badge";
import { Label }   from "@/components/ui/label";
import { ModalShell } from "@/components/patterns/ModalShell";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Plus, Search, Layers, MoreVertical, ChevronRight, ChevronDown, Loader2, X,
} from "lucide-react";

import { cn }       from "@/lib/utils";
import { useCan }   from "@/lib/permissions";
import { useItems } from "../items/useItems";
import type { InventoryCategory } from "../items/types";

/* ─── Types ─────────────────────────────────────────────────── */

type DialogMode = "add" | "edit" | "add-child";

interface CatDialog {
  open: boolean;
  mode: DialogMode;
  category?: InventoryCategory;
  parentId?: string | null;
}

interface DeleteDialog {
  open: boolean;
  category?: InventoryCategory;
}

/* ─── Helpers ───────────────────────────────────────────────── */

function getDepth(catId: string, cats: InventoryCategory[]): number {
  const cat = cats.find((c) => c.id === catId);
  if (!cat || !cat.parent_id) return 1;
  return 1 + getDepth(cat.parent_id, cats);
}

/* ─── Skeleton ───────────────────────────────────────────────── */

function CatSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 flex-1 max-w-xs" />
          <Skeleton className="h-5 w-8 rounded-full ms-auto" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ─── Form dialog ────────────────────────────────────────────── */

interface CatFormProps {
  dialog: CatDialog;
  categories: InventoryCategory[];
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"inventory">>["t"];
  onClose: () => void;
}

function CatFormDialog({ dialog, categories, lang, t, onClose }: CatFormProps) {
  const open = dialog.open;
  const [name, setName]       = useState<string>(() => {
    if (dialog.mode === "edit" && dialog.category) {
      return lang === "ar" ? dialog.category.name_ar : dialog.category.name_en;
    }
    return "";
  });
  const [parentId, setParentId] = useState<string>(() => {
    if (dialog.mode === "add-child") return dialog.parentId ?? "";
    if (dialog.mode === "edit")      return dialog.category?.parent_id ?? "";
    return "";
  });
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  const dialogTitle =
    dialog.mode === "edit"       ? t("categories.edit") :
    dialog.mode === "add-child"  ? t("categories.add_child") :
    t("categories.new");

  const roots = useMemo(
    () => categories.filter((c) => c.parent_id === null),
    [categories]
  );
  const children = useMemo(
    () => categories.filter((c) => c.parent_id !== null),
    [categories]
  );

  async function handleSave() {
    if (!name.trim()) {
      setError(t("categories.form_name_required"));
      return;
    }

    // Check depth constraint
    if (parentId) {
      const depth = getDepth(parentId, categories);
      if (depth >= 3) {
        setError(t("categories.depth_block"));
        return;
      }
    }

    setSaving(true);
    await new Promise((r) => setTimeout(r, 650));
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={v => !v && onClose()}
      title={dialogTitle}
      description={dialogTitle}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("actions.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="cat-name">
            {t("categories.form_name")}
            <span className="text-destructive ms-0.5">*</span>
          </Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            autoFocus
            placeholder={lang === "ar" ? "مثال: مشروبات" : "e.g. Beverages"}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Parent — locked in add-child mode */}
        <div className="space-y-1.5">
          <Label htmlFor="cat-parent">{t("categories.form_parent")}</Label>
          {dialog.mode === "add-child" ? (
            <Input
              id="cat-parent"
              value={
                (function () {
                  const p = categories.find((c) => c.id === parentId);
                  return p ? (lang === "ar" ? p.name_ar : p.name_en) : parentId;
                })()
              }
              readOnly
              className="bg-muted text-muted-foreground"
            />
          ) : (
            <Select
              value={parentId || "__none__"}
              onValueChange={(v) => setParentId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="cat-parent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t("categories.form_no_parent")}
                </SelectItem>
                {/* Root categories */}
                {roots.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {lang === "ar" ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
                {/* Level-2 categories (children of roots) */}
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {"── "}
                    {lang === "ar" ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export function CategoriesPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();

  const { data, loading, error, reload } = useItems();

  const categories: InventoryCategory[] = useMemo(
    () => data?.categories ?? [],
    [data]
  );

  /* Tree state */
  const firstParentId = useRef<string | undefined>(undefined);
  const parents = useMemo(() => {
    const list = categories.filter((c) => c.parent_id === null);
    if (!firstParentId.current && list.length > 0) firstParentId.current = list[0].id;
    return list;
  }, [categories]);

  const childrenOf = useMemo(() => {
    const map: Record<string, InventoryCategory[]> = {};
    categories
      .filter((c) => c.parent_id !== null)
      .forEach((c) => {
        const pid = c.parent_id!;
        map[pid] = [...(map[pid] ?? []), c];
      });
    return map;
  }, [categories]);

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    new Set(firstParentId.current ? [firstParentId.current] : [])
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* Search */
  const [search, setSearch] = useState("");
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return null; // null means show tree
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.name_ar.includes(q) ||
        c.name_en.toLowerCase().includes(q)
    );
  }, [categories, search]);

  /* Dialog state */
  const [catDialog, setCatDialog] = useState<CatDialog>({ open: false, mode: "add" });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>({ open: false });

  function openAdd() {
    setCatDialog({ open: true, mode: "add" });
  }
  function openEdit(cat: InventoryCategory) {
    setCatDialog({ open: true, mode: "edit", category: cat });
  }
  function openAddChild(parentId: string) {
    setCatDialog({ open: true, mode: "add-child", parentId });
  }
  function openDelete(cat: InventoryCategory) {
    setDeleteDialog({ open: true, category: cat });
  }

  /* Delete is blocked when category or any child has items */
  function isDeleteBlocked(cat: InventoryCategory): boolean {
    if (cat.item_count > 0) return true;
    return (childrenOf[cat.id] ?? []).some((c) => c.item_count > 0);
  }

  /* Derived */
  const totalCount  = categories.length;
  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTree     = !showSkeleton && !showError && !isEmpty;

  const pageActions = can("inventory.category.manage") ? (
    <Button size="sm" onClick={openAdd}>
      <Plus className="h-4 w-4 me-1.5" />
      {t("categories.new")}
    </Button>
  ) : null;

  /* ─── Row renderers ─────────────────────────────────────────── */

  function renderParentRow(cat: InventoryCategory) {
    const kids        = childrenOf[cat.id] ?? [];
    const isExpanded  = expanded.has(cat.id);
    const hasChildren = kids.length > 0;

    return (
      <div key={cat.id}>
        <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 group">
          {/* Expand toggle */}
          <button
            type="button"
            className="h-5 w-5 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => hasChildren && toggle(cat.id)}
            aria-label={isExpanded ? "collapse" : "expand"}
          >
            {hasChildren ? (
              isExpanded
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
            ) : (
              <span className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Icon */}
          <Layers className="h-4 w-4 text-muted-foreground shrink-0" />

          {/* Name */}
          <span className="flex-1 text-sm font-medium leading-tight truncate">
            {lang === "ar" ? cat.name_ar : cat.name_en}
          </span>

          {/* Item count badge */}
          <Badge variant="secondary" className="tabular-nums text-xs shrink-0">
            {cat.item_count}
          </Badge>

          {/* Actions */}
          {can("inventory.category.manage") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(cat)}>
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAddChild(cat.id)}>
                  {t("actions.add_child")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => openDelete(cat)}
                >
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {kids.map((child) => renderChildRow(child))}
          </div>
        )}
      </div>
    );
  }

  function renderChildRow(cat: InventoryCategory) {
    return (
      <div
        key={cat.id}
        className="flex items-center gap-2 ps-12 pe-4 py-2 hover:bg-muted/30 group border-s-2 border-border ms-9"
      >
        <Layers className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
        <span className="flex-1 text-sm text-muted-foreground leading-tight truncate">
          {lang === "ar" ? cat.name_ar : cat.name_en}
        </span>
        <Badge variant="outline" className="tabular-nums text-xs shrink-0">
          {cat.item_count}
        </Badge>
        {can("inventory.category.manage") && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(cat)}>
                {t("actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => openDelete(cat)}
              >
                {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  function renderFlatRow(cat: InventoryCategory) {
    const isChild = cat.parent_id !== null;
    return (
      <div
        key={cat.id}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 group",
          isChild && "ps-10"
        )}
      >
        <Layers
          className={cn(
            "h-4 w-4 shrink-0",
            isChild ? "text-muted-foreground/60" : "text-muted-foreground"
          )}
        />
        <span className={cn("flex-1 text-sm leading-tight truncate", isChild && "text-muted-foreground")}>
          {lang === "ar" ? cat.name_ar : cat.name_en}
        </span>
        <Badge variant={isChild ? "outline" : "secondary"} className="tabular-nums text-xs shrink-0">
          {cat.item_count}
        </Badge>
        {can("inventory.category.manage") && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(cat)}>
                {t("actions.edit")}
              </DropdownMenuItem>
              {!isChild && (
                <DropdownMenuItem onClick={() => openAddChild(cat.id)}>
                  {t("actions.add_child")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => openDelete(cat)}
              >
                {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("categories.title")}
        subtitle={totalCount > 0 ? t("categories.count", { n: totalCount }) : undefined}
        actions={pageActions}
      />

      <PageSection padded={false}>
        {/* Toolbar */}
        {!showSkeleton && !showError && !isEmpty && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="ps-8 h-8 text-sm"
                placeholder={t("categories.search_ph")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {showSkeleton && <CatSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={Layers}
              title={t("categories.empty_title")}
              description={t("categories.empty_sub")}
              action={
                can("inventory.category.manage")
                  ? { label: t("categories.new"), onClick: openAdd }
                  : undefined
              }
            />
          </div>
        )}

        {showTree && (
          <div className="divide-y divide-border">
            {filteredCategories !== null
              ? filteredCategories.map(renderFlatRow)
              : parents.map(renderParentRow)}
          </div>
        )}

        {showTree && (
          <div className="flex items-center justify-end px-4 py-2 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("categories.showing", { from: 1, to: totalCount, total: totalCount })}
            </span>
          </div>
        )}
      </PageSection>

      {/* ─── Add / Edit Dialog ──────────────────────────────────── */}
      <CatFormDialog
        key={`${catDialog.mode}-${catDialog.category?.id ?? "new"}`}
        dialog={catDialog}
        categories={categories}
        lang={lang}
        t={t}
        onClose={() => setCatDialog((d) => ({ ...d, open: false }))}
      />

      {/* ─── Delete AlertDialog ──────────────────────────────────── */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>
              {deleteDialog.category && isDeleteBlocked(deleteDialog.category)
                ? t("categories.cant_delete")
                : t("categories.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.category && isDeleteBlocked(deleteDialog.category)
                ? t("categories.delete_blocked_desc")
                : t("categories.delete_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            {deleteDialog.category && isDeleteBlocked(deleteDialog.category) ? (
              <AlertDialogCancel>{t("actions.close")}</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => setDeleteDialog({ open: false })}
                >
                  {t("actions.confirm_delete")}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
