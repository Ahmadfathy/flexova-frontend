import fixtures from "./fixtures/ecommerce.fixtures.json";
import type {
  EcOrder, EcCustomer, EcOnlineProduct, EcStoreCategory,
  EcAffiliate, EcPayout, EcShippingZone, EcStoreConfig, LinkableInventoryItem,
  EcBulkCandidate, EcCatalogRule, EcMirrorPoolItem,
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
  { id: "inv_shirt_01", name_ar: "قميص قطن كلاسيك", name_en: "Classic Cotton Shirt", base_price: 450, stock: 24, status: "active", inventory_category_id: "invcat_men" },
  { id: "inv_shoe_02", name_ar: "حذاء جلد بني", name_en: "Brown Leather Shoe", base_price: 950, stock: 3, status: "active", inventory_category_id: "invcat_shoes" },
  { id: "inv_bag_03", name_ar: "شنطة يد حريمي", name_en: "Women's Handbag", base_price: 620, stock: 0, status: "active", inventory_category_id: "invcat_women" },
  { id: "inv_draft_04", name_ar: "منتج تحت الإعداد", name_en: "Product In Progress", base_price: 300, stock: 10, status: "active", inventory_category_id: "invcat_men" },
  { id: "inv_suspended_05", name_ar: "منتج صنفه موقوف", name_en: "Suspended Item", base_price: 200, stock: 0, status: "suspended", inventory_category_id: "invcat_men" },
  // Unlinked (no online_products[] row references these two) — the §3.7
  // bulk-import pool's "from the existing picker" half; the fixture's own
  // `catalog_modes_demo.bulk_candidates` supplies the other half below.
  { id: "inv_watch_06", name_ar: "ساعة يد رجالي", name_en: "Men's Wristwatch", base_price: 1200, stock: 15, status: "active", inventory_category_id: "invcat_men" },
  { id: "inv_perfume_07", name_ar: "عطر فرنسي", name_en: "French Perfume", base_price: 540, stock: 40, status: "active", inventory_category_id: "invcat_accessories" },
];

export function getLinkableInventoryItems(): LinkableInventoryItem[] {
  return LINKABLE_INVENTORY_ITEMS;
}

export function getLinkableInventoryItem(id: string | null | undefined): LinkableInventoryItem | undefined {
  return id ? LINKABLE_INVENTORY_ITEMS.find((i) => i.id === id) : undefined;
}

/** §3.7 inventory-category filter labels — its own `invcat_*` namespace,
 * independent of `store_categories` (marketing tree). Same "small scoped
 * mock pool" precedent as `LinkableInventoryItem` itself. */
export const INVENTORY_CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  invcat_men: { ar: "رجالي", en: "Men" },
  invcat_women: { ar: "حريمي", en: "Women" },
  invcat_shoes: { ar: "أحذية", en: "Shoes" },
  invcat_accessories: { ar: "إكسسوارات", en: "Accessories" },
};

export function inventoryCategoryLabel(id: string, lang: "ar" | "en"): string {
  return INVENTORY_CATEGORY_LABELS[id]?.[lang] ?? id;
}

/**
 * §3.7 Mode 2 (bulk import) candidate pool — every inventory item not yet
 * linked from `online_products[]`: the unlinked slice of the manual
 * picker's own pool + the fixture's dedicated bulk-only demo items
 * (including one `suspended` one, the partial-failure case). `linkedIds`
 * is passed in by the caller (reads live store state, not the fixture
 * snapshot) so a bulk-published item drops out of the list immediately.
 */
export function getBulkPublishCandidates(linkedIds: string[]): EcBulkCandidate[] {
  const fromPicker: EcBulkCandidate[] = LINKABLE_INVENTORY_ITEMS.map((item) => ({
    inventory_item_id: item.id,
    name_ar: item.name_ar,
    name_en: item.name_en,
    erp_price: item.base_price,
    erp_stock: item.stock,
    status: item.status,
    inventory_category_id: item.inventory_category_id,
  }));
  const fromFixture = (fixtures.catalog_modes_demo?.bulk_candidates ?? []) as EcBulkCandidate[];
  const linked = new Set(linkedIds);
  return [...fromPicker, ...fromFixture].filter((c) => !linked.has(c.inventory_item_id));
}

/** §3.7 Mode 3 (auto-rule) seed rules. */
export function getCatalogRules(): EcCatalogRule[] {
  return (fixtures.catalog_modes_demo?.auto_rules ?? []) as EcCatalogRule[];
}

/** §3.7 Mode 4 (mirror) seed hidden-exceptions. */
export function getMirrorExceptionSeed(): { inventory_item_id: string; hidden: boolean }[] {
  return (fixtures.catalog_modes_demo?.mirror_exceptions ?? []) as { inventory_item_id: string; hidden: boolean }[];
}

/**
 * §3.7 Mode 4 (mirror) pool — "every sellable inventory item" — the same
 * manual-picker pool + fixture bulk items, plus one dedicated non-sellable
 * raw-material row (`inv_rawmat_09`, matching the fixture's own
 * `mirror_exceptions` seed) so the exceptions screen can show *why* it's
 * excluded from the mirror by default instead of just omitting it.
 */
export function getMirrorPool(): EcMirrorPoolItem[] {
  const fromPicker: EcMirrorPoolItem[] = LINKABLE_INVENTORY_ITEMS.map((item) => ({
    inventory_item_id: item.id,
    name_ar: item.name_ar,
    name_en: item.name_en,
    erp_price: item.base_price,
    erp_stock: item.stock,
    inventory_category_id: item.inventory_category_id,
    status: item.status,
    sellable: true,
  }));
  const fromFixture: EcMirrorPoolItem[] = ((fixtures.catalog_modes_demo?.bulk_candidates ?? []) as EcBulkCandidate[]).map((c) => ({
    inventory_item_id: c.inventory_item_id,
    name_ar: c.name_ar,
    name_en: c.name_en,
    erp_price: c.erp_price,
    erp_stock: c.erp_stock,
    inventory_category_id: c.inventory_category_id,
    status: c.status,
    sellable: true,
  }));
  const rawMaterial: EcMirrorPoolItem = {
    inventory_item_id: "inv_rawmat_09", name_ar: "خامة قماش خام", name_en: "Raw Fabric Material",
    erp_price: 15, erp_stock: 500, inventory_category_id: "invcat_men", status: "active", sellable: false,
  };
  return [...fromPicker, ...fromFixture, rawMaterial];
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
