import { useMemo, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PlayCircle, PauseCircle, XCircle, Copy } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { ModuleTabs } from "@/components/patterns/ModuleTabs";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { StatCard } from "@/components/patterns/StatCard";
import { Button } from "@/components/ui/button";

import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { isFlagEnabled } from "@/lib/flags";
import { useProjectsStore } from "@/stores/projectsStore";
import { useProjectsAudit } from "@/stores/projectsAudit";
import { useConstructionStore } from "@/stores/constructionStore";
import { CURRENT_EMPLOYEE_ID } from "@/features/projects/currentUser";
import { getProjectInvoices, getProjectEmployees } from "@/lib/mock/projects";
import { getProgressClaims, getRetention } from "@/lib/mock/construction";
import { formatMoney } from "@/lib/format";
import { computeProjectLedger } from "./ledger";
import type { ProjectStatus } from "@/features/projects/types";

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

/** `/projects/:id` — tabbed project detail shell (spec §5.2). */
export function ProjectDetailLayout() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("projects");
  const { t: tc } = useTranslation("construction");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const project = useProjectsStore((s) => s.projects[id]);
  const activateProject = useProjectsStore((s) => s.activateProject);
  const holdProject = useProjectsStore((s) => s.holdProject);
  const closeProject = useProjectsStore((s) => s.closeProject);
  const cloneProject = useProjectsStore((s) => s.cloneProject);
  const allTimeEntries = useProjectsStore((s) => s.time_entries);
  const allExpenses = useProjectsStore((s) => s.expenses);
  const appendAudit = useProjectsAudit((s) => s.append);

  const [holdOpen, setHoldOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const canClose = can("projects.project.close");
  const canCreate = can("projects.project.create");

  // Construction facet (FE_17) — gated by flag + project.mode; FE_16 is byte-identical when either is false.
  const isConstruction = isFlagEnabled("construction.enabled") && project?.mode === "construction";

  const openWork = useMemo(() => {
    if (!project) return [];
    const entries = Object.values(allTimeEntries).filter((e) => e.project_id === project.id);
    const expenses = Object.values(allExpenses).filter((e) => e.project_id === project.id);
    const invoices = getProjectInvoices(project.id);
    const employees = getProjectEmployees();
    return computeProjectLedger(entries, expenses, invoices, employees).openWork;
  }, [project, allTimeEntries, allExpenses]);

  // §11 header KPIs — contract value = Σ BOQ (live off the mutable store, which BOQ editing
  // writes to; not the fixture's precomputed field, and not the read-only fixture getter
  // either, since S2 edits would otherwise never show up here);
  // billed = Σ gross_current for claims that have at least been approved (draft/submitted aren't billed yet);
  // completion = value-weighted average of BOQ items' executed qty (spec §11 formula).
  const boqItemsAll = useConstructionStore((s) => s.boq_items);
  const constructionKpis = useMemo(() => {
    if (!project || !isConstruction) return null;
    const boqItems = Object.values(boqItemsAll);
    const contractValue = boqItems.reduce((sum, i) => sum + i.value, 0);
    const claims = getProgressClaims(project.id);
    const billed = claims
      .filter((c) => c.status === "approved" || c.status === "invoiced" || c.status === "collected")
      .reduce((sum, c) => sum + c.gross_current, 0);
    const retentionHeld = getRetention(project.id)?.outstanding ?? 0;
    const remaining = contractValue - billed;
    const executedValue = boqItems.reduce((sum, i) => sum + i.cumulative_executed_qty * i.unit_price, 0);
    const completionPct = contractValue > 0 ? (executedValue / contractValue) * 100 : 0;
    return { contractValue, billed, retentionHeld, remaining, completionPct, boqItems, claims };
  }, [project, isConstruction, boqItemsAll]);

  if (!project) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("detail.not_found")} />
        <p className="text-sm text-muted-foreground">{t("detail.not_found")}</p>
      </div>
    );
  }

  const title = `${project.code} · ${lang === "ar" ? project.title_ar : project.title_en}`;
  const base = `/projects/${id}`;

  // Construction mode replaces the professional-services tab set with the one spec §1 names explicitly
  // (Overview · BOQ · Claims · Retention · Subcontracts · Profitability · Documents) — milestones/time/
  // invoices/appointments/team don't apply to a BOQ+claims-billed contract. Non-construction projects are unaffected.
  const tabs = (isConstruction ? [
    { key: "overview", label: t("tab.overview"), href: base, end: true, perm: "construction.project.view" },
    { key: "boq", label: tc("tab.boq"), href: `${base}/boq`, perm: "construction.boq.edit" },
    { key: "claims", label: tc("tab.claims"), href: `${base}/claims`, perm: "construction.claim.view" },
    { key: "retention", label: tc("tab.retention"), href: `${base}/retention`, perm: "construction.retention.release" },
    { key: "subcontracts", label: tc("tab.subcontracts"), href: `${base}/subcontracts`, perm: "construction.subcontract.manage" },
    { key: "profitability", label: tc("tab.profitability"), href: `${base}/profitability`, perm: "construction.profitability.view" },
    { key: "documents", label: t("tab.documents"), href: `${base}/documents`, perm: "projects.document.view" },
  ] : [
    { key: "overview", label: t("tab.overview"), href: base, end: true, perm: "projects.project.view" },
    { key: "milestones", label: t("tab.milestones"), href: `${base}/milestones`, perm: "projects.milestone.view" },
    { key: "time", label: t("tab.time"), href: `${base}/time`, perm: "projects.time.view" },
    { key: "invoices", label: t("tab.invoices"), href: `${base}/invoices`, perm: "projects.invoice.view" },
    { key: "documents", label: t("tab.documents"), href: `${base}/documents`, perm: "projects.document.view" },
    { key: "appointments", label: t("tab.appointments"), href: `${base}/appointments`, perm: "projects.appointment.view" },
    { key: "team", label: t("tab.team"), href: `${base}/team`, perm: "projects.team.view" },
  ]).filter((tab) => can(tab.perm));

  function handleActivate() {
    const result = activateProject(project!.id);
    if (result.ok) toast.success(t("form.activate_toast"));
    else toast.error(t("list.activate_blocked_retainer"));
  }

  function handleClone() {
    const copy = cloneProject(project!.id);
    if (copy) {
      toast.success(t("list.clone_success", { code: copy.code }));
      navigate(`/projects/${copy.id}`);
    }
  }

  function confirmHold() {
    holdProject(project!.id);
    toast.success(t("status.on_hold"));
    setHoldOpen(false);
  }

  function confirmClose() {
    closeProject(project!.id);
    if (openWork.length > 0) {
      appendAudit({
        user: CURRENT_EMPLOYEE_ID,
        action: "projects.project.close_with_open_work",
        entity: project!.id,
        detail_ar: `إغلاق المشروع ${project!.code} مع ${openWork.length} بند مفتوح`,
        detail_en: `Closed project ${project!.code} with ${openWork.length} open item(s)`,
      });
    }
    toast.success(t("status.closed"));
    setCloseOpen(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant={statusPillVariant(project.status)} label={t(`status.${project.status}`)} />
            {canClose && (project.status === "draft" || project.status === "on_hold") && (
              <Button size="sm" variant="outline" onClick={handleActivate}>
                <PlayCircle className="h-4 w-4 me-1.5" />{t("action.activate")}
              </Button>
            )}
            {canClose && project.status === "active" && (
              <Button size="sm" variant="outline" onClick={() => setHoldOpen(true)}>
                <PauseCircle className="h-4 w-4 me-1.5" />{t("action.hold")}
              </Button>
            )}
            {canClose && (project.status === "active" || project.status === "on_hold") && (
              <Button size="sm" variant="outline" className="text-danger hover:text-danger" onClick={() => setCloseOpen(true)}>
                <XCircle className="h-4 w-4 me-1.5" />{t("action.close")}
              </Button>
            )}
            {canCreate && (
              <Button size="sm" variant="outline" onClick={handleClone}>
                <Copy className="h-4 w-4 me-1.5" />{t("list.action_clone")}
              </Button>
            )}
          </div>
        }
      />

      {isConstruction && constructionKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label={tc("hub.contract_value")} value={formatMoney(constructionKpis.contractValue, lang)} tone="brand" />
          <StatCard label={tc("hub.billed")} value={formatMoney(constructionKpis.billed, lang)} tone="success" />
          <StatCard label={tc("hub.retention")} value={formatMoney(constructionKpis.retentionHeld, lang)} tone="warning" />
          <StatCard label={tc("hub.remaining")} value={formatMoney(constructionKpis.remaining, lang)} />
          <StatCard label={tc("hub.completion")} value={`${constructionKpis.completionPct.toFixed(1)}%`} />
        </div>
      )}

      <ModuleTabs tabs={tabs} />
      <Outlet />

      <ConfirmDialog
        open={holdOpen}
        onOpenChange={setHoldOpen}
        title={t("list.hold_title")}
        description={t("list.hold_body")}
        confirmTone="warning"
        confirmLabel={t("action.hold")}
        onConfirm={confirmHold}
      />

      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title={t("list.close_title")}
        description={openWork.length > 0 ? t("overview.close_open_work_warning", { n: openWork.length }) : t("list.close_body")}
        confirmTone="danger"
        confirmLabel={t("action.close")}
        onConfirm={confirmClose}
      >
        {openWork.length > 0 && (
          <ul className="text-xs text-muted-foreground list-disc ps-4 space-y-0.5 max-h-32 overflow-y-auto">
            {openWork.map((w) => <li key={`${w.kind}_${w.id}`}>{w.label}</li>)}
          </ul>
        )}
      </ConfirmDialog>
    </div>
  );
}
