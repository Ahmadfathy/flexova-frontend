import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";

export function FinanceLayout() {
  const { t } = useTranslation("finance");
  const { pathname } = useLocation();

  if (pathname === "/finance" || pathname === "/finance/") {
    return <Navigate to="/finance/dashboard" replace />;
  }

  // Simple mode tabs (accounting tabs appear in a future toggle)
  const tabs = [
    { label: t("nav.dashboard"),      href: "/finance/dashboard" },
    { label: t("nav.treasuries"),     href: "/finance/treasuries" },
    { label: t("nav.expenses"),       href: "/finance/expenses" },
    { label: t("nav.receipts"),       href: "/finance/receipts" },
    { label: t("nav.payments"),       href: "/finance/payments" },
    { label: t("nav.transfers"),      href: "/finance/transfers" },
    { label: t("nav.journal"),        href: "/finance/journal" },
    { label: t("nav.coa"),            href: "/finance/coa" },
    { label: t("nav.trial_balance"),  href: "/finance/trial-balance" },
    { label: t("nav.statements"),     href: "/finance/statements" },
    { label: t("nav.reconciliation"), href: "/finance/reconciliation" },
    { label: t("nav.closing"),        href: "/finance/closing" },
  ];

  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
