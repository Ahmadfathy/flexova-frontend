import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";

interface ProjectsPlaceholderPageProps {
  /** Full i18n key (within the `projects` namespace) resolving to the screen title. */
  titleKey: string;
  icon: LucideIcon;
  /** Skip the page-level PageHeader when mounted inside a shell that already renders one (e.g. project detail tabs). */
  bare?: boolean;
}

/** Shared "screen not built yet" scaffold for FE_16 routes — PageHeader + standard EmptyState. */
export function ProjectsPlaceholderPage({ titleKey, icon, bare }: ProjectsPlaceholderPageProps) {
  const { t } = useTranslation("projects");
  const title = t(titleKey);

  if (bare) {
    return <EmptyState icon={icon} title={title} description={t("placeholder.note")} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <EmptyState icon={icon} title={title} description={t("placeholder.note")} />
    </div>
  );
}
