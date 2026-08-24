/**
 * DD-1 — Variants section of the Item Editor: attribute picker + Matrix grid
 * (inventory.frontend.md §3.4). Pure controlled component — all state lives in
 * ItemEditorPage; this file only renders it and reports intent via callbacks.
 *
 * Golden rule note: opening-balance inputs are only ever editable on a brand
 * NEW row (a combo that doesn't yet have a persisted variant). An existing
 * variant's balance is shown read-only — further adjustments belong to the
 * Adjustments/Transfers screens, never a second "opening" on the same SKU.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ChevronDown, ChevronUp, AlertTriangle, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import type { InventoryAttribute, InventoryAttributeValue, InventoryWarehouse } from "./types";
import {
  comboLabel, projectedComboCount,
  MAX_COMBOS, MAX_RECOMMENDED_ATTRS, type ComboMap,
} from "./variants";

export interface MatrixRowVM {
  key: string;
  combo: ComboMap;
  included: boolean;
  isNew: boolean;
  variantId?: string;
  code: string;
  barcode: string;
  price: string;
  reorderLevel: string;
  status: "active" | "suspended";
  openingByWarehouse: Record<string, string>;
  existingBalanceTotal?: number;
}

interface VariantsSectionProps {
  lang: "ar" | "en";
  can: (p: string) => boolean;
  attributes: InventoryAttribute[];
  attributeValues: InventoryAttributeValue[];
  warehouses: InventoryWarehouse[];
  attributeOrder: string[];
  onAttributeOrderChange: (next: string[]) => void;
  valueSelections: Record<string, string[]>;
  onValueSelectionsChange: (attrId: string, valueIds: string[]) => void;
  rows: MatrixRowVM[];
  onRowsChange: (updater: (rows: MatrixRowVM[]) => MatrixRowVM[]) => void;
  onAddValueToAttribute: (attrId: string, value_ar: string, value_en: string) => InventoryAttributeValue | null;
  blockedValueIds: Set<string>; // values that can't be removed from the picker (movement-bearing variant)
  /** DD-1 §3.6 — matrix row "edit" opens the variant quick-edit drawer (existing rows only). */
  onQuickEditRow?: (row: MatrixRowVM) => void;
}

