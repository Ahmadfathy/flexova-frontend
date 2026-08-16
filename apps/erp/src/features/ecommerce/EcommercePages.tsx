import { useTranslation } from "react-i18next";
import { CreditCard, Store } from "lucide-react";
import { EcommercePlaceholderPage } from "./EcommercePlaceholderPage";

export { OrdersListPage } from "./orders/OrdersListPage";
export { OrderDetailPage } from "./orders/OrderDetailPage";
export { ProductsListPage as ProductsPage } from "./products/ProductsListPage";
export { ProductEditorPage } from "./products/ProductEditorPage";
export { CategoriesPage } from "./categories/CategoriesPage";
export { AffiliatesListPage as AffiliatesPage } from "./affiliates/AffiliatesListPage";
export { AffiliateDetailPage } from "./affiliates/AffiliateDetailPage";

/** Settings land in Admin Prompt A4 (kickoff §5) — this A3 pass implements
 * §6 Affiliates on top of A1's Orders + A2's Products/Categories. */
export function SettingsPaymentsPage() {
  const { t } = useTranslation("ecommerce");
  return <EcommercePlaceholderPage icon={CreditCard} title={t("nav_titles.settings_payments")} note={t("placeholder.note")} />;
}

export function SettingsStorePage() {
  const { t } = useTranslation("ecommerce");
  return <EcommercePlaceholderPage icon={Store} title={t("nav_titles.settings_store")} note={t("placeholder.note")} />;
}
