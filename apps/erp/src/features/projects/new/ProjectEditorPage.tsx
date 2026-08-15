import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Building2 } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { FormField, FormGrid } from "@/components/patterns/FormLayout";
import { DatePicker } from "@/components/patterns/DatePicker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAppearance } from "@/stores/appearance";
import { useProjectsStore } from "@/stores/projectsStore";
import { getProjectEmployees } from "@/lib/mock/projects";
import type { BillingModel, MilestoneBillingType, ProjectClient } from "@/features/projects/types";
import { ProjectClientPicker } from "./ProjectClientPicker";

const ALL_BILLING: BillingModel[] = ["fixed", "tm", "retainer", "mixed"];
const ALL_MS_TYPES: MilestoneBillingType[] = ["fixed", "tm", "retainer"];

interface TeamRow {
  _key: string;
  employee_id: string;
  project_role: string;
}

interface MilestoneRow {
  _key: string;
  name_ar: string;
  name_en: string;
  billing_type: MilestoneBillingType;
  fixed_amount: string;
  hours_estimated: string;
  target_date: string;
}

let rowSeq = 1;
const newKey = () => `row_${Date.now()}_${rowSeq++}`;

function SortableMilestoneRow({
  row, index, onChange, onRemove, t,
}: {
  row: MilestoneRow;
  index: number;
  onChange: (key: string, patch: Partial<MilestoneRow>) => void;
  onRemove: (key: string) => void;
  t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row._key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="rounded border border-border p-3 space-y-3 bg-background">
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0"
          aria-label="drag"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs font-mono text-muted-foreground shrink-0 w-5">{index + 1}</span>
        <span className="flex-1" />
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-danger" onClick={() => onRemove(row._key)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <FormGrid cols={2}>
        <FormField label={t("form.milestone_name_ar")}>
          <Input value={row.name_ar} onChange={(e) => onChange(row._key, { name_ar: e.target.value })} dir="rtl" />
        </FormField>
        <FormField label={t("form.milestone_name_en")}>
          <Input value={row.name_en} onChange={(e) => onChange(row._key, { name_en: e.target.value })} dir="ltr" />
        </FormField>
      </FormGrid>

      <FormGrid cols={3}>
        <FormField label={t("form.milestone_billing_type")}>
          <Select value={row.billing_type} onValueChange={(v) => onChange(row._key, { billing_type: v as MilestoneBillingType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_MS_TYPES.map((mt) => <SelectItem key={mt} value={mt}>{t(`ms_type.${mt}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        {row.billing_type === "fixed" && (
          <FormField label={t("form.milestone_amount")}>
            <Input type="number" min={0} className="tabular-nums" value={row.fixed_amount} onChange={(e) => onChange(row._key, { fixed_amount: e.target.value })} />
          </FormField>
        )}
        <FormField label={t("form.milestone_hours_est")}>
          <Input type="number" min={0} className="tabular-nums" value={row.hours_estimated} onChange={(e) => onChange(row._key, { hours_estimated: e.target.value })} />
        </FormField>
        <FormField label={t("form.milestone_target_date")}>
          <DatePicker value={row.target_date} onChange={(v) => onChange(row._key, { target_date: v })} />
        </FormField>
      </FormGrid>
    </div>
  );
}

export function ProjectEditorPage() {
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const createProject = useProjectsStore((s) => s.createProject);
  const activateProject = useProjectsStore((s) => s.activateProject);
  const employees = getProjectEmployees();

  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [client, setClient] = useState<ProjectClient | null>(null);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [billingModel, setBillingModel] = useState<BillingModel>("tm");
  const [budgetEstimated, setBudgetEstimated] = useState("");
  const [hoursEstimated, setHoursEstimated] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetEnd, setTargetEnd] = useState("");
  const [retainerOpening, setRetainerOpening] = useState("");

  const [team, setTeam] = useState<TeamRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);

  const [attempted, setAttempted] = useState(false);
  const [activateAttempted, setActivateAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const clientError = attempted && !client ? t("form.client_required") : undefined;
  const titleArError = attempted && !titleAr.trim() ? t("form.title_ar_required") : undefined;
  const titleEnError = attempted && !titleEn.trim() ? t("form.title_en_required") : undefined;
  const typeError = attempted && !typeLabel.trim() ? t("form.type_label_required") : undefined;
  const startDateError = attempted && !startDate ? t("form.start_date_required") : undefined;
  const retainerAmountNum = parseFloat(retainerOpening || "0");
  const retainerError =
    activateAttempted && billingModel === "retainer" && !(retainerAmountNum > 0)
      ? t("form.retainer_opening_helper")
      : undefined;

  function isCoreValid() {
    return !!client && titleAr.trim() && titleEn.trim() && typeLabel.trim() && startDate;
  }

  function addTeamRow() {
    setTeam((rows) => [...rows, { _key: newKey(), employee_id: employees[0]?.id ?? "", project_role: "" }]);
  }
  function updateTeamRow(key: string, patch: Partial<TeamRow>) {
    setTeam((rows) => rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }
  function removeTeamRow(key: string) {
    setTeam((rows) => rows.filter((r) => r._key !== key));
  }

  function addMilestoneRow() {
    setMilestones((rows) => [...rows, {
      _key: newKey(), name_ar: "", name_en: "", billing_type: "tm",
      fixed_amount: "", hours_estimated: "", target_date: "",
    }]);
  }
  function updateMilestoneRow(key: string, patch: Partial<MilestoneRow>) {
    setMilestones((rows) => rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }
  function removeMilestoneRow(key: string) {
    setMilestones((rows) => rows.filter((r) => r._key !== key));
  }
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setMilestones((rows) => {
      const oldIndex = rows.findIndex((r) => r._key === active.id);
      const newIndex = rows.findIndex((r) => r._key === over.id);
      return arrayMove(rows, oldIndex, newIndex);
    });
  }

  function buildInput() {
    return {
      client_id: client!.id,
      title_ar: titleAr.trim(),
      title_en: titleEn.trim(),
      type_label: typeLabel.trim(),
      billing_model: billingModel,
      team: team.filter((r) => r.employee_id).map((r) => ({ employee_id: r.employee_id, project_role: r.project_role.trim() })),
      milestones: milestones.map((m, i) => ({
        sequence: i + 1,
        name_ar: m.name_ar.trim(),
        name_en: m.name_en.trim(),
        billing_type: m.billing_type,
        fixed_amount: m.billing_type === "fixed" && m.fixed_amount ? parseFloat(m.fixed_amount) : null,
        hours_estimated: m.hours_estimated ? parseFloat(m.hours_estimated) : null,
        target_date: m.target_date || null,
      })),
      budget_estimated: budgetEstimated ? parseFloat(budgetEstimated) : null,
      hours_estimated: hoursEstimated ? parseFloat(hoursEstimated) : null,
      start_date: startDate,
      target_end: targetEnd || null,
      retainer_opening_amount: billingModel === "retainer" && retainerAmountNum > 0 ? retainerAmountNum : null,
    };
  }

  async function handleSaveDraft() {
    setAttempted(true);
    if (!isCoreValid()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    const project = createProject(buildInput());
    setSaving(false);
    toast.success(t("form.draft_toast"));
    navigate(`/projects/${project.id}`);
  }

  async function handleCreateActivate() {
    setAttempted(true);
    setActivateAttempted(true);
    if (!isCoreValid()) return;
    if (billingModel === "retainer" && !(retainerAmountNum > 0)) return;

    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    const project = createProject(buildInput());
    const result = activateProject(project.id);
    setSaving(false);

    if (result.ok) {
      toast.success(t("form.activate_toast"));
    } else {
      toast.error(t("list.activate_blocked_retainer"));
    }
    navigate(`/projects/${project.id}`);
  }

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <PageHeader title={t("new")} />

      <PageSection title={t("form.details_section")}>
        <div className="space-y-4">
          <FormField label={t("form.client")} required error={clientError}>
            <Button type="button" variant="outline" className="w-full justify-start h-10" onClick={() => setClientPickerOpen(true)}>
              <Building2 className="h-4 w-4 me-2 text-muted-foreground" />
              {client ? (lang === "ar" ? client.name_ar : client.name_en) : t("form.client_placeholder")}
            </Button>
          </FormField>

          <FormGrid cols={2}>
            <FormField label={t("form.title_ar")} required error={titleArError}>
              <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" />
            </FormField>
            <FormField label={t("form.title_en")} required error={titleEnError}>
              <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" />
            </FormField>
          </FormGrid>

          <FormGrid cols={2}>
            <FormField label={t("form.type_label")} required error={typeError}>
              <Input value={typeLabel} onChange={(e) => setTypeLabel(e.target.value)} placeholder={t("form.type_label_placeholder")} />
            </FormField>
            <FormField label={t("form.billing_model")} required>
              <Select value={billingModel} onValueChange={(v) => setBillingModel(v as BillingModel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_BILLING.map((b) => <SelectItem key={b} value={b}>{t(`billing.${b}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>

          {billingModel === "retainer" && (
            <FormField label={t("form.retainer_opening")} helper={!retainerError ? t("form.retainer_opening_helper") : undefined} error={retainerError}>
              <Input type="number" min={0} className="tabular-nums" value={retainerOpening} onChange={(e) => setRetainerOpening(e.target.value)} placeholder="0" />
            </FormField>
          )}

          <FormGrid cols={2}>
            <FormField label={t("form.budget_estimated")}>
              <Input type="number" min={0} className="tabular-nums" value={budgetEstimated} onChange={(e) => setBudgetEstimated(e.target.value)} placeholder="0" />
            </FormField>
            <FormField label={t("form.hours_estimated")}>
              <Input type="number" min={0} className="tabular-nums" value={hoursEstimated} onChange={(e) => setHoursEstimated(e.target.value)} placeholder="0" />
            </FormField>
          </FormGrid>

          <FormGrid cols={2}>
            <FormField label={t("form.start_date")} required error={startDateError}>
              <DatePicker value={startDate} onChange={setStartDate} />
            </FormField>
            <FormField label={t("form.target_end")}>
              <DatePicker value={targetEnd} onChange={setTargetEnd} />
            </FormField>
          </FormGrid>
        </div>
      </PageSection>

      <PageSection
        title={t("form.team_section")}
        actions={<Button type="button" size="sm" variant="outline" onClick={addTeamRow}><Plus className="h-4 w-4 me-1.5" />{t("form.team_add")}</Button>}
      >
        {team.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("form.team_empty")}</p>
        ) : (
          <div className="space-y-3">
            {team.map((row) => (
              <div key={row._key} className="flex items-center gap-2">
                <Select value={row.employee_id} onValueChange={(v) => updateTeamRow(row._key, { employee_id: v })}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{lang === "ar" ? e.name_ar : e.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  placeholder={t("form.team_role_placeholder")}
                  value={row.project_role}
                  onChange={(e) => updateTeamRow(row._key, { project_role: e.target.value })}
                />
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-danger shrink-0" onClick={() => removeTeamRow(row._key)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection
        title={t("form.milestones_section")}
        subtitle={t("form.milestones_hint")}
        actions={<Button type="button" size="sm" variant="outline" onClick={addMilestoneRow}><Plus className="h-4 w-4 me-1.5" />{t("form.milestones_add")}</Button>}
      >
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("ms.empty")}</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={milestones.map((m) => m._key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {milestones.map((row, i) => (
                  <SortableMilestoneRow
                    key={row._key}
                    row={row}
                    index={i}
                    onChange={updateMilestoneRow}
                    onRemove={removeMilestoneRow}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </PageSection>

      {/* Actions — sticky bottom bar on mobile, inline on desktop */}
      <div className="hidden lg:flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => navigate("/projects")}>{t("form.cancel")}</Button>
        <Button type="button" variant="outline" disabled={saving} onClick={handleSaveDraft}>{t("form.save_draft")}</Button>
        <Button type="button" disabled={saving} onClick={handleCreateActivate}>{t("form.create_activate")}</Button>
      </div>
      <div className="lg:hidden fixed inset-x-0 bottom-0 p-3 bg-card border-t border-border flex items-center gap-2 z-10">
        <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={handleSaveDraft}>{t("form.save_draft")}</Button>
        <Button type="button" className="flex-1" disabled={saving} onClick={handleCreateActivate}>{t("form.create_activate")}</Button>
      </div>

      <ProjectClientPicker
        open={clientPickerOpen}
        onOpenChange={setClientPickerOpen}
        onPick={(c) => setClient(c)}
      />
    </div>
  );
}
