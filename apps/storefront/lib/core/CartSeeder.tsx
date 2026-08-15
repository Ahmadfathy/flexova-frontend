"use client";

import { useEffect } from "react";
import { useCart } from "./cart";
import type { CartItem } from "./types";

/**
 * Seeds the demo cart from the mock BFF's `getCart()` fixture on the very
 * first load only (`seedIfEmpty` never overwrites a cart the shopper has
 * actually built) — renders nothing. Lets `/cart` show the spec's
 * price-changed demo item without requiring a manual shopping pass first,
 * without `cart.ts` (a client file) importing the fixture directly —
 * `app/cart/page.tsx` reads it server-side via mock-bff.ts and passes it
 * down as plain props, same boundary as everywhere else in this app.
 */
export function CartSeeder({ items }: { items: CartItem[] }) {
  const seedIfEmpty = useCart((s) => s.seedIfEmpty);
  useEffect(() => {
    seedIfEmpty(items);
    // Intentionally one-shot on mount — `items` is the server-fetched seed,
    // not something that should re-trigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
