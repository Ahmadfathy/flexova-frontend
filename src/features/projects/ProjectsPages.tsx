import { Briefcase, FilePlus2, Receipt, Clock, CheckCircle2 } from "lucide-react";
import { ProjectsPlaceholderPage } from "./ProjectsPlaceholderPage";

// ── Projects list + create (spec §4) — Prompt 2 builds these out ──────────
export function ProjectsListPage() {
  return <ProjectsPlaceholderPage titleKey="title" icon={Briefcase} />;
}

export function ProjectEditorPage() {
  return <ProjectsPlaceholderPage titleKey="new" icon={FilePlus2} />;
}

// ── Billing prep hub (spec §9) — Prompt 8 ──────────────────────────────────
export function BillingHubPage() {
  return <ProjectsPlaceholderPage titleKey="bill.title" icon={Receipt} />;
}

// ── Personal time + approvals (spec §7/§8) — Prompts 5/7 ──────────────────
export function PersonalTimePage() {
  return <ProjectsPlaceholderPage titleKey="time.title" icon={Clock} />;
}

export function TimeApprovalsPage() {
  return <ProjectsPlaceholderPage titleKey="appr.title" icon={CheckCircle2} />;
}

export { ProjectDetailLayout } from "./detail/ProjectDetailLayout";
export {
  ProjectOverviewPage,
  ProjectMilestonesPage,
  ProjectTimePage,
  ProjectInvoicesPage,
  ProjectDocumentsPage,
  ProjectAppointmentsPage,
  ProjectTeamPage,
} from "./detail/ProjectDetailTabPages";
