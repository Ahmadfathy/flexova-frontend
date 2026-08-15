"use client";

import { useCallback, useEffect, useState } from "react";
import { useCart } from "./cart";
import { recheckCartPrices } from "./cart-actions";
import type { ProductDynamic } from "./types";

function isOfflineMock(): boolean {
  return new URLSearchParams(window.location.search).get("mock") === "offline";
}

/**
 * "Live re-check on open" (spec §6) — the one hook both themes' cart UIs
 * call. Runs once when the cart page mounts (and again via `reload()`,
 * e.g. after the shopper removes a blocked item), fetches every distinct
 * product's current price/stock through the Server Action, and writes
 * the fresh price back into the cart store (`isPriceChanged` in
 * `cart.ts` compares against the untouched `price_at_add`, so nothing
 * here needs to track "did the price change" itself).
 *
 * Offline (`?mock=offline`, same convention as the rest of the app):
 * the re-check simply doesn't run — the cart still renders from what's
 * already saved locally (spec §6 "offline: saved locally; re-check waits").
 */
export function useCartRecheck() {
  const items = useCart((s) => s.items);
  const updateLivePrice = useCart((s) => s.updateLivePrice);
  const [dynamicByProduct, setDynamicByProduct] = useState<Record<string, ProductDynamic>>({});
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const productIdsKey = items.map((i) => i.product_id).join(",");

  const reload = useCallback(async () => {
    if (items.length === 0) {
      setLoading(false);
      return;
    }
    if (isOfflineMock()) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setIsOffline(false);
    try {
      const result = await recheckCartPrices(items.map((i) => i.product_id));
      setDynamicByProduct(result);
      for (const item of items) {
        const dyn = result[item.product_id];
        if (dyn?.price != null) updateLivePrice(item.product_id, item.variant, dyn.price);
      }
    } catch (err) {
      console.error("[cart-recheck] failed", err);
    } finally {
      setLoading(false);
    }
    // items itself is intentionally excluded — re-running on every qty
    // change would re-fetch unnecessarily; productIdsKey only changes
    // when the *set* of products in the cart changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { dynamicByProduct, loading, isOffline, reload };
}
