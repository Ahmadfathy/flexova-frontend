import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { ModalShell }    from "@/components/patterns/ModalShell";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";

import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Badge }   from "@/components/ui/badge";
import { Label }   from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Plus, Search, Tags, MoreVertical, Loader2, X, Pencil, Trash2, Palette,
} from "lucide-react";

import { toast } from "sonner";
import { cn }       from "@/lib/utils";
import { useCan }   from "@/lib/permissions";
import { useItems } from "../items/useItems";
import type { InventoryAttribute, InventoryAttributeValue, InventoryItem } from "../items/types";

/* ─── Live usage helpers (never trust a stale seed counter) ────── */

function countAttributeUsage(attrId: string, items: InventoryItem[]): number {
  return items.filter((it) => it.attributes_used?.includes(attrId)).length;
}

function countValueUsage(attrId: string, valueId: string, items: InventoryItem[]): number {
  let n = 0;
  for (const it of items) {
    for (const v of it.variants ?? []) {
      if (v.attrs[attrId] === valueId) n += 1;
    }
  }
  return n;
}

/* ─── Skeleton ───────────────────────────────────────────────── */

function AttrSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ opacity: 1 - i * 0.15 }}>
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 flex-1 max-w-xs" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ─── No-results ─────────────────────────────────────────────── */

function NoResults({ query, onClear, t }: { query: string; onClear: () => void; t: ReturnType<typeof useTranslation<"inventory">>["t"] }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div className="flex items-center justify-center h-11 w-11 rounded bg-muted text-muted-foreground">
        <Search className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">{t("items.no_results", { q: query })}</p>
      <Button variant="ghost" size="sm" onClick={onClear}>{t("actions.clear_filters")}</Button>
    </div>
  );
}

/* ─── Value row (repeater) ──────────────────────────────────────*/

interface ValueDraft {
  id: string;
  value_ar: string;
  value_en: string;
  swatch_hex: string | null;
  sort_order: number;
  _persisted: boolean;
}

