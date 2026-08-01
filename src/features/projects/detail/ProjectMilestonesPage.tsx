import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  GripVertical, MoreVertical, Pencil, Send, CheckCircle2, Receipt, Trash2, ListTree,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";
import { TableSkeleton } from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore, type MilestoneFormInput } from "@/stores/projectsStore";
import { useMockState } from "../useMockState";
import { MilestoneEditorDrawer } from "./MilestoneEditorDrawer";
import type { Milestone, MilestoneState } from "@/features/projects/types";

function statePillVariant(state: MilestoneState): PillVariant {
  switch (state) {
    case "in_progress": return "active";
    case "approved":    return "approved";
    case "invoiced":    return "inactive";
    default:            return "default";
  }
}

const BILLING_TINT: Record<string, string> = {
  fixed: "bg-brand-tint text-brand-text",
  tm: "bg-success-tint text-success-text",
  retainer: "bg-warning-tint text-warning-text",
};

function MilestoneRow({
  milestone, lang, canEdit, canApprove, canBill, t,
  onEdit, onRequest, onApprove, onBill, onDelete,
}: {
  milestone: Milestone;
  lang: "ar" | "en";
  canEdit: boolean;
  canApprove: boolean;
  canBill: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onEdit: () => void;
  onRequest: () => void;
  onApprove: () => void;
  onBill: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: milestone.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const billDisabled = milestone.state !== "approved";
  const canDelete = milestone.state === "draft" && canEdit;

  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0" aria-label="drag">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs font-mono text-muted-foreground shrink-0 w-5">{milestone.sequence}</span>

      <div className="min-w-[160px] flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{lang === "ar" ? milestone.name_ar : milestone.name_en}</p>
        {milestone.notes && <p className="text-xs text-muted-foreground truncate">{milestone.notes}</p>}
      </div>

      <Badge variant="outline" className={cn("border-transparent text-xs font-medium whitespace-nowrap", BILLING_TINT[milestone.billing_type])}>
        {t(`ms_type.${milestone.billing_type}`)}
      </Badge>

      <span className="text-sm tabular-nums w-28 shrink-0">
        {milestone.billing_type === "fixed"
          ? (milestone.fixed_amount != null ? formatMoney(milestone.fixed_amount, lang) : "—")
          : (milestone.hours_estimated != null ? `${milestone.hours_estimated}h` : "—")}
      </span>

      <StatusPill variant={statePillVariant(milestone.state)} label={t(`ms.state.${milestone.state}`)} />

      <span className="text-xs text-muted-foreground w-24 shrink-0">
        {milestone.target_date ? formatDate(milestone.target_date) : "—"}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7 ms-auto shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <RowActionsContent>
          {canEdit && (
            <RowActionItem icon={Pencil} onClick={onEdit}>{t("common:edit")}</RowActionItem>
          )}
          {canEdit && milestone.state === "draft" && (
            <RowActionItem icon={Send} onClick={onRequest}>{t("ms.request")}</RowActionItem>
          )}
          {canApprove && milestone.state === "in_progress" && (
            <RowActionItem icon={CheckCircle2} onClick={onApprove}>{t("ms.approve")}</RowActionItem>
          )}
          {canBill && milestone.state !== "invoiced" && (
            <RowActionItem
              icon={Receipt}
              disabled={billDisabled}
              title={billDisabled ? t("ms.bill_locked") : undefined}
              onClick={billDisabled ? undefined : onBill}
            >
              {t("ms.bill")}
            </RowActionItem>
          )}
          {canDelete && (
            <RowActionItem icon={Trash2} destructive onClick={onDelete}>{t("common:delete")}</RowActionItem>
          )}
        </RowActionsContent>
      </DropdownMenu>
    </div>
  );
}

export function ProjectMilestonesPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["projects", "common"]);
  const { lang } = useAppearance();
  const can = useCan();

  const allMilestones = useProjectsStore((s) => s.milestones);
  const addMilestone = useProjectsStore((s) => s.addMilestone);
  const updateMilestone = useProjectsStore((s) => s.updateMilestone);
  const requestMilestoneApproval = useProjectsStore((s) => s.requestMilestoneApproval);
  const approveMilestone = useProjectsStore((s) => s.approveMilestone);
  const deleteMilestone = useProjectsStore((s) => s.deleteMilestone);
  const reorderMilestones = useProjectsStore((s) => s.reorderMilestones);

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canEdit = can("projects.milestone.edit");
  const canApprove = can("projects.milestone.approve");
  const canBill = can("projects.invoice.create");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Milestone | null>(null);
  const [approveTarget, setApproveTarget] = useState<Milestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const milestones = useMemo(
    () => (forcedEmpty ? [] : Object.values(allMilestones).filter((m) => m.project_id === id).sort((a, b) => a.sequence - b.sequence)),
    [allMilestones, id, forcedEmpty]
  );

  function openNew() {
    setEditTarget(null);
    setDrawerOpen(true);
  }
  function openEdit(m: Milestone) {
    setEditTarget(m);
    setDrawerOpen(true);
  }
  function handleDrawerSave(input: MilestoneFormInput) {
    if (editTarget) updateMilestone(editTarget.id, input);
    else addMilestone(id, input);
    setDrawerOpen(false);
  }

  function handleRequest(m: Milestone) {
    requestMilestoneApproval(m.id);
    toast.success(t("ms.request_success"));
  }

  function confirmApprove() {
    if (!approveTarget) return;
    const result = approveMilestone(approveTarget.id);
    if (result.ok) {
      toast.success(t("ms.approve_success"));
      if (result.sodWarning) toast.warning(t("ms.sod_warning"));
    }
    setApproveTarget(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMilestone(deleteTarget.id);
    toast.success(t("ms.delete_success"));
    setDeleteTarget(null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = milestones.findIndex((m) => m.id === active.id);
    const newIndex = milestones.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(milestones, oldIndex, newIndex);
    reorderMilestones(id, reordered.map((m) => m.id));
  }

  if (loading) {
    return <PageSection><TableSkeleton rows={4} cols={6} /></PageSection>;
  }
  if (error) {
    return <PageSection><ErrorState onRetry={reload} /></PageSection>;
  }

  return (
    <div className="space-y-4">
      {isOffline && <OfflineBanner message={t("list.offline_note")} />}

      <PageSection
        title={t("ms.title")}
        actions={canEdit && !isOffline ? (
          <Button size="sm" variant="outline" onClick={openNew}>
            {t("ms.new")}
          </Button>
        ) : undefined}
        padded={false}
      >
        {milestones.length === 0 ? (
          <EmptyState icon={ListTree} title={t("ms.empty")} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={milestones.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              {milestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  lang={lang}
                  canEdit={canEdit && !isOffline}
                  canApprove={canApprove && !isOffline}
                  canBill={canBill && !isOffline}
                  t={t}
                  onEdit={() => openEdit(m)}
                  onRequest={() => handleRequest(m)}
                  onApprove={() => setApproveTarget(m)}
                  onBill={() => navigate("/projects/billing")}
                  onDelete={() => setDeleteTarget(m)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </PageSection>

      <MilestoneEditorDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        milestone={editTarget}
        onSave={handleDrawerSave}
      />

      <ConfirmDialog
        open={approveTarget !== null}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title={t("ms.approve_title")}
        description={t("ms.approve_body")}
        confirmTone="primary"
        confirmLabel={t("ms.approve")}
        onConfirm={confirmApprove}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("ms.delete_title")}
        description={t("ms.delete_body")}
        confirmTone="danger"
        confirmLabel={t("common:delete")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
