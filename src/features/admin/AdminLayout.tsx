import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";

export function AdminLayout() {
  const { t } = useTranslation("admin");
  const { pathname } = useLocation();

  if (pathname === "/admin" || pathname === "/admin/") {
    return <Navigate to="/admin/users" replace />;
  }

  const tabs = [
    { label: t("nav.users"),    href: "/admin/users" },
    { label: t("nav.roles"),    href: "/admin/roles" },
    { label: t("nav.branches"), href: "/admin/branches" },
    { label: t("nav.security"), href: "/admin/security" },
    { label: t("nav.audit"),    href: "/admin/audit" },
  ];

  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
