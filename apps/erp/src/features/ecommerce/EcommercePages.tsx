import { useTranslation } from "react-i18next";
import { Users2, CreditCard, Store } from "lucide-react";
import { EcommercePlaceholderPage } from "./EcommercePlaceholderPage";

export { OrdersListPage } from "./orders/OrdersListPage";
export { OrderDetailPage } from "./orders/OrderDetailPage";
export { ProductsListPage as ProductsPage } from "./products/ProductsListPage";
export { ProductEditorPage } from "./products/ProductEditorPage";
export { CategoriesPage } from "./categories/CategoriesPage";

/** Affiliates/settings land in Admin Prompts A3–A4 (kickoff §5) — this A2
 * pass implements §3 Products + §4 Categories on top of A1's Orders. */
export function AffiliatesPage() {
  const { t } = useTranslation("ecommerce");
  return <EcommercePlaceholderPage icon={Users2} title={t("nav_titles.affiliates")} note={t("placeholder.note")} />;
}

export function SettingsPaymentsPage() {
  const { t } = useTranslation("ecommerce");
  return <EcommercePlaceholderPage icon={CreditCard} title={t("nav_titles.settings_payments")} note={t("placeholder.note")} />;
}

export function SettingsStorePage() {
  const { t } = useTranslation("ecommerce");
  return <EcommercePlaceholderPage icon={Store} title={t("nav_titles.settings_store")} note={t("placeholder.note")} />;
}
