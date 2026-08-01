import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Pencil, Clock } from "lucide-react";

import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { ListRow } from "@/components/patterns/ListRow";
import { DataTable, ActionCell, type Column } from "@/components/patterns/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore } from "@/stores/projectsStore";
import { CURRENT_EMPLOYEE_ID } from "@/features/projects/currentUser";
import { entryHours } from "@/features/projects/detail/ledger";
import { TimeEntryEditorDrawer, type TimeEntryFormValues } from "./TimeEntryEditorDrawer";
import type { TimeEntry, TimeEntryState } from "@/features/projects/types";

interface TimesheetTableProps {
  /** When set, filters to this project and hides the project column (project-scoped tab). */
  projectId?: string;
  isOffline?: boolean;
}

function statePillVariant(state: TimeEntryState): PillVariant {
  switch (state) {
    case "submitted": return "pending";
    case "approved":  return "approved";
    case "rejected":  return "rejected";
    default:          return "default";
  }
}

export function TimesheetTable({ projectId, isOffline }: TimesheetTableProps) {
  const { t } = useTranslation(["projects", "common"]);
  const { lang } = useAppearance();
  const can = useCan();

  const allEntries = useProjectsStore((s) => s.time_entries);
  const projects = useProjectsStore((s) => s.projects);
  const milestones = useProjectsStore((s) => s.milestones);
  const pendingSyncIds = useProjectsStore((s) => s.pendingSyncIds);
  const addManualTimeEntry = useProjectsStore((s) => s.addManualTimeEntry);
  const updateTimeEntry = useProjectsStore((s) => s.updateTimeEntry);
  const submitTimeEntries = useProjectsStore((s) => s.submitTimeEntries);

  // Time is the one module surface that stays writable offline (kickoff §11 / spec §7.6 —
  // entries queue locally and reconcile on reconnect); `isOffline` only tags new
  // rows for the sync chip below, it never disables logging.
  const canLog = can("projects.time.log");
  const canViewAll = can("projects.time.view_all");
  const canFinancials = can("projects.financials");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TimeEntry | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const entries = useMemo(() => {
    return Object.values(allEntries)
      .filter((e) => (projectId ? e.project_id === projectId : true))
      .filter((e) => canViewAll || e.employee_id === CURRENT_EMPLOYEE_ID)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allEntries, projectId, canViewAll]);

  function isSelectable(e: TimeEntry) {
    return e.state === "draft" && e.employee_id === CURRENT_EMPLOYEE_ID;
  }
  const selectableIds = useMemo(() => entries.filter(isSelectable).map((e) => e.id), [entries]);

  function toggleSelect(id: string, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }
  function selectAllDrafts() {
    setSelected(new Set(selectableIds));
  }

  function projectLabel(id: string) {
    const p = projects[id];
    return p ? (lang === "ar" ? p.title_ar : p.title_en) : id;
  }
  function milestoneLabel(id: string | null) {
    if (!id) return "—";
    const m = milestones[id];
    return m ? (lang === "ar" ? m.name_ar : m.name_en) : "—";
  }

  function openNew() {
    setEditTarget(null);
    setDrawerOpen(true);
  }
  function openEdit(e: TimeEntry) {
    setEditTarget(e);
    setDrawerOpen(true);
  }
  function handleDrawerSave(values: TimeEntryFormValues) {
    if (editTarget) {
      updateTimeEntry(editTarget.id, values);
    } else {
      addManualTimeEntry({
        project_id: values.project_id,
        milestone_id: values.milestone_id,
        date: values.date,
        manual_minutes: values.manual_minutes,
        description_ar: values.description_ar,
        billable: values.billable,
      }, isOffline);
    }
    setDrawerOpen(false);
  }

  function handleSubmit() {
    submitTimeEntries(Array.from(selected));
    toast.success(t("time.submitted_toast"));
    setSelected(new Set());
  }

  const columns: Column<TimeEntry>[] = [
    {
      key: "select", header: "",
      cell: (e) => isSelectable(e) ? (
        <Checkbox checked={selected.has(e.id)} onCheckedChange={(v) => toggleSelect(e.id, !!v)} aria-label={e.id} />
      ) : null,
      className: "w-10",
    },
    ...(projectId ? [] : [{ key: "project", header: t("time.project"), cell: (e: TimeEntry) => projectLabel(e.project_id) } as Column<TimeEntry>]),
    { key: "milestone", header: t("time.milestone"), cell: (e) => milestoneLabel(e.milestone_id) },
    { key: "date", header: t("time.date"), cell: (e) => formatDate(e.date) },
    { key: "hours", header: t("time.minutes"), numeric: true, cell: (e) => <span className="tabular-nums">{entryHours(e).toFixed(2)}h</span> },
    { key: "description", header: t("time.description"), cell: (e) => <span className="truncate block max-w-56">{e.description_ar || "—"}</span> },
    {
      key: "billable", header: t("time.billable"),
      cell: (e) => (
        <Badge variant="outline" className={e.billable ? "border-transparent bg-success-tint text-success-text" : "border-transparent bg-muted text-muted-foreground"}>
          {e.billable ? "✓" : "—"}
        </Badge>
      ),
    },
    {
      key: "state", header: "",
      cell: (e) => (
        <div className="flex items-center gap-1.5">
          <StatusPill variant={statePillVariant(e.state)} label={t(`time.state.${e.state}`)} />
          {pendingSyncIds.includes(e.id) && (
            <Badge variant="outline" className="border-transparent bg-warning-tint text-warning-text text-[10px]">
              {t("time.sync_local")}
            </Badge>
          )}
        </div>
      ),
    },
    ...(canFinancials ? [{
      key: "rate", header: t("col.margin"),
      cell: (e: TimeEntry) => e.rate_resolved != null
        ? <span className="tabular-nums">{formatMoney(e.rate_resolved, lang)}</span>
        : <span className="text-xs text-muted-foreground italic">{t("time.rate_pending")}</span>,
    } as Column<TimeEntry>] : []),
    {
      key: "actions", header: "",
      cell: (e) => (
        <ActionCell
          actions={e.state === "draft" && e.employee_id === CURRENT_EMPLOYEE_ID
            ? [{ icon: <Pencil className="h-3.5 w-3.5" />, label: t("common:edit"), onClick: () => openEdit(e) }]
            : []}
        />
      ),
    },
  ];

  return (
    <PageSection
      title={t("time.title")}
      actions={canLog ? <Button size="sm" variant="outline" onClick={openNew}><Plus className="h-4 w-4 me-1.5" />{t("time.new_entry")}</Button> : undefined}
      padded={false}
    >
      {entries.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={Clock} title={t("time.empty_title")} description={t("time.empty_body")} />
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="px-4 py-2.5 border-b border-border bg-brand-tint flex items-center gap-3">
              <span className="text-sm text-brand-text font-medium">{t("time.selected", { n: selected.size })}</span>
              <Button size="sm" onClick={handleSubmit}>{t("time.submit")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t("common:cancel")}</Button>
            </div>
          )}
          {selected.size === 0 && selectableIds.length > 0 && (
            <div className="px-4 py-2 border-b border-border">
              <Button size="sm" variant="ghost" onClick={selectAllDrafts}>{t("time.select_all_drafts")}</Button>
            </div>
          )}

          {/* Desktop / tablet table */}
          <div className="hidden md:block overflow-x-auto">
            <DataTable columns={columns} data={entries} keyExtractor={(e) => e.id} />
          </div>

          {/* Mobile card list */}
          <div className="md:hidden">
            {entries.map((e) => (
              <ListRow
                key={e.id}
                leading={<Clock className="h-4 w-4" />}
                title={projectId ? milestoneLabel(e.milestone_id) : projectLabel(e.project_id)}
                subtitle={`${formatDate(e.date)} · ${entryHours(e).toFixed(2)}h`}
                trailing={<StatusPill variant={statePillVariant(e.state)} label={t(`time.state.${e.state}`)} />}
                onClick={e.state === "draft" && e.employee_id === CURRENT_EMPLOYEE_ID ? () => openEdit(e) : undefined}
              />
            ))}
          </div>
        </>
      )}

      <TimeEntryEditorDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        entry={editTarget}
        lockProjectId={projectId}
        onSave={handleDrawerSave}
      />
    </PageSection>
  );
}
