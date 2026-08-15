"use client";

/**
 * Cart — Shared Core business logic (spec §6). Client/session-owned, no
 * reservation at this stage (reservation happens at checkout start, §7).
 * Pure math lives in the exported functions so both themes' cart UIs (S4)
 * and this hook share one implementation — a theme never recomputes a
 * subtotal itself.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cart, CartItem, ProductDynamic } from "./types";

export function computeSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.live_price * item.qty, 0);
}

export function addOrMergeItem(items: CartItem[], next: CartItem): CartItem[] {
  const i = items.findIndex((it) => it.product_id === next.product_id && it.variant === next.variant);
  if (i === -1) return [...items, next];
  const merged = [...items];
  merged[i] = { ...merged[i], qty: merged[i].qty + next.qty };
  return merged;
}

/** Live re-check (spec §6 "live re-check on open") — an item blocks
 * checkout when the ERP confirms it's actually unavailable *or* when the
 * read itself failed (never confidently proceed on data we couldn't
 * verify — same golden rule as PDP's add-to-cart gating). `undefined`
 * (not checked yet) never blocks on its own. */
export function isItemBlocked(dyn: ProductDynamic | undefined): boolean {
  if (!dyn) return false;
  if (dyn.erp_error) return true;
  if (dyn.in_stock === false) return true;
  if (dyn.available != null && dyn.available <= 0) return true;
  return false;
}

/** Non-blocking "السعر اتحدّث" notice — compares the live price against
 * the price the shopper saw when they added the item, not against
 * whatever `live_price` happens to hold after a previous re-check. */
export function isPriceChanged(item: CartItem, dyn: ProductDynamic | undefined): boolean {
  if (!dyn || dyn.price == null) return false;
  return dyn.price !== item.price_at_add;
}

interface CartState {
  items: CartItem[];
  /** Persisted alongside `items` — the seed only ever fires once per
   * browser, ever. Gating purely on `items.length === 0` would look
   * identical to "first-ever visit" and "shopper genuinely emptied their
   * cart", and re-seed the demo items back in on the second case, which
   * would be wrong: emptying a cart should stick. */
  hasSeeded: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variant: string | null) => void;
  setQty: (productId: string, variant: string | null, qty: number) => void;
  /** Re-check writes the freshly-read price here — `price_at_add` stays
   * untouched so `isPriceChanged` always has the original to compare against. */
  updateLivePrice: (productId: string, variant: string | null, livePrice: number) => void;
  /** Cart page seeds the fixture's demo cart on first-ever load only —
   * never overwrites a cart the shopper has actually built (or emptied). */
  seedIfEmpty: (items: CartItem[]) => void;
  clear: () => void;
}

/** `useCart` — the one hook every theme's cart UI consumes (spec §2 data
 * contracts). Themes render `useCart()`'s state; they never touch
 * `localStorage`/zustand directly, so swapping storage strategy later
 * (e.g. to a server session) only touches this file. */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasSeeded: false,
      addItem: (item) => set((s) => ({ items: addOrMergeItem(s.items, item) })),
      removeItem: (productId, variant) =>
        set((s) => ({ items: s.items.filter((it) => !(it.product_id === productId && it.variant === variant)) })),
      setQty: (productId, variant, qty) =>
        set((s) => ({
          items: s.items
            .map((it) => (it.product_id === productId && it.variant === variant ? { ...it, qty } : it))
            .filter((it) => it.qty > 0),
        })),
      updateLivePrice: (productId, variant, livePrice) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.product_id === productId && it.variant === variant ? { ...it, live_price: livePrice } : it
          ),
        })),
      seedIfEmpty: (items) =>
        set((s) => {
          if (s.hasSeeded) return s;
          return s.items.length === 0 ? { items, hasSeeded: true } : { hasSeeded: true };
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "flexova.storefront.cart" }
  )
);

export function cartFromItems(items: CartItem[]): Cart {
  return { items, subtotal: computeSubtotal(items) };
}
