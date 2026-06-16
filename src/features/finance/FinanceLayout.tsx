import { Outlet, Navigate, useLocation } from "react-router-dom";

export function FinanceLayout() {
  const { pathname } = useLocation();
  if (pathname === "/finance" || pathname === "/finance/")
    return <Navigate to="/finance/dashboard" replace />;
  return <Outlet />;
}
