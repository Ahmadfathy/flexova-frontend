import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { PageSection } from "@/components/patterns/PageSection";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { useTranslation } from "react-i18next";
import { useProjectsStore } from "@/stores/projectsStore";
import { useMockState } from "../useMockState";
import { TimesheetTable } from "../time/TimesheetTable";
import { ExpensesTable } from "../time/ExpensesTable";

/** `/projects/:id/time` — the same timesheet table, pre-filtered to the project, plus an Expenses sub-table (spec §7.2/§7.6). */
export function ProjectTimePage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("projects");
  const { loading, error, isOffline, reload } = useMockState();
  const reconcilePendingSync = useProjectsStore((s) => s.reconcilePendingSync);

  useEffect(() => {
    if (!isOffline) reconcilePendingSync();
  }, [isOffline, reconcilePendingSync]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return <PageSection><ErrorState onRetry={reload} /></PageSection>;
  }

  return (
    <div className="space-y-4">
      {isOffline && <OfflineBanner message={t("list.offline_note")} />}
      <TimesheetTable projectId={id} isOffline={isOffline} />
      <ExpensesTable projectId={id} isOffline={isOffline} />
    </div>
  );
}
