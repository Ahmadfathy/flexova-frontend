import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";

// Items list is fully implemented — re-export directly
export { ItemsListPage as ItemsPage } from "./items/ItemsListPage";

function Page({ k }: { k: string }) {
  const { t } = useTranslation("inventory");
  return (
    <>
      <PageHeader title={t(`${k}.title`)} />
      <PageSection><EmptyState /></PageSection>
    </>
  );
}

export const CategoriesPage  = () => <Page k="categories" />;
export const PriceListsPage  = () => <Page k="price_lists" />;
export const WarehousesPage  = () => <Page k="warehouses" />;
export const StocktakesPage  = () => <Page k="stocktakes" />;
export const TransfersPage   = () => <Page k="transfers" />;
export const AdjustmentsPage = () => <Page k="adjustments" />;
export const LowStockPage    = () => <Page k="low_stock" />;
