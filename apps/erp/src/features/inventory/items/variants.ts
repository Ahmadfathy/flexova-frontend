/**
 * DD-1 — Variants / Matrix: pure, framework-free logic shared by the Attribute
 * library, the Item Editor's Matrix grid, and the Items list rollup/price-range
 * display. Mirrors inventory.backend.md §2/§3 (cartesian generation, the 200-combo
 * guard, unique-code enforcement, atomic all-or-nothing generate) but runs
 * entirely against the mock fixture — no network calls.
 *
 * Golden rule (inviolable): nothing here ever writes a balance directly.
 * `buildOpeningMovements` only ever produces `opening` stock_movement rows.
 */
import type { InventoryAttributeValue, InventoryItem, InventoryLedgerRow, InventoryVariant } from "./types";

/** DD-1 §3.4 combinatorial guard — block generate above this many projected combos. */
export const MAX_COMBOS = 200;
/** DD-1 D10 — soft warning above this many attributes on one product. */
export const MAX_RECOMMENDED_ATTRS = 3;

export type ComboMap = Record<string, string>; // attribute_id -> attribute_value_id

/** Stable key for a combination, independent of attribute insertion order. */
export function comboKey(combo: ComboMap): string {
  return Object.keys(combo)
    .sort()
    .map((attrId) => `${attrId}:${combo[attrId]}`)
    .join("|");
}

/**
 * Cartesian product of the chosen attribute → value-id sets, minus any
 * manually excluded combos (D3). `valueSets` order determines the grouping
 * order used for 3-attribute display (first attribute = outer group).
 */
export function cartesianCombos(
  valueSets: Array<{ attributeId: string; valueIds: string[] }>,
  excludedKeys: Set<string> = new Set()
): ComboMap[] {
  if (valueSets.length === 0) return [];
  let combos: ComboMap[] = [{}];
  for (const { attributeId, valueIds } of valueSets) {
    const next: ComboMap[] = [];
    for (const base of combos) {
      for (const valueId of valueIds) {
        next.push({ ...base, [attributeId]: valueId });
      }
    }
    combos = next;
  }
  return combos.filter((c) => !excludedKeys.has(comboKey(c)));
}

/** Count of the full cartesian product before exclusions — what the >200 guard checks (backend §3). */
export function projectedComboCount(valueSets: Array<{ attributeId: string; valueIds: string[] }>): number {
  return valueSets.reduce((n, { valueIds }) => n * (valueIds.length || 0), valueSets.length ? 1 : 0);
}

/** Human combo label, e.g. "أحمر · L" — ordered by the attribute order passed in. */
export function comboLabel(
  combo: ComboMap,
  attributeOrder: string[],
  attributeValues: InventoryAttributeValue[],
  lang: "ar" | "en"
): string {
  const byId = Object.fromEntries(attributeValues.map((v) => [v.id, v]));
  return attributeOrder
    .map((attrId) => combo[attrId])
    .filter(Boolean)
    .map((valueId) => {
      const v = byId[valueId];
      if (!v) return "";
      return lang === "ar" ? v.value_ar : v.value_en;
    })
    .filter(Boolean)
    .join(" · ");
}

/** Auto-generated variant code, e.g. "TSH-500-RED-L" — always EN value names, uppercased, no spaces. */
export function generateVariantCode(
  parentCode: string,
  combo: ComboMap,
  attributeOrder: string[],
  attributeValues: InventoryAttributeValue[]
): string {
  const byId = Object.fromEntries(attributeValues.map((v) => [v.id, v]));
  const parts = attributeOrder
    .map((attrId) => combo[attrId])
    .filter(Boolean)
    .map((valueId) => (byId[valueId]?.value_en ?? "").toUpperCase().replace(/\s+/g, ""))
    .filter(Boolean);
  return [parentCode, ...parts].join("-");
}

/** Every variant code across the whole item catalog (simple items + all variants), for uniqueness checks. */
export function allExistingCodes(items: InventoryItem[], excludeVariantId?: string): Set<string> {
  const codes = new Set<string>();
  for (const item of items) {
    if (!item.is_product_parent) codes.add(item.code);
    for (const v of item.variants ?? []) {
      if (v.id === excludeVariantId) continue;
      codes.add(v.code);
    }
  }
  return codes;
}

/** Sum of a variant's balances, optionally scope-respecting a warehouse allowlist (DD-1 §5, "as v1"). */
export function variantBalance(variant: InventoryVariant, scopeWarehouseIds?: string[]): number {
  return variant.balances
    .filter((b) => !scopeWarehouseIds || scopeWarehouseIds.includes(b.warehouse_id))
    .reduce((s, b) => s + b.qty, 0);
}

export function isVariantLowStock(variant: InventoryVariant, scopeWarehouseIds?: string[]): boolean {
  if (variant.reorder_level === null) return false;
  return variantBalance(variant, scopeWarehouseIds) <= variant.reorder_level;
}

/**
 * Recompute the parent rollup from its variants — acceptance criterion 4/5:
 * the parent NEVER carries a direct balance, only this computed sum.
 */
