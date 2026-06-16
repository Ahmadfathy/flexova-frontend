import { Outlet, Navigate, useLocation } from "react-router-dom";

export function PurchasingLayout() {
  const { pathname } = useLocation();
  if (pathname === "/purchasing" || pathname === "/purchasing/")
    return <Navigate to="/purchasing/suppliers" replace />;
  return <Outlet />;
}
