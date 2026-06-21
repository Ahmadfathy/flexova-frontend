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

interface TransferLine {
  _key:    string;
  item_id: string;
  qty:     string;
  uom_id:  string;
}

interface TransferForm {
  from_wh: string;
  to_wh:   string;
  date:    string;
  note:    string;
  lines:   TransferLine[];
}

/* ─── Helpers ────────────────────────────────────────────────── */

function emptyLine(): TransferLine {
  return { _key: crypto.randomUUID(), item_id: "", qty: "", uom_id: "" };
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function emptyForm(): TransferForm {
  return { from_wh: "", to_wh: "", date: todayIso(), note: "", lines: [emptyLine()] };
}

/* ─── Props ──────────────────────────────────────────────────── */

interface NewTransferSheetProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  data:         InventoryFixture | null;
}

/* ─── Component ──────────────────────────────────────────────── */

export function NewTransferSheet({ open, onOpenChange, data }: NewTransferSheetProps) {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";

  const warehouses = data?.warehouses ?? [];
  const allItems   = (data?.items ?? []).filter(it => it.item_type === "stocked");
  const uoms       = data?.uoms ?? [];

  const [form,    setForm]    = useState<TransferForm>(emptyForm);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (open) { setForm(emptyForm()); setErrors({}); setSaving(false); }
  }, [open]);

  /* ── Setters ─────────────────────────────────────────────── */

  const setField = <K extends keyof Omit<TransferForm, "lines">>(k: K, v: TransferForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  function patchLine(key: string, patch: Partial<TransferLine>) {
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key === key ? { ...l, ...patch } : l) }));
  }

  function addLine() {
    setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }));
  }

  function removeLine(key: string) {
    setForm(f => ({ ...f, lines: f.lines.filter(l => l._key !== key) }));
  }

  /* ── Helpers ─────────────────────────────────────────────── */

  function availQty(item_id: string): number | null {
    if (!item_id || !form.from_wh) return null;
    const item = allItems.find(i => i.id === item_id);
    return item?.balances.find(b => b.warehouse_id === form.from_wh)?.qty ?? 0;
  }

  function itemUoms(item_id: string) {
    const item = allItems.find(i => i.id === item_id);
    if (!item) return uoms;
    const ids = new Set(item.units.map(u => u.uom_id));
    return uoms.filter(u => ids.has(u.id));
  }

  /* ── Validation ──────────────────────────────────────────── */

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.from_wh) e.from_wh = t("transfers.from_req");
    if (!form.to_wh)   e.to_wh   = t("transfers.to_req");
    if (form.from_wh && form.to_wh && form.from_wh === form.to_wh)
      e.to_wh = t("transfers.same_wh");
    if (!form.lines.some(l => l.item_id))
      e.lines = t("transfers.lines_req");

    form.lines.forEach((l, i) => {
      if (!l.item_id) { e[`li${i}_item`] = "req"; return; }
      const qty = parseFloat(l.qty);
      if (!l.qty || isNaN(qty) || qty <= 0) {
        e[`li${i}_qty`] = "invalid";
      } else {
        const avail = availQty(l.item_id);
        if (avail !== null && qty > avail) e[`li${i}_qty`] = t("transfers.over_avail");
      }
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
    toast.success(lang === "ar" ? "تم ترحيل التحويل" : "Transfer posted");
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
            <SheetTitle>{t("transfers.new_title")}</SheetTitle>
            <SheetDescription className="sr-only">{t("transfers.new")}</SheetDescription>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* From / To */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("transfers.from_label")}</Label>
                <Select value={form.from_wh} onValueChange={v => setField("from_wh", v)}>
                  <SelectTrigger className={cn(errors.from_wh && "border-destructive")}>
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
                {errors.from_wh && <p className="text-xs text-destructive">{errors.from_wh}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("transfers.to_label")}</Label>
                <Select value={form.to_wh} onValueChange={v => setField("to_wh", v)}>
                  <SelectTrigger className={cn(errors.to_wh && "border-destructive")}>
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
                {errors.to_wh && <p className="text-xs text-destructive">{errors.to_wh}</p>}
              </div>
            </div>

            {/* Date / Note */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("transfers.date_label")}</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setField("date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("transfers.note_label")}</Label>
                <Input
                  value={form.note}
                  onChange={e => setField("note", e.target.value)}
                  placeholder="—"
                />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("transfers.lines_title")}</span>
              </div>

              {errors.lines && <p className="text-xs text-destructive">{errors.lines}</p>}

              <div className="space-y-2">
                {form.lines.map((line, i) => {
                  const avail   = availQty(line.item_id);
                  const lineUoms = itemUoms(line.item_id);
                  const qtyErr  = errors[`li${i}_qty`];

                  return (
                    <div key={line._key} className="rounded-lg border border-border p-3 space-y-2">
                      {/* Item */}
                      <Select
                        value={line.item_id}
                        onValueChange={v => {
                          const baseUom = allItems.find(it => it.id === v)?.base_uom_id ?? "";
                          patchLine(line._key, { item_id: v, uom_id: baseUom });
                        }}
                      >
                        <SelectTrigger className={cn("w-full", errors[`li${i}_item`] && "border-destructive")}>
                          <SelectValue placeholder={t("transfers.line_item")} />
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

                      {/* Qty + UOM + Remove */}
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-0.5">
                          <Input
                            type="number"
                            min={0}
                            step={0.001}
                            value={line.qty}
                            onChange={e => patchLine(line._key, { qty: e.target.value })}
                            placeholder={t("transfers.line_qty")}
                            className={cn(qtyErr && "border-destructive")}
                          />
                          {line.item_id && (
                            <p className={cn("text-xs", qtyErr ? "text-destructive" : "text-muted-foreground")}>
                              {qtyErr
                                ? qtyErr
                                : avail !== null
                                  ? `${t("transfers.available_at")}: ${avail}`
                                  : null}
                            </p>
                          )}
                        </div>

                        <Select
                          value={line.uom_id}
                          onValueChange={v => patchLine(line._key, { uom_id: v })}
                        >
                          <SelectTrigger className="w-28 shrink-0">
                            <SelectValue placeholder={t("transfers.line_uom")} />
                          </SelectTrigger>
                          <SelectContent>
                            {lineUoms.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {lang === "ar" ? u.name_ar : u.name_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

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
                {t("transfers.add_line")}
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
              {t("transfers.post")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Post confirm */}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transfers.post")}</AlertDialogTitle>
            <AlertDialogDescription>{t("transfers.post_confirm")}</AlertDialogDescription>
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
