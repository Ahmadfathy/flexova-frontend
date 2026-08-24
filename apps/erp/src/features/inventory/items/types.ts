export interface InventoryCategory {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  item_count: number;
}

export interface InventoryWarehouse {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
  branch_id: string;
  type: "storage" | "sale" | "damaged";
  status: "active" | "suspended";
  is_default: boolean;
  stock_value: number;
}

export interface InventoryUom {
  id: string;
  name_ar: string;
  name_en: string;
}

/** DD-1 — a single included row of the variant matrix (attribute-value → variant). */
export interface InventoryVariant {
  id: string;
  code: string;
  /** attribute_id → attribute_value_id, e.g. { attr_color: "av_red", attr_size: "av_m" } */
  attrs: Record<string, string>;
  barcodes: string[];
  image: string | null;
  /** null = inherits the parent's base eta_code (DD-1 D6). */
  eta_code: string | null;
  reorder_level: number | null;
  max_level: number | null;
  status: "active" | "suspended";
  prices: Record<string, number>;
  last_purchase_price: number | null;
  avg_cost: number | null;
  balances: Array<{ warehouse_id: string; qty: number }>;
  _flag?: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  item_type: "stocked" | "service" | "non_stock";
  category_id: string;
  base_uom_id: string;
  barcodes: string[];
  image: string | null;
  tax_type_id: string;
  eta_code: string;
  reorder_level: number | null;
  max_level: number | null;
  status: "active" | "suspended";
  incomplete: boolean;
  prices: Record<string, number>;
  last_purchase_price: number | null;
  avg_cost: number | null;
  units: Array<{ uom_id: string; factor: number; barcode: string | null; unit_price: number }>;
  balances: Array<{ warehouse_id: string; qty: number }>;
  /** DD-1 — true when this item is a product-parent template (D1): it holds no direct balance. */
  is_product_parent?: boolean;
  /** DD-1 — mirrors the item-editor "has variants" toggle; only true items may carry `variants[]`. */
  has_variants_flag?: boolean;
  /** DD-1 — the 1-3 attribute ids used to build this product's matrix (D10 soft-caps at 3). */
  attributes_used?: string[];
  /** DD-1 — independent SKUs; each is the balance & ledger carrier (D5). Only present when `is_product_parent`. */
  variants?: InventoryVariant[];
  /** DD-1 — computed rollup shown on the parent row/card; never an editable balance. */
  rollup?: { balance_total: number; price_range: { min: number; max: number }; any_low_stock: boolean };
  _flag?: string;
}

/** DD-1 — global, reusable attribute (Size, Color…). */
export interface InventoryAttribute {
  id: string;
  name_ar: string;
  name_en: string;
  type: "list" | "color" | "number";
  number_unit: string | null;
  status: "active" | "archived";
  /** count of products currently using this attribute — drives the delete guard. */
  used_by_products: number;
}

/** DD-1 — one value under an attribute (e.g. "Red" under Color). */
export interface InventoryAttributeValue {
  id: string;
  attribute_id: string;
  value_ar: string;
  value_en: string;
  swatch_hex: string | null;
  sort_order: number;
}

/** DD-1 — a variant-level stock movement row (extends the simple-item ledger shape). */
export interface InventoryLedgerRow {
  id: string;
  item_id: string;
  /** set only for product-parent variants; null/absent for simple items. */
  variant_id?: string;
  date: string;
  type: "opening" | "in" | "out" | "transfer" | "adjustment" | "stocktake";
  source_ref: string;
  warehouse_id: string;
  qty: number;
  running_balance: number;
  cost: number;
  user: string;
}

export interface InventoryFixture {
  _meta: {
    module: string;
    version: string;
    currency: string;
    tenant: { id: string; name_ar: string; name_en: string; eta_enabled: boolean; price_includes_tax: boolean };
    mock_states: string[];
  };
  tax_types: Array<{ id: string; code: string; name_ar: string; name_en: string; rate: number }>;
  uoms: InventoryUom[];
  categories: InventoryCategory[];
  warehouses: InventoryWarehouse[];
  branches: Array<{ id: string; name_ar: string; name_en: string }>;
  price_lists: Array<{ id: string; name_ar: string; name_en: string; currency: string; status: string; is_default: boolean; priced_items: number }>;
  items: InventoryItem[];
  /** DD-1 — global attribute library (Size, Color…), reused across products. */
  attributes: InventoryAttribute[];
  /** DD-1 — values under each attribute. */
  attribute_values: InventoryAttributeValue[];
  ledger: InventoryLedgerRow[];
  stocktakes: unknown[];
  transfers: unknown[];
  adjustments: unknown[];
  low_stock: Array<{ item_id: string; warehouse_id: string; balance: number; reorder_level: number; shortfall: number; suggested_qty: number }>;
  import_template_columns: Array<{ key: string; label_ar: string; label_en: string; required?: boolean }>;
  import_sample_result: { valid: number; errors: unknown[] };
  barcode_templates: unknown[];
}

export type ItemStatus = "active" | "suspended" | "incomplete" | "low-stock";

export interface ItemFilters {
  category: string;
  warehouse: string;
  item_type: string;
  status: string;
  low_stock: boolean;
  price_min: string;
  price_max: string;
  /** DD-1 §2 — filters products having a variant with this attribute_value id. */
  attribute_value: string;
  /** DD-1 §2 — "" = all, "simple" = non-product items, "product" = has_variants items. */
  has_variants: "" | "simple" | "product";
}
