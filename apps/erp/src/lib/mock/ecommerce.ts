import fixtures from "./fixtures/ecommerce.fixtures.json";
import type {
  EcOrder, EcCustomer, EcOnlineProduct, EcStoreCategory,
  EcAffiliate, EcPayout, EcShippingZone, EcStoreConfig, LinkableInventoryItem,
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

/**
 * "Search + select existing inventory item" (spec §3.2) — the 5 items
 * already linked from `online_products[]` (so editing an existing product
 * shows real, consistent read-only stock/price) plus 2 unlinked ones, so
 * the create flow has something genuinely new to pick. Own small mock
 * catalog, not a join against `inventory.fixtures.json` — see
 * `LinkableInventoryItem`'s doc comment for why.
 */
const LINKABLE_INVENTORY_ITEMS: LinkableInventoryItem[] = [
  { id: "inv_shirt_01", name_ar: "قميص قطن كلاسيك", name_en: "Classic Cotton Shirt", base_price: 450, stock: 24, status: "active" },
  { id: "inv_shoe_02", name_ar: "حذاء جلد بني", name_en: "Brown Leather Shoe", base_price: 950, stock: 3, status: "active" },
  { id: "inv_bag_03", name_ar: "شنطة يد حريمي", name_en: "Women's Handbag", base_price: 620, stock: 0, status: "active" },
  { id: "inv_draft_04", name_ar: "منتج تحت الإعداد", name_en: "Product In Progress", base_price: 300, stock: 10, status: "active" },
  { id: "inv_suspended_05", name_ar: "منتج صنفه موقوف", name_en: "Suspended Item", base_price: 200, stock: 0, status: "suspended" },
  { id: "inv_watch_06", name_ar: "ساعة يد رجالي", name_en: "Men's Wristwatch", base_price: 1200, stock: 15, status: "active" },
  { id: "inv_perfume_07", name_ar: "عطر فرنسي", name_en: "French Perfume", base_price: 540, stock: 40, status: "active" },
];

export function getLinkableInventoryItems(): LinkableInventoryItem[] {
  return LINKABLE_INVENTORY_ITEMS;
}

export function getLinkableInventoryItem(id: string | null | undefined): LinkableInventoryItem | undefined {
  return id ? LINKABLE_INVENTORY_ITEMS.find((i) => i.id === id) : undefined;
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
