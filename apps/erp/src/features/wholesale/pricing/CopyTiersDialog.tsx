import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { WholesaleItem } from "@/types/wholesale";

interface CopyTiersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceItem: WholesaleItem | undefined;
  /** Candidate targets — every other item in this price list. */
  targetItems: WholesaleItem[];
  lang: "ar" | "en";
  onCopy: (targetItemIds: string[]) => void;
}

/** "نسخ الشرائح إلى…" bulk action (FE_13 §11) — item multi-select, no category
 * pre-filter (the fixture items have no category field to filter by). */
export function CopyTiersDialog({ open, onOpenChange, sourceItem, targetItems, lang, onCopy }: CopyTiersDialogProps) {
  const { t } = useTranslation("wholesale");
  const { t: tCommon } = useTranslation("common");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("editor.copy_dialog_title")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button
            disabled={selected.size === 0}
            onClick={() => onCopy(Array.from(selected))}
          >
            {t("editor.copy_apply")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {t("editor.copy_source_label")}: <span className="font-medium text-foreground">
            {sourceItem ? (lang === "ar" ? sourceItem.name_ar : sourceItem.name_en) : ""}
          </span>
        </p>
        <p className="text-xs font-medium text-foreground">{t("editor.copy_targets_label")}</p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {targetItems.map((item) => (
            <label key={item.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/40 cursor-pointer text-sm">
              <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} />
              {lang === "ar" ? item.name_ar : item.name_en}
            </label>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
