import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

/**
 * Layout route that redirects to /auth/login when the user is not
 * authenticated and dev-bypass is disabled.
 *
 * Usage in the router:
 *   <Route element={<AuthGuard />}>
 *     <Route element={<AppShell />}>…</Route>
 *   </Route>
 */
export function AuthGuard() {
  const { user, devBypass } = useAuthStore();

  if (devBypass || user) return <Outlet />;

  return <Navigate to="/auth/login" replace />;
}
