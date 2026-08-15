import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { ModalShell } from "@/components/patterns/ModalShell";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { Loader2 } from "lucide-react";

import { cn }       from "@/lib/utils";
import { useCan }   from "@/lib/permissions";
import { useItems } from "./useItems";

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
  const { data }     = useItems();
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();

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

          {/* Sale price */}
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
