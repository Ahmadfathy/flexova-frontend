import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { useProjectsStore } from "@/stores/projectsStore";
import { useMockState } from "./useMockState";
import { TimerZone } from "./time/TimerZone";
import { TimesheetTable } from "./time/TimesheetTable";

/** `/time` — personal time screen: timer + timesheet across all of the employee's projects (spec §7). */
export function PersonalTimePage() {
  const { t } = useTranslation("projects");
  const { loading, error, isOffline, reload } = useMockState();
  const reconcilePendingSync = useProjectsStore((s) => s.reconcilePendingSync);

  useEffect(() => {
    if (!isOffline) reconcilePendingSync();
  }, [isOffline, reconcilePendingSync]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("time.title")} />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("time.title")} />
        <PageSection><ErrorState onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={t("time.title")} alert={isOffline ? <OfflineBanner message={t("list.offline_note")} /> : undefined} />
      <TimerZone isOffline={isOffline} />
      <TimesheetTable isOffline={isOffline} />
    </div>
  );
}