export function VariantsSection({
  lang, can, attributes, attributeValues, warehouses,
  attributeOrder, onAttributeOrderChange,
  valueSelections, onValueSelectionsChange,
  rows, onRowsChange,
  onAddValueToAttribute, blockedValueIds, onQuickEditRow,
}: VariantsSectionProps) {
  const { t } = useTranslation("inventory");
  const canEdit = can("inventory.item.variants");
  const canOpening = can("inventory.item.opening");
  const [showOpeningCols, setShowOpeningCols] = useState(true);
  const [newValueDraft, setNewValueDraft] = useState<Record<string, { ar: string; en: string }>>({});

  const valuesByAttr = useMemo(() => {
    const map: Record<string, InventoryAttributeValue[]> = {};
    for (const v of attributeValues) (map[v.attribute_id] ??= []).push(v);
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [attributeValues]);

  const valueSets = attributeOrder.map((attrId) => ({ attributeId: attrId, valueIds: valueSelections[attrId] ?? [] }));
  const projected = projectedComboCount(valueSets);
  const tooManyAttrs = attributeOrder.length > MAX_RECOMMENDED_ATTRS;
  const comboExplosion = projected > MAX_COMBOS;
  const hasAnyValues = valueSets.some((s) => s.valueIds.length > 0);

  function toggleAttribute(attrId: string) {
    if (attributeOrder.includes(attrId)) {
      onAttributeOrderChange(attributeOrder.filter((a) => a !== attrId));
    } else {
      onAttributeOrderChange([...attributeOrder, attrId]);
    }
  }

  function toggleValue(attrId: string, valueId: string) {
    const current = valueSelections[attrId] ?? [];
    if (current.includes(valueId)) {
      if (blockedValueIds.has(valueId)) return; // cant_remove_value guard
      onValueSelectionsChange(attrId, current.filter((v) => v !== valueId));
    } else {
      onValueSelectionsChange(attrId, [...current, valueId]);
    }
  }

  function includedCount() {
    return rows.filter((r) => r.included).length;
  }

  function patchRow(key: string, patch: Partial<MatrixRowVM>) {
    onRowsChange((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function bulkSetPrice() {
    const val = window.prompt(t("variants.set_price_all"));
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num)) return;
    onRowsChange((rs) => rs.map((r) => (r.included ? { ...r, price: String(num) } : r)));
  }

  function bulkGenBarcodes() {
    onRowsChange((rs) => rs.map((r) => (r.included && !r.barcode ? { ...r, barcode: `622${Math.floor(1e10 + Math.random() * 8e10)}` } : r)));
  }

  function bulkApplyReorder() {
    const val = window.prompt(t("variants.apply_reorder_all"));
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num)) return;
    onRowsChange((rs) => rs.map((r) => (r.included ? { ...r, reorderLevel: String(num) } : r)));
  }

  function selectAll(v: boolean) {
    onRowsChange((rs) => rs.map((r) => ({ ...r, included: v })));
  }

  return (
    <div className="space-y-5">
      {/* ── Attribute picker ─────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("variants.attr_picker")}</Label>
        <p className="text-xs text-muted-foreground">{t("variants.attr_picker_hint")}</p>

        <div className="flex flex-wrap gap-2">
          {attributes.map((attr) => {
            const selected = attributeOrder.includes(attr.id);
            return (
              <button
                key={attr.id}
                type="button"
                disabled={!canEdit}
                onClick={() => toggleAttribute(attr.id)}
                className={cn(
                  "h-8 px-3 rounded-full text-xs font-medium border transition-colors disabled:opacity-50",
                  selected ? "bg-brand-tint text-brand-text border-brand/40" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {lang === "ar" ? attr.name_ar : attr.name_en}
              </button>
            );
          })}
        </div>

        {tooManyAttrs && (
          <p className="flex items-center gap-1.5 text-xs text-warning-text">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {t("variants.too_many_attrs")}
          </p>
        )}

        {/* Per-attribute value chips */}
        {attributeOrder.map((attrId) => {
          const attr = attributes.find((a) => a.id === attrId);
          if (!attr) return null;
          const values = valuesByAttr[attrId] ?? [];
          const selectedIds = valueSelections[attrId] ?? [];
          const draft = newValueDraft[attrId] ?? { ar: "", en: "" };

          return (
            <div key={attrId} className="rounded-md border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {lang === "ar" ? attr.name_ar : attr.name_en}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {values.map((v) => {
                  const isSel = selectedIds.includes(v.id);
                  const blocked = isSel && blockedValueIds.has(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!canEdit || blocked}
                      title={blocked ? t("variants.cant_remove_value") : undefined}
                      onClick={() => toggleValue(attrId, v.id)}
                      className={cn(
                        "h-7 px-2.5 rounded-full text-xs border inline-flex items-center gap-1.5 transition-colors disabled:opacity-60",
                        isSel ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {v.swatch_hex && (
                        <span className="h-3 w-3 rounded-full border border-black/10 shrink-0" style={{ background: v.swatch_hex }} />
                      )}
                      {lang === "ar" ? v.value_ar : v.value_en}
                    </button>
                  );
                })}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input
                    className="h-7 text-xs w-28"
                    placeholder={t("attributes.value_ar")}
                    value={draft.ar}
                    onChange={(e) => setNewValueDraft((d) => ({ ...d, [attrId]: { ...draft, ar: e.target.value } }))}
                  />
                  <Input
                    className="h-7 text-xs w-28"
                    placeholder={t("attributes.value_en")}
                    value={draft.en}
                    onChange={(e) => setNewValueDraft((d) => ({ ...d, [attrId]: { ...draft, en: e.target.value } }))}
                  />
                  <Button
                    type="button" variant="outline" size="sm" className="h-7 text-xs px-2"
                    disabled={!draft.ar.trim()}
                    onClick={() => {
                      const created = onAddValueToAttribute(attrId, draft.ar.trim(), draft.en.trim());
                      if (created) {
                        onValueSelectionsChange(attrId, [...(valueSelections[attrId] ?? []), created.id]);
                        setNewValueDraft((d) => ({ ...d, [attrId]: { ar: "", en: "" } }));
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 me-1" />
                    {t("variants.add_value_inline")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Matrix grid ──────────────────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{t("variants.matrix_title")}</Label>
          {rows.length > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums">{t("variants.count", { n: includedCount() })}</Badge>
          )}
        </div>

        {comboExplosion && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {t("variants.combo_explosion")}
          </p>
        )}

        {!hasAnyValues ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
            {t("variants.no_values_hint")}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
            {t("variants.no_values_hint")}
          </p>
        ) : (
          <>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={bulkSetPrice}>
                  {t("variants.set_price_all")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={bulkGenBarcodes}>
                  {t("variants.gen_barcodes")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={bulkApplyReorder}>
                  {t("variants.apply_reorder_all")}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => selectAll(true)}>
                  {t("variants.select_all")}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => selectAll(false)}>
                  {t("variants.deselect_all")}
                </Button>
                <Button
                  type="button" variant="ghost" size="sm" className="h-7 text-xs ms-auto gap-1"
                  onClick={() => setShowOpeningCols((s) => !s)}
                >
                  {showOpeningCols ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {t("variants.opening_qty")}
                </Button>
              </div>
            )}

            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="w-9 px-2 py-2"></th>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("variants.combo")}</th>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground w-36">{t("variants.code")}</th>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground w-32">{t("variants.barcode")}</th>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground w-24">{t("variants.sale_price")}</th>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground w-24">{t("variants.reorder_level")}</th>
                    {showOpeningCols && warehouses.map((w) => (
                      <th key={w.id} className="text-start px-3 py-2 text-xs font-medium text-muted-foreground w-24">
                        {(lang === "ar" ? w.name_ar : w.name_en)}
                      </th>
                    ))}
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground w-20">{t("variants.status")}</th>
                    <th className="w-9"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className={cn("border-t border-border", !row.included && "opacity-50")}>
                      <td className="px-2 py-1.5">
                        <Checkbox
                          checked={row.included}
                          disabled={!canEdit}
                          onCheckedChange={(v) => patchRow(row.key, { included: !!v })}
                          aria-label={t("variants.include")}
                        />
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{comboLabel(row.combo, attributeOrder, attributeValues, lang)}</td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-7 text-xs font-mono tabular-nums"
                          value={row.code}
                          disabled={!canEdit}
                          onChange={(e) => patchRow(row.key, { code: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-7 text-xs tabular-nums"
                          value={row.barcode}
                          disabled={!canEdit}
                          onChange={(e) => patchRow(row.key, { barcode: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number" min={0} className="h-7 text-xs tabular-nums"
                          value={row.price}
                          disabled={!canEdit}
                          onChange={(e) => patchRow(row.key, { price: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number" min={0} className="h-7 text-xs tabular-nums"
                          value={row.reorderLevel}
                          disabled={!canEdit}
                          onChange={(e) => patchRow(row.key, { reorderLevel: e.target.value })}
                        />
                      </td>
                      {showOpeningCols && warehouses.map((w) => (
                        <td key={w.id} className="px-3 py-1.5">
                          {row.isNew ? (
                            <Input
                              type="number" min={0} className="h-7 text-xs tabular-nums"
                              value={row.openingByWarehouse[w.id] ?? ""}
                              disabled={!canEdit || !canOpening}
                              onChange={(e) => patchRow(row.key, { openingByWarehouse: { ...row.openingByWarehouse, [w.id]: e.target.value } })}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground tabular-nums">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-1.5">
                        <Select
                          value={row.status}
                          onValueChange={(v) => patchRow(row.key, { status: v as "active" | "suspended" })}
                          disabled={!canEdit || row.isNew}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{t("status.active")}</SelectItem>
                            <SelectItem value="suspended">{t("status.suspended")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-1 py-1.5">
                        {!row.isNew && onQuickEditRow && (
                          <Button
                            type="button" variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => onQuickEditRow(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
