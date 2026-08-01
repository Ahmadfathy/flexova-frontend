import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { FormField, FormGrid } from "@/components/patterns/FormLayout";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppearance } from "@/stores/appearance";
import { useProjectsStore } from "@/stores/projectsStore";
import { entryHours } from "@/features/projects/detail/ledger";
import type { TimeEntry } from "@/features/projects/types";

export interface TimeEntryFormValues {
  project_id: string;
  milestone_id: string | null;
  date: string;
  manual_minutes: number;
  description_ar: string;
  billable: boolean;
}

interface TimeEntryEditorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimeEntry | null; // null = new manual entry
  /** Locks the project to this id (project-scoped tab). */
  lockProjectId?: string;
  onSave: (values: TimeEntryFormValues) => void;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TimeEntryEditorDrawer({ open, onOpenChange, entry, lockProjectId, onSave }: TimeEntryEditorDrawerProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();

  const projects = useProjectsStore((s) => s.projects);
  const milestones = useProjectsStore((s) => s.milestones);

  const [projectId, setProjectId] = useState(lockProjectId ?? "");
  const [milestoneId, setMilestoneId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setProjectId(entry.project_id);
      setMilestoneId(entry.milestone_id ?? "");
      setDate(entry.date);
      setMinutes(entry.source === "manual" && entry.manual_minutes != null ? String(entry.manual_minutes) : "");
      setDescription(entry.description_ar);
      setBillable(entry.billable);
    } else {
      setProjectId(lockProjectId ?? "");
      setMilestoneId("");
      setDate(todayStr());
      setMinutes("");
      setDescription("");
      setBillable(true);
    }
    setAttempted(false);
  }, [open, entry, lockProjectId]);

  const trackableProjects = useMemo(() => Object.values(projects), [projects]);
  const projectMilestones = useMemo(
    () => Object.values(milestones).filter((m) => m.project_id === projectId),
    [milestones, projectId]
  );

  const isTimerOrigin = entry?.source === "timer";
  const projectError = attempted && !projectId ? t("form.client_required") : undefined;
  const minutesError = attempted && !isTimerOrigin && !(parseFloat(minutes) > 0) ? t("time.minutes_required") : undefined;

  function handleSave() {
    setAttempted(true);
    if (!projectId) return;
    if (!isTimerOrigin && !(parseFloat(minutes) > 0)) return;
    onSave({
      project_id: projectId,
      milestone_id: milestoneId || null,
      date,
      manual_minutes: isTimerOrigin ? (entry!.manual_minutes ?? 0) : parseFloat(minutes),
      description_ar: description.trim(),
      billable,
    });
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? t("time.edit_entry") : t("time.new_entry")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button onClick={handleSave}>{tCommon("save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t("time.project")} required error={projectError}>
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setMilestoneId(""); }} disabled={!!lockProjectId}>
            <SelectTrigger><SelectValue placeholder={t("form.client_placeholder")} /></SelectTrigger>
            <SelectContent>
              {trackableProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{lang === "ar" ? p.title_ar : p.title_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {projectId && (
          <FormField label={t("time.milestone")}>
            <Select value={milestoneId || "__none__"} onValueChange={(v) => setMilestoneId(v === "__none__" ? "" : v)}>
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

        <FormGrid cols={2}>
          <FormField label={t("time.date")} required>
            <DatePicker value={date} onChange={setDate} />
          </FormField>
          <FormField label={t("time.minutes")} error={minutesError} helper={isTimerOrigin ? t("time.locked_hint") : undefined}>
            {isTimerOrigin ? (
              <div className="h-10 flex items-center px-3 text-sm text-muted-foreground tabular-nums">
                {entry ? `${entryHours(entry).toFixed(2)}h` : "—"}
              </div>
            ) : (
              <Input type="number" min={1} className="tabular-nums" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            )}
          </FormField>
        </FormGrid>

        <FormField label={t("time.description")}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </FormField>

        <FormField label={t("time.billable")}>
          <Switch checked={billable} onCheckedChange={setBillable} />
        </FormField>
      </div>
    </DrawerShell>
  );
}
