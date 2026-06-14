import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";

export function HrLayout() {
  const { t } = useTranslation("hr");
  const { pathname } = useLocation();

  if (pathname === "/hr" || pathname === "/hr/") {
    return <Navigate to="/hr/dashboard" replace />;
  }

  const tabs = [
    { label: t("nav.dashboard"),   href: "/hr/dashboard" },
    { label: t("nav.employees"),   href: "/hr/employees" },
    { label: t("nav.attendance"),  href: "/hr/attendance" },
    { label: t("nav.advances"),    href: "/hr/advances" },
    { label: t("nav.payroll"),     href: "/hr/payroll" },
    { label: t("nav.commissions"), href: "/hr/commissions" },
  ];

  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
