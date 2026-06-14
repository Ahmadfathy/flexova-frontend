import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";

export function PurchasingLayout() {
  const { t } = useTranslation("purchasing");
  const { pathname } = useLocation();

  if (pathname === "/purchasing" || pathname === "/purchasing/") {
    return <Navigate to="/purchasing/suppliers" replace />;
  }

  const tabs = [
    { label: t("nav.suppliers"),   href: "/purchasing/suppliers" },
    { label: t("nav.invoices"),    href: "/purchasing/invoices" },
    { label: t("nav.orders"),      href: "/purchasing/orders" },
    { label: t("nav.returns"),     href: "/purchasing/returns" },
    { label: t("nav.vouchers"),    href: "/purchasing/vouchers" },
    { label: t("nav.inbound_eta"), href: "/purchasing/inbound-eta" },
  ];

  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
