import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus, Download, Search, Briefcase, MoreVertical, Eye, Copy, PauseCircle, PlayCircle, XCircle, X,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { ProgressRow }   from "@/components/patterns/ProgressRow";
import { DataTable, RowActionsContent, RowActionItem, type Column } from "@/components/patterns/DataTable";
import { TableSkeleton, Skeleton } from "@/components/patterns/Skeletons";
import { ListRow } from "@/components/patterns/ListRow";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore } from "@/stores/projectsStore";
import { getProjectEmployees } from "@/lib/mock/projects";
import type { Project, ProjectStatus, BillingModel } from "@/features/projects/types";
import { useProjectsList } from "./useProjectsList";

const ALL_STATUSES: ProjectStatus[] = ["draft", "active", "on_hold", "closed", "archived", "cancelled"];
const ALL_BILLING: BillingModel[] = ["fixed", "tm", "retainer", "mixed"];

function statusPillVariant(status: ProjectStatus): PillVariant {
  switch (status) {
    case "active":    return "approved";
    case "on_hold":   return "pending";
    case "closed":    return "inactive";
    case "archived":  return "default";
    case "cancelled": return "rejected";
    default:          return "default";
  }
}

const BILLING_TINT: Record<BillingModel, string> = {
  fixed:    "bg-brand-tint text-brand-text",
  tm:       "bg-success-tint text-success-text",
  retainer: "bg-warning-tint text-warning-text",
  mixed:    "bg-muted text-muted-foreground",
};

function BillingBadge({ model, label }: { model: BillingModel; label: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent text-xs font-medium whitespace-nowrap", BILLING_TINT[model])}>
      {label}
    </Badge>
  );
}

