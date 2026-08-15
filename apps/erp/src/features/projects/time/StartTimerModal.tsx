import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppearance } from "@/stores/appearance";
import { useProjectsStore } from "@/stores/projectsStore";
import { useTimerActions } from "./useTimerActions";

interface StartTimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selects and locks the project (e.g. opened from a project-scoped tab). */
  projectId?: string;
  isOffline?: boolean;
}

const TRACKABLE_STATUSES = new Set(["active", "on_hold"]);

export function StartTimerModal({ open, onOpenChange, projectId, isOffline }: StartTimerModalProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();
  const { startTimer } = useTimerActions();

  const projects = useProjectsStore((s) => s.projects);
  const milestones = useProjectsStore((s) => s.milestones);

  const [selectedProject, setSelectedProject] = useState(projectId ?? "");
  const [selectedMilestone, setSelectedMilestone] = useState("");
  const [description, setDescription] = useState("");
  const [attempted, setAttempted] = useState(false);

  const trackableProjects = useMemo(
    () => Object.values(projects).filter((p) => TRACKABLE_STATUSES.has(p.status)),
    [projects]
  );
  const projectMilestones = useMemo(
    () => Object.values(milestones).filter((m) => m.project_id === selectedProject),
    [milestones, selectedProject]
  );

  useEffect(() => {
    if (open) {
      setSelectedProject(projectId ?? "");
      setSelectedMilestone("");
      setDescription("");
      setAttempted(false);
    }
  }, [open, projectId]);

  const projectError = attempted && !selectedProject ? t("form.client_required") : undefined;

  function handleStart() {
    setAttempted(true);
    if (!selectedProject) return;
    startTimer({
      project_id: selectedProject,
      milestone_id: selectedMilestone || null,
      description_ar: description.trim(),
    }, isOffline);
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("time.start")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button onClick={handleStart}>{t("time.start")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t("form.client")} required error={projectError}>
          <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); setSelectedMilestone(""); }} disabled={!!projectId}>
            <SelectTrigger><SelectValue placeholder={t("form.client_placeholder")} /></SelectTrigger>
            <SelectContent>
              {trackableProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{lang === "ar" ? p.title_ar : p.title_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {selectedProject && (
          <FormField label={t("tab.milestones")}>
            <Select value={selectedMilestone || "__none__"} onValueChange={(v) => setSelectedMilestone(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {projectMilestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{lang === "ar" ? m.name_ar : m.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}

        <FormField label={t("time.description")}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </FormField>
      </div>
    </ModalShell>
  );
}
