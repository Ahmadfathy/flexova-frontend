import { Outlet, Navigate, useLocation } from "react-router-dom";

export function WholesaleLayout() {
  const { pathname } = useLocation();
  if (pathname === "/wholesale" || pathname === "/wholesale/")
    return <Navigate to="/wholesale/orders" replace />;
  return <Outlet />;
}
