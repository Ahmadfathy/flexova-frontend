import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { useItems } from "../items/useItems";
import type { InventoryCategory } from "../items/types";

function getDepth(catId: string, cats: InventoryCategory[]): number {
  const cat = cats.find((c) => c.id === catId);
  if (!cat || !cat.parent_id) return 1;
  return 1 + getDepth(cat.parent_id, cats);
}

interface CategoryCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryCreateModal({ open, onOpenChange }: CategoryCreateModalProps) {
  const { t, i18n } = useTranslation("inventory");
  const lang = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const { data } = useItems();
  const categories: InventoryCategory[] = data?.categories ?? [];

  const [name, setName]         = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);

  const roots = useMemo(
    () => categories.filter((c) => c.parent_id === null),
    [categories]
  );
  const children = useMemo(
    () => categories.filter((c) => c.parent_id !== null),
    [categories]
  );

  function onClose() {
    setName("");
    setParentId("");
    setError("");
    onOpenChange(false);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError(t("categories.form_name_required"));
      return;
    }
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
      title={t("categories.new")}
      description={t("categories.new")}
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

        <div className="space-y-1.5">
          <Label htmlFor="cat-parent">{t("categories.form_parent")}</Label>
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
              {roots.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {lang === "ar" ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
              {children.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {"── "}
                  {lang === "ar" ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ModalShell>
  );
}
