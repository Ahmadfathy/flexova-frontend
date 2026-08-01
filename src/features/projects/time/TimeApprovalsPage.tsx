import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Users, Briefcase, CheckCircle2, XCircle, CheckCheck } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { TableSkeleton, Skeleton } from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore } from "@/stores/projectsStore";
import { useMockState } from "../useMockState";
import { CURRENT_EMPLOYEE_ID } from "@/features/projects/currentUser";
import { getProjectEmployees, getProjectEmployee, getRoleRate } from "@/lib/mock/projects";
import { entryHours } from "@/features/projects/detail/ledger";
import { resolveRate } from "./rateResolution";
import { RejectReasonModal } from "./RejectReasonModal";
import type { TimeEntry, TimeEntryState } from "@/features/projects/types";

function statePillVariant(state: TimeEntryState): PillVariant {
  switch (state) {
    case "submitted": return "pending";
    case "approved":  return "approved";
    case "rejected":  return "rejected";
    default:          return "default";
  }
}

export function TimeApprovalsPage() {
  const { t } = useTranslation(["projects", "common"]);
  const { lang } = useAppearance();
  const can = useCan();

  const allEntries = useProjectsStore((s) => s.time_entries);
  const projects = useProjectsStore((s) => s.projects);
  const milestones = useProjectsStore((s) => s.milestones);
  const approveTimeEntry = useProjectsStore((s) => s.approveTimeEntry);
  const rejectTimeEntry = useProjectsStore((s) => s.rejectTimeEntry);
  const bulkApproveTimeEntries = useProjectsStore((s) => s.bulkApproveTimeEntries);

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canApprove = can("projects.time.approve");
  const canFinancials = can("projects.financials");

  const employees = useMemo(() => getProjectEmployees(), []);

  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [billable, setBillable] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<TimeEntry | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  function employeeName(id: string) {
    const e = employees.find((emp) => emp.id === id);
    return e ? (lang === "ar" ? e.name_ar : e.name_en) : id;
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
  function ratePreview(e: TimeEntry) {
    if (!e.billable) return null;
    const project = projects[e.project_id];
    const employee = getProjectEmployee(e.employee_id);
    return resolveRate(project, employee, getRoleRate).rate;
  }

  const pending = useMemo(() => {
    if (forcedEmpty) return [];
    return Object.values(allEntries).filter((e) => e.state === "submitted");
  }, [allEntries, forcedEmpty]);

  const filtered = useMemo(() => {
    let list = pending;
    if (employeeId) list = list.filter((e) => e.employee_id === employeeId);
    if (projectId) list = list.filter((e) => e.project_id === projectId);
    if (dateFrom) list = list.filter((e) => e.date >= dateFrom);
    if (dateTo) list = list.filter((e) => e.date <= dateTo);
    if (billable === "yes") list = list.filter((e) => e.billable);
    if (billable === "no") list = list.filter((e) => !e.billable);
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [pending, employeeId, projectId, dateFrom, dateTo, billable]);

  const noResults = forcedNoResults || (pending.length > 0 && filtered.length === 0);

  // Group by employee → project (spec §8.2)
  const groups = useMemo(() => {
    const byEmployee = new Map<string, TimeEntry[]>();
    filtered.forEach((e) => {
      const list = byEmployee.get(e.employee_id) ?? [];
      list.push(e);
      byEmployee.set(e.employee_id, list);
    });
    return Array.from(byEmployee.entries()).map(([empId, entries]) => {
      const byProject = new Map<string, TimeEntry[]>();
      entries.forEach((e) => {
        const list = byProject.get(e.project_id) ?? [];
        list.push(e);
        byProject.set(e.project_id, list);
      });
      return {
        employeeId: empId,
        projectGroups: Array.from(byProject.entries()).map(([pid, es]) => ({ projectId: pid, entries: es })),
      };
    });
  }, [filtered]);

  function clearFilters() {
    setEmployeeId(""); setProjectId(""); setDateFrom(""); setDateTo(""); setBillable("");
  }

  function toggleSelect(id: string, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }
  function selectAllPending() {
    setSelected(new Set(filtered.map((e) => e.id)));
  }

  function handleApprove(e: TimeEntry) {
    const result = approveTimeEntry(e.id);
    if (result.ok) {
      toast.success(t("appr.approve_success"));
      setSelected((s) => { const next = new Set(s); next.delete(e.id); return next; });
    } else if (result.reason === "self_approval") {
      toast.error(t("appr.self"));
    }
  }

  function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    rejectTimeEntry(rejectTarget.id, reason);
    toast.success(t("appr.reject_success"));
    setSelected((s) => { const next = new Set(s); next.delete(rejectTarget.id); return next; });
    setRejectTarget(null);
  }

  function handleBulkApprove() {
    const { approvedCount, blockedCount } = bulkApproveTimeEntries(Array.from(selected));
    setBulkConfirmOpen(false);
    setSelected(new Set());
    if (approvedCount > 0) toast.success(t("appr.bulk_success", { n: approvedCount }));
    if (blockedCount > 0) toast.warning(t("appr.self"));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("appr.title")} />
        <Skeleton className="h-12 w-full" />
        <TableSkeleton rows={5} cols={7} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("appr.title")} />
        <PageSection><ErrorState onRetry={reload} /></PageSection>
      </div>
    );
  }
  if (!canApprove) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("list.permission_required")}</p>
      </div>
    );
  }

  const readOnly = isOffline;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("appr.title")}
        count={pending.length > 0 ? String(pending.length) : undefined}
        alert={isOffline ? <OfflineBanner message={t("list.offline_note")} /> : undefined}
      />

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <Select value={employeeId || "__all__"} onValueChange={(v) => setEmployeeId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-32"><SelectValue placeholder={t("appr.all_employees")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("appr.all_employees")}</SelectItem>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{lang === "ar" ? e.name_ar : e.name_en}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={projectId || "__all__"} onValueChange={(v) => setProjectId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-32"><SelectValue placeholder={t("appr.all_projects")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("appr.all_projects")}</SelectItem>
              {Object.values(projects).map((p) => <SelectItem key={p.id} value={p.id}>{lang === "ar" ? p.title_ar : p.title_en}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={billable || "__all__"} onValueChange={(v) => setBillable(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-40"><SelectValue placeholder={t("appr.billable_all")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("appr.billable_all")}</SelectItem>
              <SelectItem value="yes">{t("appr.billable_yes")}</SelectItem>
              <SelectItem value="no">{t("appr.billable_no")}</SelectItem>
            </SelectContent>
          </Select>

          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder={t("filters.date_from")} className="h-10 w-auto" />
          <DatePicker value={dateTo} onChange={setDateTo} placeholder={t("filters.date_to")} className="h-10 w-auto" />

          {(employeeId || projectId || dateFrom || dateTo || billable) && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearFilters}>
              {t("list.clear_filters")}
            </Button>
          )}
        </div>

        {selected.size > 0 ? (
          <div className="px-4 py-2.5 border-b border-border bg-brand-tint flex items-center gap-3">
            <span className="text-sm text-brand-text font-medium">{t("time.selected", { n: selected.size })}</span>
            {!readOnly && (
              <Button size="sm" onClick={() => setBulkConfirmOpen(true)}>
                <CheckCheck className="h-4 w-4 me-1.5" />{t("appr.bulk")}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t("common:cancel")}</Button>
          </div>
        ) : filtered.length > 0 && !readOnly ? (
          <div className="px-4 py-2 border-b border-border">
            <Button size="sm" variant="ghost" onClick={selectAllPending}>{t("appr.select_all")}</Button>
          </div>
        ) : null}

        {pending.length === 0 ? (
          <EmptyState icon={CheckCircle2} title={t("appr.empty")} />
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("list.no_results_title")}</p>
            <p className="text-xs text-muted-foreground">{t("list.no_results_body")}</p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>{t("list.clear_filters")}</Button>
          </div>
        ) : (
          <>
            {/* Desktop / tablet — grouped table */}
            <div className="hidden md:block">
              <div className="flex items-center gap-3 px-4 h-10 border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="w-10" />
                <span className="w-32">{t("time.milestone")}</span>
                <span className="w-24">{t("time.date")}</span>
                <span className="w-16 text-end">{t("appr.hours")}</span>
                <span className="flex-1 min-w-32">{t("time.description")}</span>
                <span className="w-10 text-center">{t("time.billable")}</span>
                {canFinancials && <span className="w-24 text-end">{t("appr.rate")}</span>}
                <span className="w-24">{t("col.status")}</span>
                <span className="w-40 shrink-0 text-end">{t("col.actions")}</span>
              </div>

              {groups.map((g) => (
                <div key={g.employeeId}>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                    <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{employeeName(g.employeeId)}</span>
                  </div>

                  {g.projectGroups.map((pg) => (
                    <div key={pg.projectId}>
                      <div className="flex items-center gap-2 px-4 py-1.5 ps-8 bg-muted/10 border-b border-border">
                        <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">{projectLabel(pg.projectId)}</span>
                      </div>

                      {pg.entries.map((e) => {
                        const selfOwned = e.employee_id === CURRENT_EMPLOYEE_ID;
                        const preview = ratePreview(e);
                        return (
                          <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                            <span className="w-10 shrink-0">
                              <Checkbox
                                checked={selected.has(e.id)}
                                onCheckedChange={(v) => toggleSelect(e.id, !!v)}
                                disabled={readOnly}
                                aria-label={e.id}
                              />
                            </span>
                            <span className="w-32 text-sm truncate">{milestoneLabel(e.milestone_id)}</span>
                            <span className="w-24 text-xs text-muted-foreground">{formatDate(e.date)}</span>
                            <span className="w-16 text-end text-sm tabular-nums">{entryHours(e).toFixed(2)}h</span>
                            <span className="flex-1 min-w-32 text-sm truncate">{e.description_ar || "—"}</span>
                            <span className="w-10 text-center">
                              <Badge variant="outline" className={e.billable ? "border-transparent bg-success-tint text-success-text" : "border-transparent bg-muted text-muted-foreground"}>
                                {e.billable ? "✓" : "—"}
                              </Badge>
                            </span>
                            {canFinancials && (
                              <span className="w-24 text-end text-sm tabular-nums text-muted-foreground">
                                {preview != null ? formatMoney(preview, lang) : "—"}
                              </span>
                            )}
                            <span className="w-24">
                              <StatusPill variant={statePillVariant(e.state)} label={t(`time.state.${e.state}`)} />
                            </span>
                            <span className="w-40 shrink-0 flex items-center justify-end gap-1.5">
                              <Button
                                size="sm" variant="outline" disabled={readOnly || selfOwned}
                                title={selfOwned ? t("appr.self") : undefined}
                                onClick={() => handleApprove(e)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 me-1" />{t("appr.approve")}
                              </Button>
                              <Button
                                size="sm" variant="ghost" tone="danger" disabled={readOnly}
                                aria-label={t("appr.reject")} title={t("appr.reject")}
                                onClick={() => setRejectTarget(e)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Mobile — grouped cards, per-entry approve/reject */}
            <div className="md:hidden">
              {groups.map((g) => (
                <div key={g.employeeId}>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                    <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{employeeName(g.employeeId)}</span>
                  </div>
                  {g.projectGroups.map((pg) => (
                    <div key={pg.projectId}>
                      <div className="flex items-center gap-2 px-4 py-1.5 ps-8 bg-muted/10 border-b border-border">
                        <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">{projectLabel(pg.projectId)}</span>
                      </div>
                      {pg.entries.map((e) => {
                        const selfOwned = e.employee_id === CURRENT_EMPLOYEE_ID;
                        const preview = ratePreview(e);
                        return (
                          <div key={e.id} className="px-4 py-3 border-b border-border last:border-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{milestoneLabel(e.milestone_id)}</span>
                              <StatusPill variant={statePillVariant(e.state)} label={t(`time.state.${e.state}`)} />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{e.description_ar || "—"}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{formatDate(e.date)}</span>
                              <span className="tabular-nums">{entryHours(e).toFixed(2)}h</span>
                              <span>{e.billable ? t("time.billable") : "—"}</span>
                              {canFinancials && preview != null && <span className="tabular-nums">{formatMoney(preview, lang)}</span>}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                size="sm" variant="outline" className="flex-1" disabled={readOnly || selfOwned}
                                title={selfOwned ? t("appr.self") : undefined}
                                onClick={() => handleApprove(e)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 me-1" />{t("appr.approve")}
                              </Button>
                              <Button
                                size="sm" variant="ghost" tone="danger" className="flex-1" disabled={readOnly}
                                onClick={() => setRejectTarget(e)}
                              >
                                <XCircle className="h-3.5 w-3.5 me-1" />{t("appr.reject")}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </PageSection>

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={t("appr.bulk_confirm_title", { n: selected.size })}
        description={t("appr.bulk_confirm_body")}
        confirmTone="primary"
        confirmLabel={t("appr.bulk")}
        onConfirm={handleBulkApprove}
      />

      <RejectReasonModal
        open={rejectTarget !== null}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}
