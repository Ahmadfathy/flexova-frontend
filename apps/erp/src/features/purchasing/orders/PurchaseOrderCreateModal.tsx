import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePurchasingData, type InventoryItem } from "../data/usePurchasingData";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function newPoLine() {
  return {
    _key: `${Date.now()}-${Math.random()}`,
    item_id: "", uom_id: "", qty: "1", price: "0",
  };
}

interface PoForm {
  supplier_id:       string;
  date:              string;
  expected_delivery: string;
  warehouse_id:      string;
}

interface PoLine {
  _key:    string;
  item_id: string;
  uom_id:  string;
  qty:     string;
  price:   string;
}

interface PurchaseOrderCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseOrderCreateModal({ open, onOpenChange }: PurchaseOrderCreateModalProps) {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language?.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data } = usePurchasingData();

  const [form, setForm]   = useState<PoForm>({
    supplier_id: "", date: today(), expected_delivery: "", warehouse_id: "",
  });
  const [lines, setLines] = useState<PoLine[]>([newPoLine()]);
  const [saving, setSaving] = useState(false);

  const set = useCallback(
    <K extends keyof PoForm>(k: K, v: string) =>
      setForm(prev => ({ ...prev, [k]: v })),
    [],
  );

  function itemUomIds(item: InventoryItem) {
    const ids = new Set([item.base_uom_id]);
    item.units.forEach(u => ids.add(u.uom_id));
    return Array.from(ids);
  }

  const subtotal = lines.reduce((s, l) => {
    return s + (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0);
  }, 0);

  const hasLines = lines.some(l => l.item_id && (parseFloat(l.qty) || 0) > 0);
  const isValid  = form.supplier_id && form.date && form.expected_delivery && form.warehouse_id && hasLines;

  function onClose() {
    setForm({ supplier_id: "", date: today(), expected_delivery: "", warehouse_id: "" });
    setLines([newPoLine()]);
    onOpenChange(false);
  }

  async function handleSave(send: boolean) {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onClose();
    toast.success(send ? t("orders.sent_toast") : t("orders.saved_toast"));
  }

  if (!data) return null;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("orders.form_title")}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t("common:cancel", "Cancel")}</Button>
          <Button
            variant="outline"
            disabled={!isValid || saving}
            onClick={() => handleSave(false)}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("orders.save_draft")}
          </Button>
          <Button
            disabled={!isValid || saving}
            onClick={() => handleSave(true)}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("orders.send_po")}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs text-muted-foreground">{t("orders.supplier_label")} *</Label>
              <Select value={form.supplier_id} onValueChange={v => set("supplier_id", v)}>
                <SelectTrigger className={cn(!form.supplier_id && "border-muted-foreground/40")}>
                  <SelectValue placeholder={t("orders.supplier_ph")} />
                </SelectTrigger>
                <SelectContent>
                  {data.suppliers.filter(s => s.status === "active").map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {lang === "ar" ? s.name_ar : s.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("orders.col_date")} *</Label>
              <DatePicker value={form.date} onChange={val => set("date", val)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("orders.delivery_label")} *</Label>
              <DatePicker
                value={form.expected_delivery}
                min={form.date}
                onChange={val => set("expected_delivery", val)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("orders.warehouse_label")} *</Label>
              <Select value={form.warehouse_id} onValueChange={v => set("warehouse_id", v)}>
                <SelectTrigger className={cn(!form.warehouse_id && "border-muted-foreground/40")}>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {data.warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {lang === "ar" ? w.name_ar : w.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lines */}
          <div className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">{t("orders.col_item")}</TableHead>
                  <TableHead className="text-xs w-24">{t("orders.col_uom")}</TableHead>
                  <TableHead className="text-xs w-20">{t("orders.col_qty")}</TableHead>
                  <TableHead className="text-xs w-28">{t("orders.col_price")}</TableHead>
                  <TableHead className="text-xs w-28">{t("orders.col_line_total")}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(line => {
                  const item = line.item_id ? data.items.find(i => i.id === line.item_id) : null;
                  const relevantUoms = item
                    ? data.uoms.filter(u => itemUomIds(item).includes(u.id))
                    : data.uoms;
                  const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.price) || 0);
                  return (
                    <TableRow key={line._key}>
                      <TableCell className="p-1">
                        <Select
                          value={line.item_id}
                          onValueChange={itemId => {
                            const it = data.items.find(i => i.id === itemId);
                            setLines(prev => prev.map(l => l._key !== line._key ? l : {
                              ...l,
                              item_id: itemId,
                              uom_id:  it?.base_uom_id ?? "",
                              price:   String(it?.last_purchase_price ?? 0),
                            }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={t("editor.select_item")} />
                          </SelectTrigger>
                          <SelectContent>
                            {data.items
                              .filter(i => i.status === "active" || i.id === line.item_id)
                              .map(i => (
                                <SelectItem key={i.id} value={i.id}>
                                  {lang === "ar" ? i.name_ar : i.name_en}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <Select
                          value={line.uom_id}
                          onValueChange={v => setLines(prev => prev.map(l => l._key === line._key ? { ...l, uom_id: v } : l))}
                          disabled={!line.item_id}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {relevantUoms.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {lang === "ar" ? u.name_ar : u.name_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number" min={0.001} step="any"
                          className="h-8 text-xs tabular-nums text-start"
                          value={line.qty}
                          onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, qty: e.target.value } : l))}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number" min={0} step="0.01"
                          className="h-8 text-xs tabular-nums text-start"
                          value={line.price}
                          onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, price: e.target.value } : l))}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-start tabular-nums font-medium pe-3">
                        {formatMoney(lineTotal, lang)}
                      </TableCell>
                      <TableCell className="p-1 w-8">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-danger"
                          onClick={() => setLines(prev => prev.filter(l => l._key !== line._key))}
                          disabled={lines.length === 1}
                        >
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-3 py-2 border-t border-border">
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 text-muted-foreground text-xs"
                onClick={() => setLines(prev => [...prev, newPoLine()])}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("orders.add_item")}
              </Button>
              <span className="text-sm font-semibold tabular-nums">
                {t("view.subtotal")}: {formatMoney(subtotal, lang)}
              </span>
            </div>
          </div>
        </div>
    </ModalShell>
  );
}
