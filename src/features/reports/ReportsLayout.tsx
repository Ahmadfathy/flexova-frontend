import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";

export function ReportsLayout() {
  const { t } = useTranslation("reports");
  const { pathname } = useLocation();

  if (pathname === "/reports" || pathname === "/reports/") {
    return <Navigate to="/reports/dashboard" replace />;
  }

  const tabs = [
    { label: t("nav.dashboard"),  href: "/reports/dashboard" },
    { label: t("nav.library"),    href: "/reports/library" },
    { label: t("nav.saved"),      href: "/reports/saved" },
    { label: t("nav.eta_tax"),    href: "/reports/eta-tax" },
    { label: t("nav.z_report"),   href: "/reports/z-report" },
    { label: t("nav.scheduling"), href: "/reports/scheduling" },
  ];

  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
