import { Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";
import { useAppearance } from "@/stores/appearance";
import { getProject } from "@/lib/mock/projects";

/** `/projects/:id` — tabbed project detail shell (spec §5.2). Overview/Milestones/etc. built in later prompts. */
export function ProjectDetailLayout() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();

  const project = getProject(id);
  const title = project
    ? `${project.code} · ${lang === "ar" ? project.title_ar : project.title_en}`
    : id;

  const base = `/projects/${id}`;
  const tabs = [
    { label: t("tab.overview"), href: base, end: true },
    { label: t("tab.milestones"), href: `${base}/milestones` },
    { label: t("tab.time"), href: `${base}/time` },
    { label: t("tab.invoices"), href: `${base}/invoices` },
    { label: t("tab.documents"), href: `${base}/documents` },
    { label: t("tab.appointments"), href: `${base}/appointments` },
    { label: t("tab.team"), href: `${base}/team` },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <ModuleTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
