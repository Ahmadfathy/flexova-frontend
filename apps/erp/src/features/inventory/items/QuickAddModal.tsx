import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ModalShell } from "@/components/patterns/ModalShell";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { Loader2 } from "lucide-react";

import { cn }       from "@/lib/utils";
import { useCan }   from "@/lib/permissions";
import { isFlagEnabled } from "@/lib/flags";
import { useItems } from "./useItems";
import type { InventoryItem } from "./types";

/* ─── Helpers ────────────────────────────────────────────────── */

function genSku(): string {
  return "SKU-" + Math.floor(1000 + Math.random() * 9000).toString();
}

/* ─── Props ──────────────────────────────────────────────────── */

interface QuickAddModalProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
}

/* ─── Component ──────────────────────────────────────────────── */

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const { t, i18n } = useTranslation("inventory");
  const { data, mutate } = useItems();
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();
  const navigate     = useNavigate();
  const variantsFlagOn = isFlagEnabled("inventory.variants");

  const units      = data?.uoms ?? [];
  const categories = data?.categories ?? [];

  const autoCode = useRef(genSku());

  const [form, setForm] = useState({
    name_ar:     "",
    category_id: "",
    base_uom_id: units[0]?.id ?? "",
    sale_price:  "",
    code:        "",
    codeAuto:    true,
    has_variants: false,
  });
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      autoCode.current = genSku();
      setForm((f) => ({
        ...f,
        name_ar:     "",
        category_id: "",
        base_uom_id: units[0]?.id ?? f.base_uom_id,
        sale_price:  "",
        code:        "",
        codeAuto:    true,
        has_variants: false,
      }));
      setError("");
      setSaving(false);
    }
  }, [open, units]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const displayCode = form.codeAuto ? autoCode.current : form.code;

  async function handleAdd() {
    if (!form.name_ar.trim()) {
      setError(t("quickadd.name_required"));
      return;
    }
    if (!can("inventory.item.create")) return;

    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);

    // DD-1 — has_variants routes into the Item Editor to build the matrix;
    // the parent itself carries no balance/price (D1) and no barcode (D6/§3).
    if (form.has_variants) {
      const newId = `it_${Date.now()}`;
      const newItem: InventoryItem = {
        id: newId,
        code: displayCode,
        name_ar: form.name_ar.trim(),
        name_en: "",
        item_type: "stocked",
        category_id: form.category_id,
        base_uom_id: form.base_uom_id,
        barcodes: [],
        image: null,
        tax_type_id: data?.tax_types[0]?.id ?? "",
        eta_code: "",
        reorder_level: null,
        max_level: null,
        status: "active",
        incomplete: false,
        prices: {},
        last_purchase_price: null,
        avg_cost: null,
        units: [{ uom_id: form.base_uom_id, factor: 1, barcode: null, unit_price: 0 }],
        balances: [],
        is_product_parent: true,
        has_variants_flag: true,
        attributes_used: [],
        variants: [],
        rollup: { balance_total: 0, price_range: { min: 0, max: 0 }, any_low_stock: false },
      };
      mutate((prev) => prev && { ...prev, items: [newItem, ...prev.items] });
      onOpenChange(false);
      navigate(`/inventory/items/${newId}`);
      return;
    }

    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("quickadd.title")}
      description={t("quickadd.hint")}
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("quickadd.add")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
          {/* Name AR — required */}
          <div className="space-y-1.5">
            <Label htmlFor="qa-name">
              {t("quickadd.name_ar")}
              <span className="text-destructive ms-0.5">*</span>
            </Label>
            <Input
              id="qa-name"
              value={form.name_ar}
              onChange={(e) => { set("name_ar", e.target.value); setError(""); }}
              placeholder={t("quickadd.name_ar_ph")}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="qa-cat">{t("quickadd.category")}</Label>
            <Select
              value={form.category_id || "__none__"}
              onValueChange={(v) => set("category_id", v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="qa-cat">
                <SelectValue placeholder={t("quickadd.category_ph")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("quickadd.category_ph")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {lang === "ar" ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <Label htmlFor="qa-uom">{t("quickadd.unit")}</Label>
            <Select
              value={form.base_uom_id}
              onValueChange={(v) => set("base_uom_id", v)}
            >
              <SelectTrigger id="qa-uom">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {lang === "ar" ? u.name_ar : u.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DD-1 — has_variants toggle (flag-gated) */}
          {variantsFlagOn && (
            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <Switch
                id="qa-has-variants"
                checked={form.has_variants}
                onCheckedChange={(v) => set("has_variants", v)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="qa-has-variants" className="cursor-pointer">{t("quickadd.has_variants")}</Label>
                <p className="text-xs text-muted-foreground">{t("quickadd.has_variants_hint")}</p>
              </div>
            </div>
          )}

          {/* Sale price — hidden once has_variants is on (D1: parent carries no price) */}
          {!form.has_variants && (
          <div className="space-y-1.5">
            <Label htmlFor="qa-price">{t("quickadd.price")}</Label>
            <div className="relative">
              <Input
                id="qa-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="pe-10 tabular-nums"
                value={form.sale_price}
                onChange={(e) => set("sale_price", e.target.value)}
                placeholder="0.00"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                ج.م
              </span>
            </div>
          </div>
          )}

          {/* Code (auto-generated) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="qa-code">{t("quickadd.code")}</Label>
              <button
                type="button"
                className="text-xs text-brand hover:underline"
                onClick={() => {
                  if (form.codeAuto) {
                    set("codeAuto", false);
                    set("code", autoCode.current);
                  } else {
                    set("codeAuto", true);
                    set("code", "");
                  }
                }}
              >
                {form.codeAuto ? t("quickadd.code_edit") : t("quickadd.code_auto")}
              </button>
            </div>
            <Input
              id="qa-code"
              value={displayCode}
              readOnly={form.codeAuto}
              onChange={(e) => !form.codeAuto && set("code", e.target.value)}
              className={cn(
                "font-mono",
                form.codeAuto && "bg-muted text-muted-foreground cursor-default"
              )}
            />
          </div>
        </div>
    </ModalShell>
  );
}
