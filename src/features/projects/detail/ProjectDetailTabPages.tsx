import { Receipt, FileText, CalendarClock, Users } from "lucide-react";
import { ProjectsPlaceholderPage } from "../ProjectsPlaceholderPage";

// Each tab is a real nested route under `/projects/:id` (ModuleTabs is router-bound).
// Prompts 8/9 replace the remaining placeholders with the real screens.

export { ProjectOverviewPage } from "./ProjectOverviewPage";
export { ProjectMilestonesPage } from "./ProjectMilestonesPage";
export { ProjectTimePage } from "./ProjectTimePage";

export function ProjectInvoicesPage() {
  return <ProjectsPlaceholderPage titleKey="tab.invoices" icon={Receipt} bare />;
}

export function ProjectDocumentsPage() {
  return <ProjectsPlaceholderPage titleKey="tab.documents" icon={FileText} bare />;
}

export function ProjectAppointmentsPage() {
  return <ProjectsPlaceholderPage titleKey="tab.appointments" icon={CalendarClock} bare />;
}

export function ProjectTeamPage() {
  return <ProjectsPlaceholderPage titleKey="tab.team" icon={Users} bare />;
}
