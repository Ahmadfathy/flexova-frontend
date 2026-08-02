import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Users, Trash2 } from "lucide-react";

import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { TableSkeleton } from "@/components/patterns/Skeletons";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore } from "@/stores/projectsStore";
import { getProjectEmployees } from "@/lib/mock/projects";
import { useMockState } from "../useMockState";
import { AddTeamMemberModal } from "./AddTeamMemberModal";
import type { TeamMember } from "@/features/projects/types";

export function ProjectTeamPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();
  const can = useCan();

  const project = useProjectsStore((s) => s.projects[id]);
  const addTeamMember = useProjectsStore((s) => s.addTeamMember);
  const removeTeamMember = useProjectsStore((s) => s.removeTeamMember);
  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canManage = can("projects.team.manage");

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  const employees = useMemo(() => getProjectEmployees(), []);
  const team = useMemo(() => (forcedEmpty || !project ? [] : project.team), [project, forcedEmpty]);
  const candidates = useMemo(
    () => employees.filter((e) => !team.some((m) => m.employee_id === e.id)),
    [employees, team]
  );

  function handleAdd(employeeId: string, role: string) {
    addTeamMember(id, employeeId, role);
    toast.success(t("team.add_success"));
    setAddOpen(false);
  }

  function confirmRemove() {
    if (!removeTarget) return;
    removeTeamMember(id, removeTarget.employee_id);
    toast.success(t("team.remove_success"));
    setRemoveTarget(null);
  }

  if (loading) {
    return <PageSection><TableSkeleton rows={3} cols={3} /></PageSection>;
  }
  if (error) {
    return <PageSection><ErrorState onRetry={reload} /></PageSection>;
  }

  return (
    <div className="space-y-4">
      {isOffline && <OfflineBanner message={t("list.offline_note")} />}

      <PageSection
        title={t("team.title")}
        actions={canManage && !isOffline ? (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>{t("team.add")}</Button>
        ) : undefined}
        padded={false}
      >
        {team.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("team.empty_title")}
            description={t("team.empty_body")}
            action={canManage && !isOffline ? { label: t("team.add"), onClick: () => setAddOpen(true) } : undefined}
          />
        ) : (
          team.map((member) => {
            const employee = employees.find((e) => e.id === member.employee_id);
            const name = employee ? (lang === "ar" ? employee.name_ar : employee.name_en) : member.employee_id;
            return (
              <div key={member.employee_id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.project_role}</p>
                </div>
                {canManage && !isOffline && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-danger shrink-0"
                    title={t("team.remove")}
                    onClick={() => setRemoveTarget(member)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </PageSection>

      <AddTeamMemberModal
        open={addOpen}
        onOpenChange={setAddOpen}
        candidates={candidates}
        onSave={handleAdd}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={t("team.remove_title")}
        description={t("team.remove_body")}
        confirmTone="danger"
        confirmLabel={t("team.remove")}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
