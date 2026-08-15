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
import type { Cart, CartItem } from "./types";

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

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variant: string | null) => void;
  setQty: (productId: string, variant: string | null, qty: number) => void;
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
      addItem: (item) => set((s) => ({ items: addOrMergeItem(s.items, item) })),
      removeItem: (productId, variant) =>
        set((s) => ({ items: s.items.filter((it) => !(it.product_id === productId && it.variant === variant)) })),
      setQty: (productId, variant, qty) =>
        set((s) => ({
          items: s.items
            .map((it) => (it.product_id === productId && it.variant === variant ? { ...it, qty } : it))
            .filter((it) => it.qty > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "flexova.storefront.cart" }
  )
);

export function cartFromItems(items: CartItem[]): Cart {
  return { items, subtotal: computeSubtotal(items) };
}
