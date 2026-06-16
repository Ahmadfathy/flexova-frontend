import { Outlet, Navigate, useLocation } from "react-router-dom";

export function SalesLayout() {
  const { pathname } = useLocation();
  if (pathname === "/sales" || pathname === "/sales/")
    return <Navigate to="/sales/invoices" replace />;
  return <Outlet />;
}