export function ProjectsListPage() {
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const projects = useProjectsStore((s) => s.projects);
  const clients = useProjectsStore((s) => s.clients);
  const holdProject = useProjectsStore((s) => s.holdProject);
  const closeProject = useProjectsStore((s) => s.closeProject);
  const activateProject = useProjectsStore((s) => s.activateProject);
  const cloneProject = useProjectsStore((s) => s.cloneProject);

  const { loading, error, isOffline, forcedEmpty, reload } = useProjectsList();

  const employees = useMemo(() => getProjectEmployees(), []);
  const employeeName = useCallback(
    (id: string) => {
      const e = employees.find((e) => e.id === id);
      return e ? (lang === "ar" ? e.name_ar : e.name_en) : id;
    },
    [employees, lang]
  );
  const clientName = useCallback(
    (id: string) => {
      const c = clients[id];
      return c ? (lang === "ar" ? c.name_ar : c.name_en) : id;
    },
    [clients, lang]
  );

  const canFinancials = can("projects.financials");
  const canCreate = can("projects.project.create");
  const canClose = can("projects.project.close");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [clientId, setClientId] = useState("");
  const [billingModel, setBillingModel] = useState("");
  const [teamId, setTeamId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [holdTarget, setHoldTarget] = useState<Project | null>(null);
  const [closeTarget, setCloseTarget] = useState<Project | null>(null);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const allProjects = forcedEmpty ? [] : Object.values(projects);

  const typeOptions = useMemo(
    () => Array.from(new Set(allProjects.map((p) => p.type_label))).sort(),
    [allProjects]
  );

  function clearFilters() {
    setSearch(""); setStatus(""); setTypeLabel(""); setClientId("");
    setBillingModel(""); setTeamId(""); setDateFrom(""); setDateTo("");
  }

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (status) chips.push({ key: "status", label: t(`status.${status}`), clear: () => setStatus("") });
    if (typeLabel) chips.push({ key: "type", label: typeLabel, clear: () => setTypeLabel("") });
    if (clientId) chips.push({ key: "client", label: clientName(clientId), clear: () => setClientId("") });
    if (billingModel) chips.push({ key: "billing", label: t(`billing.${billingModel}`), clear: () => setBillingModel("") });
    if (teamId) chips.push({ key: "team", label: employeeName(teamId), clear: () => setTeamId("") });
    if (dateFrom) chips.push({ key: "from", label: `${t("filters.date_from")}: ${formatDate(dateFrom)}`, clear: () => setDateFrom("") });
    if (dateTo) chips.push({ key: "to", label: `${t("filters.date_to")}: ${formatDate(dateTo)}`, clear: () => setDateTo("") });
    return chips;
  }, [status, typeLabel, clientId, billingModel, teamId, dateFrom, dateTo, t, clientName, employeeName]);

  const filtered = useMemo(() => {
    let list = allProjects;
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.code.toLowerCase().includes(q) ||
        p.title_ar.toLowerCase().includes(q) ||
        p.title_en.toLowerCase().includes(q) ||
        clientName(p.client_id).toLowerCase().includes(q)
      );
    }
    if (status) list = list.filter((p) => p.status === status);
    if (typeLabel) list = list.filter((p) => p.type_label === typeLabel);
    if (clientId) list = list.filter((p) => p.client_id === clientId);
    if (billingModel) list = list.filter((p) => p.billing_model === billingModel);
    if (teamId) list = list.filter((p) => p.team.some((m) => m.employee_id === teamId));
    if (dateFrom) list = list.filter((p) => p.start_date >= dateFrom);
    if (dateTo) list = list.filter((p) => p.start_date <= dateTo);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProjects, search, status, typeLabel, clientId, billingModel, teamId, dateFrom, dateTo, lang]);

  const noResults = forcedNoResults || (allProjects.length > 0 && filtered.length === 0);

  function toggleSelect(id: string, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  function handleExport(ids?: string[]) {
    const n = ids ? ids.length : filtered.length;
    toast.success(t("list.export_toast", { n }));
    if (ids) setSelected(new Set());
  }

  function handleClone(p: Project) {
    const copy = cloneProject(p.id);
    if (copy) toast.success(t("list.clone_success", { code: copy.code }));
  }

  function handleActivate(p: Project) {
    const result = activateProject(p.id);
    if (result.ok) {
      toast.success(t("form.activate_toast"));
    } else if (result.reason === "retainer_required") {
      toast.error(t("list.activate_blocked_retainer"));
    }
  }

  const confirmHold = useCallback(() => {
    if (!holdTarget) return;
    holdProject(holdTarget.id);
    toast.success(t("status.on_hold"));
    setHoldTarget(null);
  }, [holdTarget, holdProject, t]);

  const confirmClose = useCallback(() => {
    if (!closeTarget) return;
    closeProject(closeTarget.id);
    toast.success(t("status.closed"));
    setCloseTarget(null);
  }, [closeTarget, closeProject, t]);

  if (!can("projects.project.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("list.permission_required")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("title")} />
        <Skeleton className="h-12 w-full" />
        <TableSkeleton rows={6} cols={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("title")} />
        <PageSection><ErrorState onRetry={reload} /></PageSection>
      </div>
    );
  }

  const baseColumns: Column<Project>[] = [
    {
      key: "select", header: "",
      cell: (p) => (
        <Checkbox
          checked={selected.has(p.id)}
          onCheckedChange={(v) => toggleSelect(p.id, !!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label={p.code}
        />
      ),
      className: "w-10",
    },
    {
      key: "code", header: t("col.code"), numeric: true,
      cell: (p) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}`); }}
          className="font-mono text-xs text-brand hover:underline"
          dir="ltr"
        >
          {p.code}
        </button>
      ),
    },
    {
      key: "title", header: t("col.title"),
      cell: (p) => (
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground truncate">{lang === "ar" ? p.title_ar : p.title_en}</span>
          <span className="block text-xs text-muted-foreground truncate">{p.type_label}</span>
        </span>
      ),
    },
    { key: "client", header: t("col.client"), cell: (p) => clientName(p.client_id) },
    {
      key: "status", header: t("col.status"),
      cell: (p) => <StatusPill variant={statusPillVariant(p.status)} label={t(`status.${p.status}`)} />,
    },
    {
      key: "billing", header: t("col.billing"),
      cell: (p) => <BillingBadge model={p.billing_model} label={t(`billing.${p.billing_model}`)} />,
    },
    {
      key: "hours", header: t("col.hours"), className: "min-w-40",
      cell: (p) => {
        const est = p.hours_estimated ?? 0;
        const actual = p.actuals_view.hours_actual;
        const pct = est > 0 ? Math.round((actual / est) * 100) : 0;
        return (
          <ProgressRow
            label={est > 0 ? `${actual}/${est}` : String(actual)}
            value={pct}
            tone={pct > 100 ? "danger" : "brand"}
          />
        );
      },
    },
  ];

  const marginColumn: Column<Project> = {
    key: "margin", header: t("col.margin"), numeric: true, className: "text-end",
    cell: (p) => <span className="font-medium tabular-nums">{formatMoney(p.actuals_view.margin_est, lang)}</span>,
  };

  const tailColumns: Column<Project>[] = [
    { key: "target_end", header: t("col.target_end"), cell: (p) => p.target_end ? formatDate(p.target_end) : "—" },
    {
      key: "actions", header: t("col.actions"),
      cell: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <RowActionsContent>
            <RowActionItem icon={Eye} onClick={() => navigate(`/projects/${p.id}`)}>
              {t("list.action_open")}
            </RowActionItem>
            {canCreate && !isOffline && (
              <RowActionItem icon={Copy} onClick={() => handleClone(p)}>
                {t("list.action_clone")}
              </RowActionItem>
            )}
            {canClose && !isOffline && (p.status === "draft" || p.status === "on_hold") && (
              <RowActionItem icon={PlayCircle} onClick={() => handleActivate(p)}>
                {t("list.action_activate")}
              </RowActionItem>
            )}
            {canClose && !isOffline && p.status === "active" && (
              <RowActionItem icon={PauseCircle} onClick={() => setHoldTarget(p)}>
                {t("list.action_hold")}
              </RowActionItem>
            )}
            {canClose && !isOffline && (p.status === "active" || p.status === "on_hold") && (
              <RowActionItem icon={XCircle} destructive onClick={() => setCloseTarget(p)}>
                {t("list.action_close")}
              </RowActionItem>
            )}
          </RowActionsContent>
        </DropdownMenu>
      ),
    },
  ];

  const columns: Column<Project>[] = [
    ...baseColumns,
    ...(canFinancials ? [marginColumn] : []),
    ...tailColumns,
  ];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("title")}
        count={allProjects.length > 0 ? t("list.count", { n: allProjects.length }) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleExport()}>
              <Download className="h-4 w-4 me-1.5" />
              {t("list.export")}
            </Button>
            {canCreate && (
              <Button size="sm" disabled={isOffline} onClick={() => navigate("/projects/new")}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("new")}
              </Button>
            )}
          </div>
        }
        alert={isOffline ? <OfflineBanner message={t("list.offline_note")} /> : undefined}
      />

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("list.search_placeholder")} className="ps-9" />
          </div>

          <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-32"><SelectValue placeholder={t("list.all_statuses")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_statuses")}</SelectItem>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={typeLabel || "__all__"} onValueChange={(v) => setTypeLabel(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-32"><SelectValue placeholder={t("list.all_types")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_types")}</SelectItem>
              {typeOptions.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={clientId || "__all__"} onValueChange={(v) => setClientId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-32"><SelectValue placeholder={t("list.all_clients")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_clients")}</SelectItem>
              {Object.values(clients).map((c) => (
                <SelectItem key={c.id} value={c.id}>{lang === "ar" ? c.name_ar : c.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={billingModel || "__all__"} onValueChange={(v) => setBillingModel(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-32"><SelectValue placeholder={t("list.all_billing")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_billing")}</SelectItem>
              {ALL_BILLING.map((b) => <SelectItem key={b} value={b}>{t(`billing.${b}`)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={teamId || "__all__"} onValueChange={(v) => setTeamId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-32"><SelectValue placeholder={t("list.all_team")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_team")}</SelectItem>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{lang === "ar" ? e.name_ar : e.name_en}</SelectItem>)}
            </SelectContent>
          </Select>

          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder={t("filters.date_from")} className="h-10 w-auto" />
          <DatePicker value={dateTo} onChange={setDateTo} placeholder={t("filters.date_to")} className="h-10 w-auto" />
        </div>

        {activeChips.length > 0 && (
          <div className="px-4 py-2.5 border-b border-border flex flex-wrap items-center gap-1.5">
            {activeChips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="gap-1 pe-1 cursor-pointer"
                onClick={chip.clear}
              >
                {chip.label}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
              {t("list.clear_filters")}
            </Button>
          </div>
        )}

        {selected.size > 0 && (
          <div className="px-4 py-2.5 border-b border-border bg-brand-tint flex items-center gap-3">
            <span className="text-sm text-brand-text font-medium">{t("list.count", { n: selected.size })}</span>
            <Button size="sm" variant="outline" onClick={() => handleExport(Array.from(selected))}>
              <Download className="h-4 w-4 me-1.5" />
              {t("list.export")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              {t("list.clear_filters")}
            </Button>
          </div>
        )}

        {allProjects.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={t("list.empty_title")}
            description={t("list.empty_body")}
            action={canCreate ? { label: t("new"), onClick: () => navigate("/projects/new") } : undefined}
          />
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("list.no_results_title")}</p>
            <p className="text-xs text-muted-foreground">{t("list.no_results_body")}</p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>{t("list.clear_filters")}</Button>
          </div>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden md:block overflow-x-auto">
              <DataTable columns={columns} data={filtered} keyExtractor={(p) => p.id} />
            </div>

            {/* Mobile card list */}
            <div className="md:hidden">
              {filtered.map((p) => (
                <ListRow
                  key={p.id}
                  leading={<Briefcase className="h-4 w-4" />}
                  title={lang === "ar" ? p.title_ar : p.title_en}
                  subtitle={`${p.code} · ${clientName(p.client_id)}`}
                  trailing={<StatusPill variant={statusPillVariant(p.status)} label={t(`status.${p.status}`)} />}
                  chevron
                  onClick={() => navigate(`/projects/${p.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </PageSection>

      <ConfirmDialog
        open={holdTarget !== null}
        onOpenChange={(o) => !o && setHoldTarget(null)}
        title={t("list.hold_title")}
        description={t("list.hold_body")}
        confirmTone="warning"
        confirmLabel={t("list.action_hold")}
        onConfirm={confirmHold}
      />

      <ConfirmDialog
        open={closeTarget !== null}
        onOpenChange={(o) => !o && setCloseTarget(null)}
        title={t("list.close_title")}
        description={t("list.close_body")}
        confirmTone="danger"
        confirmLabel={t("list.action_close")}
        onConfirm={confirmClose}
      />
    </div>
  );
}
