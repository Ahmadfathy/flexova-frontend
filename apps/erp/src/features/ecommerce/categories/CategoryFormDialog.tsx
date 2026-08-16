import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EcStoreCategory } from "../types";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to create; pass to edit. */
  category?: EcStoreCategory;
  /** All other categories — parent picker + self-parenting guard. */
  categories: EcStoreCategory[];
  onSave: (input: Omit<EcStoreCategory, "id">) => void;
}

const EMPTY = { name_ar: "", name_en: "", parent_id: "", seo_slug: "" };

/** spec §4 — marketing category tree, add/edit. One dialog handles both;
 * same shape `WarehouseCreateModal` established for a simple entity form. */
export function CategoryFormDialog({ open, onOpenChange, category, categories, onSave }: CategoryFormDialogProps) {
  const { t } = useTranslation("ecommerce");
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        category
          ? { name_ar: category.name_ar, name_en: category.name_en, parent_id: category.parent_id ?? "", seo_slug: category.seo_slug }
          : EMPTY
      );
      setError("");
    }
  }, [open, category]);

  function handleSave() {
    if (!form.name_ar.trim()) {
      setError(t("categories.form_name_required"));
      return;
    }
    onSave({
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      parent_id: form.parent_id || null,
      seo_slug: form.seo_slug.trim(),
    });
    onOpenChange(false);
  }

  // Can't be its own parent, and (single level of protection) can't pick
  // one of its own direct children as its parent either.
  const parentOptions = categories.filter((c) => c.id !== category?.id && c.parent_id !== category?.id);

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={category ? t("categories.edit_title") : t("categories.new_title")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("categories.cancel")}</Button>
          <Button onClick={handleSave}>{t("categories.save")}</Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="cat-name-ar">{t("categories.field_name_ar")} <span className="text-destructive ms-0.5">*</span></Label>
          <Input id="cat-name-ar" value={form.name_ar} onChange={(e) => { setForm((f) => ({ ...f, name_ar: e.target.value })); setError(""); }} autoFocus />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-name-en">{t("categories.field_name_en")}</Label>
          <Input id="cat-name-en" dir="ltr" value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-parent">{t("categories.field_parent")}</Label>
          <Select value={form.parent_id || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === "__none__" ? "" : v }))}>
            <SelectTrigger id="cat-parent"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("categories.field_parent_none")}</SelectItem>
              {parentOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-slug">{t("categories.field_slug")}</Label>
          <Input id="cat-slug" dir="ltr" value={form.seo_slug} onChange={(e) => setForm((f) => ({ ...f, seo_slug: e.target.value }))} placeholder="men-shoes" />
        </div>
      </div>
    </ModalShell>
  );
}
