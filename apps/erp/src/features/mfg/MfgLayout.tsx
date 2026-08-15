import { Outlet, Navigate, useLocation } from "react-router-dom";

export function MfgLayout() {
  const { pathname } = useLocation();
  if (pathname === "/mfg" || pathname === "/mfg/")
    return <Navigate to="/mfg/dashboard" replace />;
  return <Outlet />;
}
