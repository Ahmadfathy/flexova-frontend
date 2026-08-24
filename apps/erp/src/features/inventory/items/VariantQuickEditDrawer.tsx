/**
 * DD-1 §3.6 — Variant quick-edit drawer. Opened from a variant sub-row action
 * (Items list, expanded product-parent) or a Matrix-grid row's "edit" action
 * (Item Editor → Variants tab). Fields the variant can override: image,
 * barcode(s), price per price-list, reorder_level, eta_code, status.
 * Inherited (null/empty) values render as muted placeholders; saving only
 * ever writes the fields actually changed here — never a direct balance.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, WifiOff, Flag } from "lucide-react";
import { toast } from "sonner";

import { DrawerShell } from "@/components/patterns/DrawerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import type { InventoryAttributeValue, InventoryItem, InventoryVariant } from "./types";
import { comboLabel } from "./variants";

interface VariantQuickEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  variant: InventoryVariant | null;
  priceLists: Array<{ id: string; name_ar: string; name_en: string }>;
  attributeValues: InventoryAttributeValue[];
  lang: "ar" | "en";
  canEdit: boolean;
  isOffline: boolean;
  /** DD-1 addendum — tenant.eta_enabled; shows the missing-ETA warning when true. */
  etaEnabled?: boolean;
  onSave: (variantId: string, patch: Partial<InventoryVariant>) => void;
}

export function VariantQuickEditDrawer({
  open, onOpenChange, item, variant, priceLists, attributeValues, lang, canEdit, isOffline, etaEnabled, onSave,
}: VariantQuickEditDrawerProps) {
  const { t } = useTranslation("inventory");

  const [image, setImage] = useState("");
  const [barcode, setBarcode] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [reorderLevel, setReorderLevel] = useState("");
  const [etaCode, setEtaCode] = useState("");
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !variant) return;
    setImage(variant.image ?? "");
    setBarcode(variant.barcodes[0] ?? "");
    setPrices(Object.fromEntries(priceLists.map((pl) => [pl.id, variant.prices[pl.id] !== undefined ? String(variant.prices[pl.id]) : ""])));
    setReorderLevel(variant.reorder_level !== null ? String(variant.reorder_level) : "");
    setEtaCode(variant.eta_code ?? "");
    setStatus(variant.status);
    setError("");
  }, [open, variant, priceLists]);

  if (!variant || !item) return null;

  const comboText = comboLabel(variant.attrs, item.attributes_used ?? Object.keys(variant.attrs), attributeValues, lang);

  async function handleSave() {
    if (!canEdit || !variant) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);

    const patch: Partial<InventoryVariant> = {
      image: image.trim() || null,
      barcodes: barcode.trim() ? [barcode.trim()] : [],
      prices: Object.fromEntries(
        Object.entries(prices).filter(([, v]) => v !== "").map(([k, v]) => [k, parseFloat(v) || 0])
      ),
      reorder_level: reorderLevel.trim() ? parseFloat(reorderLevel) : null,
      eta_code: etaCode.trim() || null,
      status,
    };

    if (isOffline) {
      toast.message(t("variants.sync_pending"));
    } else {
      toast.success(t("variants.saved_toast"));
    }
    onSave(variant.id, patch);
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={`${t("variants.quick_edit_title")} — ${comboText}`}
      description={variant.code}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("actions.cancel")}
          </Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("actions.save")}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {isOffline && (
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <WifiOff className="h-3 w-3" />
            {t("variants.sync_pending")}
          </Badge>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="space-y-1.5">
          <Label>{t("variants.barcode")}</Label>
          <Input
            value={barcode}
            disabled={!canEdit}
            onChange={(e) => setBarcode(e.target.value)}
            className="tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("variants.image_label")}</Label>
          <Input value={image} disabled={!canEdit} onChange={(e) => setImage(e.target.value)} placeholder={t("variants.inherited")} />
        </div>

        <div className="space-y-2">
          <Label>{t("variants.sale_price")}</Label>
          {priceLists.map((pl) => (
            <div key={pl.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{lang === "ar" ? pl.name_ar : pl.name_en}</span>
              <Input
                type="number" min={0} className="h-8 text-sm tabular-nums"
                value={prices[pl.id] ?? ""}
                disabled={!canEdit}
                placeholder={t("variants.inherited")}
                onChange={(e) => setPrices((p) => ({ ...p, [pl.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label>{t("variants.reorder_level")}</Label>
          <Input
            type="number" min={0} className="tabular-nums"
            value={reorderLevel}
            disabled={!canEdit}
            placeholder={t("variants.inherited")}
            onChange={(e) => setReorderLevel(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("item_editor.eta_code_label")}</Label>
          <Input
            value={etaCode}
            disabled={!canEdit}
            placeholder={item.eta_code || t("variants.inherited")}
            onChange={(e) => setEtaCode(e.target.value)}
            className="tabular-nums"
          />
          {!etaCode && item.eta_code && (
            <p className="text-xs text-muted-foreground">{t("variants.inherited")}: {item.eta_code}</p>
          )}
          {etaEnabled && !etaCode && !item.eta_code && (
            <p className="flex items-center gap-1 text-xs text-warning-text">
              <Flag className="h-3 w-3 shrink-0" />
              {t("items.eta_missing_hint")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>{t("variants.status")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as "active" | "suspended")} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("status.active")}</SelectItem>
              <SelectItem value="suspended">{t("status.suspended")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!canEdit && (
          <p className="text-xs text-muted-foreground">{t("item_editor.locked_no_permission")}</p>
        )}
      </div>
    </DrawerShell>
  );
}
