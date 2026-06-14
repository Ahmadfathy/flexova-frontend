import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";

export function CrmLayout() {
  const { t } = useTranslation("crm");
  const { pathname } = useLocation();

  if (pathname === "/customers" || pathname === "/customers/") {
    return <Navigate to="/customers/list" replace />;
  }

  const tabs = [
    { label: t("nav.list"),           href: "/customers/list" },
    { label: t("nav.follow_ups"),     href: "/customers/follow-ups" },
    { label: t("nav.segments"),       href: "/customers/segments" },
    { label: t("nav.communications"), href: "/customers/communications" },
  ];

  return (
    <div>
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
