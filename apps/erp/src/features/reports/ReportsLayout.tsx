import { Outlet, Navigate, useLocation } from "react-router-dom";

export function ReportsLayout() {
  const { pathname } = useLocation();
  if (pathname === "/reports" || pathname === "/reports/")
    return <Navigate to="/reports/dashboard" replace />;
  return <Outlet />;
}
