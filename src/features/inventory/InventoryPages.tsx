import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";

function Page({ k }: { k: string }) {
  const { t } = useTranslation("inventory");
  return (
    <>
      <PageHeader title={t(`${k}.title`)} />
      <EmptyState />
    </>
  );
}

export const ItemsPage       = () => <Page k="items" />;
export const CategoriesPage  = () => <Page k="categories" />;
export const PriceListsPage  = () => <Page k="price_lists" />;
export const WarehousesPage  = () => <Page k="warehouses" />;
export const StocktakesPage  = () => <Page k="stocktakes" />;
export const TransfersPage   = () => <Page k="transfers" />;
export const AdjustmentsPage = () => <Page k="adjustments" />;
export const LowStockPage    = () => <Page k="low_stock" />;
