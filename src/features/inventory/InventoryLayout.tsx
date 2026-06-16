import { Outlet, Navigate, useLocation } from "react-router-dom";

export function InventoryLayout() {
  const { pathname } = useLocation();
  if (pathname === "/inventory" || pathname === "/inventory/")
    return <Navigate to="/inventory/items" replace />;
  return <Outlet />;
}
