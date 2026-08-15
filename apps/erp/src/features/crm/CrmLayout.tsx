import { Outlet, Navigate, useLocation } from "react-router-dom";

export function CrmLayout() {
  const { pathname } = useLocation();
  if (pathname === "/customers" || pathname === "/customers/")
    return <Navigate to="/customers/list" replace />;
  return <Outlet />;
}
