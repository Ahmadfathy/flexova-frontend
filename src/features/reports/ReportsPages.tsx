import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";

function Page({ k }: { k: string }) {
  const { t } = useTranslation("reports");
  return (
    <>
      <PageHeader title={t(`${k}.title`)} />
      <PageSection><EmptyState /></PageSection>
    </>
  );
}

export const ReportsDashboardPage = () => <Page k="dashboard" />;
export const ReportLibraryPage    = () => <Page k="library" />;
export const SavedReportsPage     = () => <Page k="saved" />;
export const EtaTaxPage           = () => <Page k="eta_tax" />;
export const ZReportPage          = () => <Page k="z_report" />;
export const SchedulingPage       = () => <Page k="scheduling" />;
