/** Re-exports for App.tsx's route table (kickoff §5) — one prompt per
 * screen family: A1 Orders, A2 Products/Categories, A3 Affiliates,
 * A4 Settings. All screens now implemented; A5 (real permissions into
 * FE_08) is the only prompt left in this module. */
export { OrdersListPage } from "./orders/OrdersListPage";
export { OrderDetailPage } from "./orders/OrderDetailPage";
export { ProductsListPage as ProductsPage } from "./products/ProductsListPage";
export { ProductEditorPage } from "./products/ProductEditorPage";
export { CatalogRulesPage } from "./products/CatalogRulesPage";
export { MirrorExceptionsPage } from "./products/MirrorExceptionsPage";
export { CategoriesPage } from "./categories/CategoriesPage";
export { AffiliatesListPage as AffiliatesPage } from "./affiliates/AffiliatesListPage";
export { AffiliateDetailPage } from "./affiliates/AffiliateDetailPage";
export { SettingsPaymentsPage } from "./settings/SettingsPaymentsPage";
export { SettingsStorePage } from "./settings/SettingsStorePage";
