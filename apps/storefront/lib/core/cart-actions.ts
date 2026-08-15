"use server";

/**
 * Cart is client-only (spec §6 "Client-only, not SEO") — but the live
 * re-check itself still has to go through the mock BFF, which is
 * server-only. This Server Action is the one bridge: the Client
 * Component cart page calls it directly (Next handles the RPC), it never
 * imports mock-bff.ts itself.
 */
import { getProductDynamicCached } from "./mock-bff";
import type { ProductDynamic } from "./types";

export async function recheckCartPrices(productIds: string[]): Promise<Record<string, ProductDynamic>> {
  const uniqueIds = Array.from(new Set(productIds));
  const entries = await Promise.all(
    uniqueIds.map(async (id) => [id, await getProductDynamicCached(id)] as const)
  );
  return Object.fromEntries(entries);
}
