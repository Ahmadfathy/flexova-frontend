import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useMfgOrders } from "@/stores/mfgOrders";
import { getItems } from "@/lib/mock/mfg";
import type { ManufacturingOrder } from "@/types/mfg";

interface IssueLine {
  _key: string;
  item_id: string;
  qty: string;
}

function emptyLine(): IssueLine {
  return { _key: crypto.randomUUID(), item_id: "", qty: "" };
}

interface ManualIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mo: ManufacturingOrder;
  stageId: string;
  stageName: string;
}

/** FE_14 §7.3 — advanced manual material issue for a stage, only offered when issue_mode=manual. */
export function ManualIssueDialog({ open, onOpenChange, mo, stageId, stageName }: ManualIssueDialogProps) {
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const can = useCan();
  const addManualMaterialIssue = useMfgOrders((s) => s.addManualMaterialIssue);
  const items = getItems();

  const [lines, setLines] = useState<IssueLine[]>([emptyLine()]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setLines([emptyLine()]); setError(""); }
  }, [open]);

  function itemName(id: string) {
    const item = items.find((i) => i.id === id);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : id;
  }
  function availableFor(itemId: string): number {
    const item = items.find((i) => i.id === itemId);
    return item?.balances.find((b) => b.warehouse_id === mo.wh_raw)?.qty ?? 0;
  }

  function patchLine(key: string, patch: Partial<IssueLine>) {
    setLines((ls) => ls.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: string) {
    setLines((ls) => ls.filter((l) => l._key !== key));
  }
  function addLine() {
    setLines((ls) => [...ls, emptyLine()]);
  }

  function handleConfirm() {
    const valid = lines.filter((l) => l.item_id && parseFloat(l.qty) > 0);
    if (valid.length === 0) { setError(t("mo.issue_lines_required")); return; }

    const anyOverAvailable = valid.some((l) => parseFloat(l.qty) > availableFor(l.item_id));

    addManualMaterialIssue(mo.id, {
      stage_id: stageId,
      lines: valid.map((l) => {
        const item = items.find((i) => i.id === l.item_id)!;
        return { item_id: item.id, qty: parseFloat(l.qty), unit_cost: item.avg_cost };
      }),
    });

    if (anyOverAvailable) toast.warning(t("mo.issue_over_available_warning"));
    toast.success(t("mo.issue_saved_toast"));
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("mo.issue_modal_title", { stage: stageName })}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("new.cancel")}</Button>
          <Button onClick={handleConfirm} disabled={!can("mfg.material.issue")}>{t("mo.issue_confirm")}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="text-xs text-destructive">{error}</p>}
        {lines.map((l) => {
          const available = l.item_id ? availableFor(l.item_id) : null;
          return (
            <div key={l._key} className="flex items-start gap-2">
              <Select value={l.item_id} onValueChange={(v) => patchLine(l._key, { item_id: v })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder={t("mo.issue_modal_item")} /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{itemName(i.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-28 space-y-0.5">
                <Input
                  type="number" min={0} step={0.01} value={l.qty}
                  onChange={(e) => patchLine(l._key, { qty: e.target.value })}
                  placeholder={t("mo.issue_modal_qty")}
                />
                {available !== null && (
                  <p className="text-xs text-muted-foreground">{t("mo.issue_available_note", { n: available })}</p>
                )}
              </div>
              <Button
                variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeLine(l._key)} disabled={lines.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        <Button variant="outline" size="sm" className="w-full" onClick={addLine}>
          <Plus className="h-4 w-4 me-1.5" />
          {t("new.add_line")}
        </Button>
      </div>
    </ModalShell>
  );
}
