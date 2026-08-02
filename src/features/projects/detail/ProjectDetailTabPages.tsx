import { Receipt } from "lucide-react";
import { ProjectsPlaceholderPage } from "../ProjectsPlaceholderPage";

// Each tab is a real nested route under `/projects/:id` (ModuleTabs is router-bound).
// The Invoices tab stays a placeholder — invoice generation lives in the billing hub
// (`/projects/billing`, Prompt 8); per-project invoice history isn't in the FE_16 scope.

export { ProjectOverviewPage } from "./ProjectOverviewPage";
export { ProjectMilestonesPage } from "./ProjectMilestonesPage";
export { ProjectTimePage } from "./ProjectTimePage";
export { ProjectDocumentsPage } from "./ProjectDocumentsPage";
export { ProjectAppointmentsPage } from "./ProjectAppointmentsPage";
export { ProjectTeamPage } from "./ProjectTeamPage";

export function ProjectInvoicesPage() {
  return <ProjectsPlaceholderPage titleKey="tab.invoices" icon={Receipt} bare />;
}
