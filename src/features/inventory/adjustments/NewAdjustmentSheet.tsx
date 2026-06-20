import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Loader2, Plus, Trash2 } from "lucide-react";

import { cn }     from "@/lib/utils";
import type { InventoryFixture } from "../items/types";

/* ─── Types ──────────────────────────────────────────────────── */

interface AdjLine {
  _key:    string;
  item_id: string;
  qty:     string;
}

interface AdjForm {
  warehouse_id: string;
  date:         string;
  reason:       string;
  note:         string;
  lines:        AdjLine[];
}

const REASONS = ["damage", "spoilage", "count", "gift", "fix"] as const;

/* ─── Helpers ────────────────────────────────────────────────── */

function emptyLine(): AdjLine {
  return { _key: crypto.randomUUID(), item_id: "", qty: "" };
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function emptyForm(): AdjForm {
  return { warehouse_id: "", date: todayIso(), reason: "", note: "", lines: [emptyLine()] };
}

/* ─── Props ──────────────────────────────────────────────────── */

interface NewAdjustmentSheetProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  data:         InventoryFixture | null;
}

/* ─── Component ──────────────────────────────────────────────── */

export function NewAdjustmentSheet({ open, onOpenChange, data }: NewAdjustmentSheetProps) {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";

  const warehouses = data?.warehouses ?? [];
  const allItems   = (data?.items ?? []).filter(it => it.item_type === "stocked");

  const [form,    setForm]    = useState<AdjForm>(emptyForm);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (open) { setForm(emptyForm()); setErrors({}); setSaving(false); }
  }, [open]);

  /* ── Setters ─────────────────────────────────────────────── */

  const setField = <K extends keyof Omit<AdjForm, "lines">>(k: K, v: AdjForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  function patchLine(key: string, patch: Partial<AdjLine>) {
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key === key ? { ...l, ...patch } : l) }));
  }

  function addLine() {
    setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }));
  }

  function removeLine(key: string) {
    setForm(f => ({ ...f, lines: f.lines.filter(l => l._key !== key) }));
  }

  /* ── Helpers ─────────────────────────────────────────────── */

  function currentBalance(item_id: string): number | null {
    if (!item_id || !form.warehouse_id) return null;
    const item = allItems.find(i => i.id === item_id);
    return item?.balances.find(b => b.warehouse_id === form.warehouse_id)?.qty ?? 0;
  }

  /* ── Validation ──────────────────────────────────────────── */

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.warehouse_id) e.warehouse_id = t("adjustments.wh_req");
    if (!form.reason)       e.reason       = t("adjustments.reason_req");
    if (!form.lines.some(l => l.item_id))  e.lines = t("adjustments.lines_req");

    form.lines.forEach((l, i) => {
      if (!l.item_id) { e[`li${i}_item`] = "req"; return; }
      const qty = parseFloat(l.qty);
      if (!l.qty || isNaN(qty) || qty === 0) e[`li${i}_qty`] = "invalid";
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── Actions ─────────────────────────────────────────────── */

  function handlePost() {
    if (validate()) setConfirm(true);
  }

  async function doPost() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    onOpenChange(false);
    toast.success(lang === "ar" ? "تم ترحيل التسوية" : "Adjustment posted");
  }

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex flex-col p-0 w-full sm:max-w-xl"
        >
          {/* Header */}
          <SheetHeader className="shrink-0 px-6 py-4 border-b border-border">
            <SheetTitle>{t("adjustments.new_title")}</SheetTitle>
            <SheetDescription className="sr-only">{t("adjustments.new")}</SheetDescription>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Warehouse + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("adjustments.wh_label")}</Label>
                <Select value={form.warehouse_id} onValueChange={v => setField("warehouse_id", v)}>
                  <SelectTrigger className={cn(errors.warehouse_id && "border-destructive")}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(wh => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {lang === "ar" ? wh.name_ar : wh.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.warehouse_id && (
                  <p className="text-xs text-destructive">{errors.warehouse_id}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("adjustments.date_label")}</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setField("date", e.target.value)}
                />
              </div>
            </div>

            {/* Reason + Note */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("adjustments.reason_label")}</Label>
                <Select value={form.reason} onValueChange={v => setField("reason", v)}>
                  <SelectTrigger className={cn(errors.reason && "border-destructive")}>
                    <SelectValue placeholder={t("adjustments.reason_ph")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map(r => (
                      <SelectItem key={r} value={r}>
                        {t(`adjustments.reason_${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("adjustments.note_label")}</Label>
                <Input
                  value={form.note}
                  onChange={e => setField("note", e.target.value)}
                  placeholder="—"
                />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <span className="text-sm font-medium">{t("adjustments.lines_title")}</span>

              {errors.lines && <p className="text-xs text-destructive">{errors.lines}</p>}

              <div className="space-y-2">
                {form.lines.map((line, i) => {
                  const balance = currentBalance(line.item_id);
                  const qtyErr  = errors[`li${i}_qty`];
                  const qty     = parseFloat(line.qty);
                  const newBal  = balance !== null && !isNaN(qty) ? balance + qty : null;

                  return (
                    <div key={line._key} className="rounded-lg border border-border p-3 space-y-2">
                      {/* Item */}
                      <Select
                        value={line.item_id}
                        onValueChange={v => patchLine(line._key, { item_id: v })}
                      >
                        <SelectTrigger className={cn("w-full", errors[`li${i}_item`] && "border-destructive")}>
                          <SelectValue placeholder={t("adjustments.line_item")} />
                        </SelectTrigger>
                        <SelectContent>
                          {allItems.map(it => (
                            <SelectItem key={it.id} value={it.id}>
                              <span>{lang === "ar" ? it.name_ar : it.name_en}</span>
                              <span className="ms-2 text-xs text-muted-foreground font-mono">{it.code}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Qty (signed) + Remove */}
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-0.5">
                          <Input
                            type="number"
                            step={0.001}
                            value={line.qty}
                            onChange={e => patchLine(line._key, { qty: e.target.value })}
                            placeholder={t("adjustments.qty_signed")}
                            className={cn(qtyErr && "border-destructive")}
                          />
                          {line.item_id && balance !== null && (
                            <p className={cn("text-xs", qtyErr ? "text-destructive" : "text-muted-foreground")}>
                              {qtyErr
                                ? qtyErr
                                : newBal !== null
                                  ? `${balance} → ${newBal}`
                                  : `${lang === "ar" ? "الرصيد الحالي" : "Current balance"}: ${balance}`}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLine(line._key)}
                          disabled={form.lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={addLine}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("adjustments.add_line")}
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-border flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={handlePost} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("adjustments.post")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Post confirm */}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adjustments.post")}</AlertDialogTitle>
            <AlertDialogDescription>{t("adjustments.post_confirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doPost} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("actions.post")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