export function computeRollup(
  variants: InventoryVariant[],
  scopeWarehouseIds?: string[]
): { balance_total: number; price_range: { min: number; max: number }; any_low_stock: boolean } {
  const included = variants; // suspended variants still count toward rollup/price range, same as v1 suspended items
  const balance_total = included.reduce((s, v) => s + variantBalance(v, scopeWarehouseIds), 0);
  const retailPrices = included
    .map((v) => v.prices["pl_retail"] ?? Object.values(v.prices)[0])
    .filter((p): p is number => typeof p === "number");
  const price_range = retailPrices.length
    ? { min: Math.min(...retailPrices), max: Math.max(...retailPrices) }
    : { min: 0, max: 0 };
  const any_low_stock = included.some((v) => isVariantLowStock(v, scopeWarehouseIds));
  return { balance_total, price_range, any_low_stock };
}

export interface GenerateVariantsInput {
  itemId: string;
  parentCode: string;
  attributeOrder: string[]; // attribute ids, in picker order (first = outer group for 3-attr display)
  valueSets: Array<{ attributeId: string; valueIds: string[] }>;
  excludedKeys: Set<string>;
  attributeValues: InventoryAttributeValue[];
  /** existing variants (edit mode) — reused (not regenerated) when their combo is still selected. */
  existing?: InventoryVariant[];
  /** per-combo overrides keyed by comboKey, from the grid (price/reorder/opening etc). */
  overrides?: Record<string, Partial<Pick<InventoryVariant, "code" | "prices" | "reorder_level" | "barcodes">> & {
    opening?: Array<{ warehouse_id: string; qty: number; cost: number }>;
  }>;
  allItems: InventoryItem[];
}

export interface GenerateVariantsResult {
  ok: true;
  variants: InventoryVariant[];
  openingMovements: InventoryLedgerRow[];
}
export interface GenerateVariantsError {
  ok: false;
  reason: "combo_explosion" | "duplicate_code" | "no_included_variant";
  detail?: string;
}

/**
 * Atomic (all-or-nothing) matrix generation — backend §3 "Cartesian generation"
 * + §5 test hook. Never partially applies; the caller only commits on ok:true.
 */
export function generateVariants(input: GenerateVariantsInput): GenerateVariantsResult | GenerateVariantsError {
  const projected = projectedComboCount(input.valueSets);
  if (projected > MAX_COMBOS) return { ok: false, reason: "combo_explosion" };

  const combos = cartesianCombos(input.valueSets, input.excludedKeys);
  if (combos.length === 0) return { ok: false, reason: "no_included_variant" };

  const existingByKey = new Map((input.existing ?? []).map((v) => [comboKey(v.attrs), v]));
  const takenCodes = allExistingCodes(input.allItems);
  // codes already on this product's own existing variants don't collide with themselves
  for (const v of input.existing ?? []) takenCodes.delete(v.code);

  const seenNewCodes = new Set<string>();
  const variants: InventoryVariant[] = [];
  const openingMovements: InventoryLedgerRow[] = [];
  let mvSeq = 0;

  for (const combo of combos) {
    const key = comboKey(combo);
    const prior = existingByKey.get(key);
    const override = input.overrides?.[key];
    const code =
      override?.code ??
      prior?.code ??
      generateVariantCode(input.parentCode, combo, input.attributeOrder, input.attributeValues);

    if (takenCodes.has(code) || seenNewCodes.has(code)) {
      return { ok: false, reason: "duplicate_code", detail: code };
    }
    seenNewCodes.add(code);

    const variant: InventoryVariant = prior
      ? { ...prior, code, ...(override?.prices ? { prices: override.prices } : {}), ...(override?.reorder_level !== undefined ? { reorder_level: override.reorder_level } : {}), ...(override?.barcodes ? { barcodes: override.barcodes } : {}) }
      : {
          id: `v_${input.itemId}_${key.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
          code,
          attrs: combo,
          barcodes: override?.barcodes ?? [],
          image: null,
          eta_code: null,
          reorder_level: override?.reorder_level ?? null,
          max_level: null,
          status: "active",
          prices: override?.prices ?? {},
          last_purchase_price: null,
          avg_cost: null,
          balances: [],
        };

    variants.push(variant);

    if (!prior && override?.opening?.length) {
      for (const o of override.opening) {
        if (o.qty <= 0) continue;
        mvSeq += 1;
        variant.balances = [
          ...variant.balances.filter((b) => b.warehouse_id !== o.warehouse_id),
          { warehouse_id: o.warehouse_id, qty: (variant.balances.find((b) => b.warehouse_id === o.warehouse_id)?.qty ?? 0) + o.qty },
        ];
        openingMovements.push({
          id: `mv_${variant.id}_open${mvSeq}`,
          item_id: input.itemId,
          variant_id: variant.id,
          date: new Date().toISOString().slice(0, 10),
          type: "opening",
          source_ref: "OPENING-MATRIX",
          warehouse_id: o.warehouse_id,
          qty: o.qty,
          running_balance: o.qty,
          cost: o.cost,
          user: "—",
        });
      }
    }
  }

  return { ok: true, variants, openingMovements };
}
