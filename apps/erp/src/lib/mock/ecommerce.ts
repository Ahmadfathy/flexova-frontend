import fixtures from "./fixtures/ecommerce.fixtures.json";
import type {
  EcOrder, EcCustomer, EcOnlineProduct, EcStoreCategory,
  EcAffiliate, EcPayout, EcShippingZone, EcStoreConfig,
} from "@/features/ecommerce/types";

/** Signatures read straight through the fixture — mirrors a future per-tenant REST API. */

export function getEcommerceMeta() {
  return fixtures._meta;
}

export function getStoreConfig(): EcStoreConfig {
  return fixtures.store_config as EcStoreConfig;
}

export function getStoreCategories(): EcStoreCategory[] {
  return fixtures.store_categories as EcStoreCategory[];
}

export function getOnlineProducts(): EcOnlineProduct[] {
  return fixtures.online_products as EcOnlineProduct[];
}

export function getOnlineProduct(id: string | null | undefined): EcOnlineProduct | undefined {
  return id ? getOnlineProducts().find((p) => p.id === id) : undefined;
}

export function getEcCustomers(): EcCustomer[] {
  return fixtures.customers as EcCustomer[];
}

export function getEcCustomer(id: string | null | undefined): EcCustomer | undefined {
  return id ? getEcCustomers().find((c) => c.id === id) : undefined;
}

export function getSeedOrders(): EcOrder[] {
  return fixtures.orders as EcOrder[];
}

export function getAffiliates(): EcAffiliate[] {
  return fixtures.affiliates as EcAffiliate[];
}

export function getAffiliate(id: string | null | undefined): EcAffiliate | undefined {
  return id ? getAffiliates().find((a) => a.id === id) : undefined;
}

export function getPayouts(): EcPayout[] {
  return fixtures.payouts as EcPayout[];
}

export function getShippingZones(): EcShippingZone[] {
  return fixtures.shipping_zones as EcShippingZone[];
}

/** Bilingual name helper — every entity here carries `name_ar` (+ optional `name_en`/`title_en`). */
export function ecCustomerName(c: EcCustomer): string {
  return c.name_ar;
}
