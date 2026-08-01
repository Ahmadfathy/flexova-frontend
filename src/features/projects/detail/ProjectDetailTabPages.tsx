import { LayoutDashboard, ListTree, Clock, Receipt, FileText, CalendarClock, Users } from "lucide-react";
import { ProjectsPlaceholderPage } from "../ProjectsPlaceholderPage";

// Each tab is a real nested route under `/projects/:id` (ModuleTabs is router-bound).
// Prompts 3/4/5/8/9 replace these placeholders with the real screens.

export function ProjectOverviewPage() {
  return <ProjectsPlaceholderPage titleKey="tab.overview" icon={LayoutDashboard} bare />;
}

export function ProjectMilestonesPage() {
  return <ProjectsPlaceholderPage titleKey="tab.milestones" icon={ListTree} bare />;
}

export function ProjectTimePage() {
  return <ProjectsPlaceholderPage titleKey="tab.time" icon={Clock} bare />;
}

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
