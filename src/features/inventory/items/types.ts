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
  _flag?: string;
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
  ledger: unknown[];
  stocktakes: unknown[];
  transfers: unknown[];
  adjustments: unknown[];
  low_stock: Array<{ item_id: string; warehouse_id: string; balance: number; reorder_level: number; shortfall: number; suggested_qty: number }>;
  import_template_columns: unknown[];
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
}
