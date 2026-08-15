import { Navigate, Outlet, useParams } from "react-router-dom";
import { useProjectsStore } from "@/stores/projectsStore";
import { isFlagEnabled } from "@/lib/flags";

/**
 * Blocks direct URL access to construction sub-routes (/projects/:id/boq etc.)
 * for non-construction (or flag-off) projects — the tab bar already hides
 * these links, but a typed/bookmarked URL could otherwise still reach them.
 * Redirects to the project's Overview tab, matching what the tab bar shows.
 */
export function ConstructionGuard() {
  const { id = "" } = useParams<{ id: string }>();
  const project = useProjectsStore((s) => s.projects[id]);
  const isConstruction = isFlagEnabled("construction.enabled") && project?.mode === "construction";

  if (!project) return null; // parent ProjectDetailLayout already renders the not-found state
  if (!isConstruction) return <Navigate to={`/projects/${id}`} replace />;
  return <Outlet />;
}
