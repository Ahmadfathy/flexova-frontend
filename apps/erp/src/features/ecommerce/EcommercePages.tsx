import { useTranslation } from "react-i18next";
import { Package, FolderTree, Users2, CreditCard, Store } from "lucide-react";
import { EcommercePlaceholderPage } from "./EcommercePlaceholderPage";

export { OrdersListPage } from "./orders/OrdersListPage";
export { OrderDetailPage } from "./orders/OrderDetailPage";

/** Products/categories/affiliates/settings land in Admin Prompts A2–A4 (kickoff §5) — this A1
 * pass registers the full §1 route tree but only implements Orders. */
export function ProductsPage() {
  const { t } = useTranslation("ecommerce");
  return <EcommercePlaceholderPage icon={Package} title={t("nav_titles.products")} note={t("placeholder.note")} />;
}

export function CategoriesPage() {
  const { t } = useTranslation("ecommerce");
  return <EcommercePlaceholderPage icon={FolderTree} title={t("nav_titles.categories")} note={t("placeholder.note")} />;
}

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