function ValueRow({
  draft, isColor, onChange, onRemove, blocked, t,
}: {
  draft: ValueDraft;
  isColor: boolean;
  onChange: (patch: Partial<ValueDraft>) => void;
  onRemove: () => void;
  blocked: boolean;
  t: ReturnType<typeof useTranslation<"inventory">>["t"];
}) {
  return (
    <div className="flex items-center gap-2">
      {isColor && (
        <input
          type="color"
          value={draft.swatch_hex ?? "#999999"}
          onChange={(e) => onChange({ swatch_hex: e.target.value })}
          className="h-8 w-8 shrink-0 rounded border border-border cursor-pointer bg-transparent"
          aria-label={t("attributes.value_swatch")}
        />
      )}
      <Input
        className="h-8 text-sm"
        placeholder={t("attributes.value_ar")}
        value={draft.value_ar}
        onChange={(e) => onChange({ value_ar: e.target.value })}
      />
      <Input
        className="h-8 text-sm"
        placeholder={t("attributes.value_en")}
        value={draft.value_en}
        onChange={(e) => onChange({ value_en: e.target.value })}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-40"
        disabled={blocked}
        title={blocked ? t("attributes.value_in_use_hint") ?? undefined : undefined}
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ─── Editor dialog ──────────────────────────────────────────── */

type DialogMode = "add" | "edit";
interface AttrDialog {
  open: boolean;
  mode: DialogMode;
  attribute?: InventoryAttribute;
}

function AttributeFormDialog({
  dialog, allValues, allItems, t, onClose, onSave,
}: {
  dialog: AttrDialog;
  allValues: InventoryAttributeValue[];
  allItems: InventoryItem[];
  t: ReturnType<typeof useTranslation<"inventory">>["t"];
  onClose: () => void;
  onSave: (payload: {
    attribute: Omit<InventoryAttribute, "used_by_products"> & { used_by_products?: number };
    values: ValueDraft[];
  }) => void;
}) {
  const editing = dialog.mode === "edit" ? dialog.attribute : undefined;

  const [nameAr, setNameAr] = useState(editing?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(editing?.name_en ?? "");
  const [type, setType]     = useState<InventoryAttribute["type"]>(editing?.type ?? "list");
  const [numberUnit, setNumberUnit] = useState(editing?.number_unit ?? "");
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  const [values, setValues] = useState<ValueDraft[]>(() =>
    editing
      ? allValues
          .filter((v) => v.attribute_id === editing.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => ({ id: v.id, value_ar: v.value_ar, value_en: v.value_en, swatch_hex: v.swatch_hex, sort_order: v.sort_order, _persisted: true }))
      : []
  );

  function addValue() {
    setValues((vs) => [
      ...vs,
      { id: `av_new_${Date.now()}_${vs.length}`, value_ar: "", value_en: "", swatch_hex: type === "color" ? "#999999" : null, sort_order: vs.length + 1, _persisted: false },
    ]);
  }

  function patchValue(id: string, patch: Partial<ValueDraft>) {
    setValues((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function removeValue(v: ValueDraft) {
    if (v._persisted && editing && countValueUsage(editing.id, v.id, allItems) > 0) return; // guarded — cant_delete
    setValues((vs) => vs.filter((x) => x.id !== v.id));
  }

  async function handleSave() {
    if (!nameAr.trim()) {
      setError(t("attributes.form_name_ar_req"));
      return;
    }
    if ((type === "list" || type === "color") && values.some((v) => !v.value_ar.trim())) {
      setError(t("attributes.form_name_ar_req"));
      return;
    }

    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);

    onSave({
      attribute: {
        id: editing?.id ?? `attr_${Date.now()}`,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
        type,
        number_unit: type === "number" ? (numberUnit.trim() || null) : null,
        status: editing?.status ?? "active",
      },
      values: type === "number" ? [] : values,
    });
  }

  return (
    <ModalShell
      open={dialog.open}
      onOpenChange={(v) => !v && onClose()}
      title={dialog.mode === "edit" ? t("attributes.editor_edit_title") : t("attributes.editor_new_title")}
      description={dialog.mode === "edit" ? t("attributes.editor_edit_title") : t("attributes.editor_new_title")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>{t("actions.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("actions.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="attr-name-ar">
              {t("attributes.form_name_ar")}<span className="text-destructive ms-0.5">*</span>
            </Label>
            <Input id="attr-name-ar" value={nameAr} autoFocus
              onChange={(e) => { setNameAr(e.target.value); setError(""); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attr-name-en">{t("attributes.form_name_en")}</Label>
            <Input id="attr-name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="space-y-1.5">
          <Label>{t("attributes.form_type")}</Label>
          <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/40">
            {(["list", "color", "number"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setType(opt)}
                className={cn(
                  "px-3 h-7 text-xs rounded-sm font-medium transition-colors",
                  type === opt ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`attribute.type_${opt}`)}
              </button>
            ))}
          </div>
        </div>

        {type === "number" ? (
          <div className="space-y-1.5">
            <Label htmlFor="attr-unit">{t("attributes.form_number_unit")}</Label>
            <Input id="attr-unit" value={numberUnit} onChange={(e) => setNumberUnit(e.target.value)} placeholder={t("attributes.form_number_unit")} />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("attributes.values_title")}</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addValue}>
                {t("attributes.add_value")}
              </Button>
            </div>
            <div className="space-y-2">
              {values.map((v) => (
                <ValueRow
                  key={v.id}
                  draft={v}
                  isColor={type === "color"}
                  onChange={(patch) => patchValue(v.id, patch)}
                  onRemove={() => removeValue(v)}
                  blocked={v._persisted && !!editing && countValueUsage(editing.id, v.id, allItems) > 0}
                  t={t}
                />
              ))}
              {values.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("attributes.add_value")}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export function AttributesPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can  = useCan();

  const { data, loading, error, isOffline, reload, mutate } = useItems();

  const attributes = data?.attributes ?? [];
  const attributeValues = data?.attribute_values ?? [];
  const items = data?.items ?? [];

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return attributes;
    const q = search.toLowerCase();
    return attributes.filter((a) => a.name_ar.includes(q) || a.name_en.toLowerCase().includes(q));
  }, [attributes, search]);

  const [dialog, setDialog] = useState<AttrDialog>({ open: false, mode: "add" });
  const [deleteTarget, setDeleteTarget] = useState<InventoryAttribute | null>(null);

  const showSkeleton = loading && !data;
  const showError    = !!error && !isOffline;
  const isEmpty       = !showSkeleton && !showError && attributes.length === 0;
  const hasNoResults  = !isEmpty && filtered.length === 0 && search.trim().length > 0;
  const showTable     = !showSkeleton && !showError && !isEmpty && !hasNoResults;

  function valuesFor(attrId: string) {
    return attributeValues.filter((v) => v.attribute_id === attrId);
  }

  function handleSave({ attribute, values }: { attribute: Omit<InventoryAttribute, "used_by_products"> & { used_by_products?: number }; values: ValueDraft[] }) {
    const isEdit = dialog.mode === "edit";
    mutate((prev) => {
      if (!prev) return prev;
      const nextAttributes = isEdit
        ? prev.attributes.map((a) => (a.id === attribute.id ? { ...a, ...attribute, used_by_products: a.used_by_products } : a))
        : [...prev.attributes, { ...attribute, used_by_products: 0 }];

      const otherValues = prev.attribute_values.filter((v) => v.attribute_id !== attribute.id);
      const nextValues: InventoryAttributeValue[] = [
        ...otherValues,
        ...values.map((v, idx) => ({
          id: v.id, attribute_id: attribute.id, value_ar: v.value_ar.trim(), value_en: v.value_en.trim(),
          swatch_hex: v.swatch_hex, sort_order: idx + 1,
        })),
      ];

      return { ...prev, attributes: nextAttributes, attribute_values: nextValues };
    });
    toast.success(isEdit ? t("attributes.updated_toast") : t("attributes.created_toast"));
    setDialog({ open: false, mode: "add" });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    mutate((prev) => prev && {
      ...prev,
      attributes: prev.attributes.filter((a) => a.id !== deleteTarget.id),
      attribute_values: prev.attribute_values.filter((v) => v.attribute_id !== deleteTarget.id),
    });
    toast.success(t("attributes.deleted_toast"));
    setDeleteTarget(null);
  }

  const deleteBlocked = deleteTarget ? countAttributeUsage(deleteTarget.id, items) > 0 : false;

  const pageActions = can("inventory.attribute.manage") ? (
    <Button size="sm" onClick={() => setDialog({ open: true, mode: "add" })}>
      <Plus className="h-4 w-4 me-1.5" />
      {t("attributes.new")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("attributes.title")}
        count={attributes.length > 0 ? t("attributes.count", { n: attributes.length }) : undefined}
        actions={pageActions}
        alert={isOffline ? <OfflineBanner message={t("offline.banner")} /> : undefined}
      />

      <PageSection padded={false}>
        {!showSkeleton && !showError && !isEmpty && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="ps-8 h-8 text-sm"
                placeholder={t("attributes.search_ph")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {showSkeleton && <AttrSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={Tags}
              title={t("attributes.empty_title")}
              description={t("attributes.empty_sub")}
              action={can("inventory.attribute.manage") ? { label: t("attributes.new"), onClick: () => setDialog({ open: true, mode: "add" }) } : undefined}
            />
          </div>
        )}

        {hasNoResults && <NoResults query={search} onClear={() => setSearch("")} t={t} />}

        {showTable && (
          <div className="divide-y divide-border">
            {filtered.map((attr) => {
              const vals = valuesFor(attr.id);
              const usedBy = countAttributeUsage(attr.id, items);
              return (
                <div key={attr.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 group">
                  {attr.type === "color"
                    ? <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <Tags className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {lang === "ar" ? attr.name_ar : (attr.name_en || attr.name_ar)}
                    </p>
                    {attr.name_en && attr.name_ar !== attr.name_en && (
                      <p className="text-xs text-muted-foreground leading-tight truncate">
                        {lang === "ar" ? attr.name_en : attr.name_ar}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{t(`attribute.type_${attr.type}`)}</Badge>
                  <span className="text-xs text-muted-foreground tabular-nums w-14 text-end shrink-0">
                    {attr.type === "number" ? "—" : vals.length}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums w-28 text-end shrink-0">
                    {usedBy > 0 ? t("attribute.in_use", { n: usedBy }) : "—"}
                  </span>
                  {can("inventory.attribute.manage") && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <RowActionsContent>
                        <RowActionItem icon={Pencil} onClick={() => setDialog({ open: true, mode: "edit", attribute: attr })}>
                          {t("actions.edit")}
                        </RowActionItem>
                        <DropdownMenuSeparator />
                        <RowActionItem icon={Trash2} destructive onClick={() => setDeleteTarget(attr)}>
                          {t("actions.delete")}
                        </RowActionItem>
                      </RowActionsContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showTable && (
          <div className="flex items-center justify-end px-4 py-2 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("attributes.showing", { from: filtered.length > 0 ? 1 : 0, to: filtered.length, total: filtered.length })}
            </span>
          </div>
        )}
      </PageSection>

      <AttributeFormDialog
        key={`${dialog.mode}-${dialog.attribute?.id ?? "new"}`}
        dialog={dialog}
        allValues={attributeValues}
        allItems={items}
        t={t}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteBlocked ? t("attribute.cant_delete") : t("attributes.delete_title")}
        description={deleteBlocked ? t("attribute.in_use", { n: countAttributeUsage(deleteTarget?.id ?? "", items) }) : t("attributes.delete_desc")}
        cancelLabel={deleteBlocked ? t("actions.close") : t("actions.cancel")}
        confirmTone="danger"
        confirmLabel={t("actions.confirm_delete")}
        onConfirm={deleteBlocked ? undefined : confirmDelete}
      />
    </div>
  );
}
