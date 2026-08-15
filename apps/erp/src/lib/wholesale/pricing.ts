/**
 * FE_13 §3.2/§5/§11 — wholesale price-tier resolution & validation.
 * Pure functions over fixture data — no React, no i18n (callers localize).
 */
import { getUoms } from "@/lib/mock/wholesale";
import type { PriceListLine, PriceTier } from "@/types/wholesale";

// ── Unit conversion ────────────────────────────────────────────────────

function factorOf(uomId: string): number {
  return getUoms().find((u) => u.id === uomId)?.factor ?? 1;
}

/** Selling-unit qty → base-unit qty (e.g. 2 cartons → 24 pieces). */
export function toBase(qty: number, uomId: string): number {
  return qty * factorOf(uomId);
}

/** Base-unit qty → selling-unit qty (e.g. 24 pieces → 2 cartons). */
export function fromBase(qtyBase: number, uomId: string): number {
  return qtyBase / factorOf(uomId);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Price resolution ───────────────────────────────────────────────────

export type PriceSource = "customer" | "tier" | "list" | "default";

export interface NextTierHint {
  tierId: string;
  /** Additional qty, in the line's selling unit, needed to reach this tier. */
  qtyToReachSelling: number;
  /** Price per selling unit once this tier is reached. */
  price: number;
}

export interface ResolvedPrice {
  price: number;
  tierId: string | null;
  source: PriceSource;
  nextTier?: NextTierHint;
}

export interface ResolvePriceCustomer {
  price_list_id: string | null | undefined;
  /**
   * Per-customer negotiated overrides — no fixture in this dataset exercises
   * this level (whl.fixtures.json has no such table), but it's the top of the
   * §3.2/§5 resolution order, so it's accepted here for when that data exists.
   */
  item_prices?: Record<string, number>;
}

export interface ResolvePriceArgs {
  item: { id: string; default_price?: number };
  /** Quantity in the line's selling unit (`uomId`), not the tier's reference unit. */
  qty: number;
  uomId: string;
  customer: ResolvePriceCustomer | null | undefined;
  priceLists: PriceListLine[];
}

function tierPricePerUnit(tier: PriceTier, basePrice: number): number {
  return tier.mode === "price" ? tier.value : basePrice * (1 - tier.value / 100);
}

function findLine(
  priceLists: PriceListLine[],
  priceListId: string | null | undefined,
  itemId: string,
): PriceListLine | undefined {
  if (!priceListId) return undefined;
  return priceLists.find((l) => l.price_list_id === priceListId && l.item_id === itemId);
}

const priceCache = new Map<string, ResolvedPrice>();

/** Tier data is edited live in the /pricing/lists/:id editor — call after any tier edit. */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Resolution order (FE_13 §3.2/§5): customer-specific price → quantity tier in the
 * customer's price list → price list price → default price. `qty`/`uomId` are the
 * line's selling unit; tiers are matched in the price list line's `tier_uom` and
 * converted back to the selling unit internally. Memoized, O(tiers).
 */
export function resolvePrice({ item, qty, uomId, customer, priceLists }: ResolvePriceArgs): ResolvedPrice {
  const overridePrice = customer?.item_prices?.[item.id];
  const cacheKey = `${item.id}|${qty}|${uomId}|${customer?.price_list_id ?? ""}|${overridePrice ?? ""}`;
  const cached = priceCache.get(cacheKey);
  if (cached) return cached;

  // 1. Customer-specific price — bypasses tiers entirely.
  if (overridePrice !== undefined) {
    const resolved: ResolvedPrice = { price: overridePrice, tierId: null, source: "customer" };
    priceCache.set(cacheKey, resolved);
    return resolved;
  }

  const line = findLine(priceLists, customer?.price_list_id, item.id);
  if (!line) {
    const resolved: ResolvedPrice = { price: item.default_price ?? 0, tierId: null, source: "default" };
    priceCache.set(cacheKey, resolved);
    return resolved;
  }

  // Convert the line's selling qty into the tier's reference unit for matching.
  const qtyInTierUnit = fromBase(toBase(qty, uomId), line.tier_uom);
  // price-per-tier-unit → price-per-selling-unit.
  const unitScale = factorOf(uomId) / factorOf(line.tier_uom);

  const sortedTiers = [...line.tiers].sort((a, b) => a.from_qty - b.from_qty);
  const matched = sortedTiers.find(
    (t) => t.from_qty <= qtyInTierUnit && (t.to_qty == null || qtyInTierUnit <= t.to_qty),
  );

  const pricePerTierUnit = matched ? tierPricePerUnit(matched, line.base_price) : line.base_price;
  const price = round2(pricePerTierUnit * unitScale);
  const tierId = matched?.id ?? null;
  const source: PriceSource = matched ? "tier" : "list";

  let nextTier: NextTierHint | undefined;
  const nextTierRaw = sortedTiers.find((t) => t.from_qty > qtyInTierUnit);
  if (nextTierRaw) {
    const deltaTierUnit = nextTierRaw.from_qty - qtyInTierUnit;
    const qtyToReachSelling = Math.max(0, round2(fromBase(toBase(deltaTierUnit, line.tier_uom), uomId)));
    const nextPrice = round2(tierPricePerUnit(nextTierRaw, line.base_price) * unitScale);
    nextTier = { tierId: nextTierRaw.id, qtyToReachSelling, price: nextPrice };
  }

  const resolved: ResolvedPrice = { price, tierId, source, nextTier };
  priceCache.set(cacheKey, resolved);
  return resolved;
}

// ── Tier validation (FE_13 §11) ────────────────────────────────────────

export type TierValidationErrorType = "overlap" | "gap" | "no_start_at_one";

export interface TierValidationError {
  type: TierValidationErrorType;
  severity: "error" | "warning";
  tierId: string;
  /** Present for overlap/gap — the earlier tier this one conflicts with. */
  prevTierId?: string;
  /** overlap: the overlapping range. gap: the two tier boundaries it falls between.
   * no_start_at_one: from=1 (required), to=actual first from_qty. */
  from: number;
  to: number;
}

/** Live inline validation for the tiers of a single item's price list line. */
export function validateTiers(tiers: PriceTier[]): TierValidationError[] {
  const errors: TierValidationError[] = [];
  if (tiers.length === 0) return errors;

  const sorted = [...tiers].sort((a, b) => a.from_qty - b.from_qty);

  if (sorted[0].from_qty !== 1) {
    errors.push({
      type: "no_start_at_one",
      severity: "warning",
      tierId: sorted[0].id,
      from: 1,
      to: sorted[0].from_qty,
    });
  }

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevTo = prev.to_qty ?? Infinity;

    if (curr.from_qty <= prevTo) {
      const currTo = curr.to_qty ?? Infinity;
      errors.push({
        type: "overlap",
        severity: "error",
        tierId: curr.id,
        prevTierId: prev.id,
        from: curr.from_qty,
        to: Math.min(prevTo, currTo),
      });
    } else if (curr.from_qty > prevTo + 1) {
      errors.push({
        type: "gap",
        severity: "warning",
        tierId: curr.id,
        prevTierId: prev.id,
        from: prevTo,
        to: curr.from_qty,
      });
    }
  }

  return errors;
}
