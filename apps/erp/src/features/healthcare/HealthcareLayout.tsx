import { Outlet, Navigate, useLocation } from "react-router-dom";

export function HealthcareLayout() {
  const { pathname } = useLocation();
  if (pathname === "/healthcare" || pathname === "/healthcare/")
    return <Navigate to="/healthcare/today" replace />;
  return <Outlet />;
}
