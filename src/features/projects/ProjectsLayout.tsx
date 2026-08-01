import { Outlet } from "react-router-dom";

/** `/projects` root — the index route itself is the list page, no redirect needed. */
export function ProjectsLayout() {
  return <Outlet />;
}
