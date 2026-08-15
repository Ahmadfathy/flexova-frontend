import { Outlet, Navigate, useLocation } from "react-router-dom";

export function HrLayout() {
  const { pathname } = useLocation();
  if (pathname === "/hr" || pathname === "/hr/")
    return <Navigate to="/hr/dashboard" replace />;
  return <Outlet />;
}
