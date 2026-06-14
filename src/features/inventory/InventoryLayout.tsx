import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";

export function InventoryLayout() {
  const { t } = useTranslation("inventory");
  const { pathname } = useLocation();

  // Redirect bare /inventory to /inventory/items
  if (pathname === "/inventory" || pathname === "/inventory/") {
    return <Navigate to="/inventory/items" replace />;
  }

  const tabs = [
    { label: t("nav.items"),       href: "/inventory/items" },
    { label: t("nav.categories"),  href: "/inventory/categories" },
    { label: t("nav.price_lists"), href: "/inventory/price-lists" },
    { label: t("nav.warehouses"),  href: "/inventory/warehouses" },
    { label: t("nav.stocktakes"),  href: "/inventory/stocktakes" },
    { label: t("nav.transfers"),   href: "/inventory/transfers" },
    { label: t("nav.adjustments"), href: "/inventory/adjustments" },
    { label: t("nav.low_stock"),   href: "/inventory/low-stock" },
  ];

  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
