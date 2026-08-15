import { Outlet, Navigate, useLocation } from "react-router-dom";

export function EcommerceLayout() {
  const { pathname } = useLocation();
  if (pathname === "/ecommerce" || pathname === "/ecommerce/")
    return <Navigate to="/ecommerce/orders" replace />;
  return <Outlet />;
}
