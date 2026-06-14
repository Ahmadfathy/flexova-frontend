import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";

export function SalesLayout() {
  const { t } = useTranslation("sales");
  const { pathname } = useLocation();

  if (pathname === "/sales" || pathname === "/sales/") {
    return <Navigate to="/sales/invoices" replace />;
  }

  const tabs = [
    { label: t("nav.invoices"),     href: "/sales/invoices" },
    { label: t("nav.quotations"),   href: "/sales/quotations" },
    { label: t("nav.credit_notes"), href: "/sales/credit-notes" },
    { label: t("nav.debit_notes"),  href: "/sales/debit-notes" },
    { label: t("nav.receipts"),     href: "/sales/receipts" },
    { label: t("nav.eta_hub"),      href: "/sales/eta-hub" },
  ];

  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
