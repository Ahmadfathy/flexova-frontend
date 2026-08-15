import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";

import { formatDate, formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { isFlagEnabled } from "@/lib/flags";
import { useMfgOrders } from "@/stores/mfgOrders";
import { getEmployees, hourlyRate } from "@/lib/mock/hr";
import type { ManufacturingOrder, MoStage } from "@/types/mfg";
import { ActionButton } from "./ActionButton";
import { ManualIssueDialog } from "./ManualIssueDialog";
import { RecordScrapDialog } from "./RecordScrapDialog";

const STAGE_PILL: Record<MoStage["status"], PillVariant> = {
  pending: "inactive",
  in_progress: "active",
  done: "approved",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface LaborFormState {
  employeeId: string;
  hours: string;
  manualCost: string;
}

const EMPTY_LABOR_FORM: LaborFormState = { employeeId: "", hours: "", manualCost: "" };

interface StagesTabProps {
  mo: ManufacturingOrder;
}

export function StagesTab({ mo }: StagesTabProps) {
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const can = useCan();

  const startStage = useMfgOrders((s) => s.startStage);
  const endStage = useMfgOrders((s) => s.endStage);
  const assignStage = useMfgOrders((s) => s.assignStage);
  const addLaborEntry = useMfgOrders((s) => s.addLaborEntry);

  const hrEnabled = isFlagEnabled("hr");
  const employees = useMemo(() => (hrEnabled ? getEmployees() : []), [hrEnabled]);

  const canExecute = can("mfg.order.execute");
  const canIssue = can("mfg.material.issue");
  const canScrap = can("mfg.scrap.record");
  const noPermissionTooltip = t("mo.no_permission_tooltip");

  const [laborForms, setLaborForms] = useState<Record<string, LaborFormState>>({});
  const [issueDialogStage, setIssueDialogStage] = useState<MoStage | null>(null);
  const [scrapDialogStage, setScrapDialogStage] = useState<MoStage | null>(null);

  function laborForm(stageId: string): LaborFormState {
    return laborForms[stageId] ?? EMPTY_LABOR_FORM;
  }
  function patchLaborForm(stageId: string, patch: Partial<LaborFormState>) {
    setLaborForms((f) => ({ ...f, [stageId]: { ...laborForm(stageId), ...patch } }));
  }

  function employeeName(id: string) {
    const emp = employees.find((e) => e.id === id);
    return emp ? (lang === "ar" ? emp.name_ar : emp.name_en) : id;
  }

  function handleStart(stageId: string) {
    startStage(mo.id, stageId);
    toast.success(t("mo.stage_started_toast"));
  }
  function handleEnd(stageId: string) {
    endStage(mo.id, stageId);
    toast.success(t("mo.stage_ended_toast"));
  }
  function handleAssign(stageId: string, employeeId: string) {
    assignStage(mo.id, stageId, employeeId || null);
  }

  function handleAddLabor(stageId: string) {
    const form = laborForm(stageId);
    const hours = parseFloat(form.hours);
    if (!hours || hours <= 0) { toast.error(t("mo.labor_hours_required")); return; }

    const emp = hrEnabled && form.employeeId ? employees.find((e) => e.id === form.employeeId) : undefined;
    const rate = emp ? hourlyRate(emp) : null;

    let cost: number;
    if (rate != null) {
      cost = round2(rate * hours);
    } else {
      const manual = parseFloat(form.manualCost);
      if (!manual || manual <= 0) { toast.error(t("mo.labor_cost_required")); return; }
      cost = manual;
    }

    addLaborEntry(mo.id, { stage_id: stageId, employee_id: emp?.id ?? null, hours, cost });
    toast.success(t("mo.labor_added_toast"));
    setLaborForms((f) => ({ ...f, [stageId]: EMPTY_LABOR_FORM }));
  }

  const sortedStages = [...mo.stages].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      {sortedStages.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">—</p>
      ) : sortedStages.map((stage) => {
        const stageLabor = mo.labor_entries.filter((l) => l.stage_id === stage.id);
        const stageScrap = mo.scrap.filter((s) => s.stage_id === stage.id);
        const form = laborForm(stage.id);
        const selectedEmp = hrEnabled && form.employeeId ? employees.find((e) => e.id === form.employeeId) : undefined;
        const rate = selectedEmp ? hourlyRate(selectedEmp) : null;
        const hoursNum = parseFloat(form.hours) || 0;
        const showManualCost = !rate;

        return (
          <div key={stage.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">{stage.order}.</span>
                <span className="text-sm font-medium">{stage.name_ar}</span>
                <StatusPill variant={STAGE_PILL[stage.status]} label={t(`mo.stage_${stage.status}`)} />
                {stageScrap.length > 0 && (
                  <span className="text-xs text-warning-text">{t("mo.stage_scrap_count", { n: stageScrap.length })}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {stage.status === "pending" && (
                  <ActionButton
                    label={t("mo.stage_start")}
                    onClick={() => handleStart(stage.id)}
                    disabled={!canExecute}
                    tooltip={noPermissionTooltip}
                    variant="outline"
                  />
                )}
                {stage.status === "in_progress" && (
                  <ActionButton
                    label={t("mo.stage_end")}
                    onClick={() => handleEnd(stage.id)}
                    disabled={!canExecute}
                    tooltip={noPermissionTooltip}
                    variant="outline"
                  />
                )}
              </div>
            </div>

            {/* Dates */}
            {(stage.started_at || stage.ended_at) && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {stage.started_at && <span>{t("mo.stage_started_at")}: <span className="tabular-nums">{formatDate(stage.started_at)}</span></span>}
                {stage.ended_at && <span>{t("mo.stage_ended_at")}: <span className="tabular-nums">{formatDate(stage.ended_at)}</span></span>}
              </div>
            )}

            {/* Assignee — hidden entirely when HR is disabled (FE_14 §10 flag-awareness) */}
            {hrEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{t("mo.stage_assignee")}:</span>
                <Select value={stage.assignee_id ?? "__none__"} onValueChange={(v) => handleAssign(stage.id, v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-8 w-56"><SelectValue placeholder={t("mo.stage_assignee_placeholder")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("mo.stage_unassigned")}</SelectItem>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{employeeName(e.id)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Labor */}
            <div className="pt-2 border-t border-border space-y-2">
              {stageLabor.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("mo.labor_list_empty")}</p>
              ) : (
                <div className="space-y-1">
                  {stageLabor.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {l.employee_id ? employeeName(l.employee_id) : t("mo.labor_manual_cost")}
                        {" · "}<span className="tabular-nums">{l.hours}</span> {t("mo.labor_hours")}
                      </span>
                      <span className="tabular-nums font-medium">{formatMoney(l.cost, lang)}</span>
                    </div>
                  ))}
                </div>
              )}

              {!hrEnabled && (
                <p className="text-xs text-muted-foreground">{t("mo.labor_no_hr_note")}</p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {hrEnabled && (
                  <Select value={form.employeeId || "__none__"} onValueChange={(v) => patchLaborForm(stage.id, { employeeId: v === "__none__" ? "" : v })}>
                    <SelectTrigger className="h-8 w-44"><SelectValue placeholder={t("mo.labor_employee")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("mo.stage_unassigned")}</SelectItem>
                      {employees.map((e) => <SelectItem key={e.id} value={e.id}>{employeeName(e.id)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  type="number" min={0} step={0.5} value={form.hours}
                  onChange={(e) => patchLaborForm(stage.id, { hours: e.target.value })}
                  placeholder={t("mo.labor_hours")}
                  className="h-8 w-24"
                />
                {showManualCost ? (
                  <Input
                    type="number" min={0} step={0.01} value={form.manualCost}
                    onChange={(e) => patchLaborForm(stage.id, { manualCost: e.target.value })}
                    placeholder={t("mo.labor_manual_cost")}
                    className="h-8 w-32"
                  />
                ) : (
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatMoney(round2((rate ?? 0) * hoursNum), lang)}
                  </span>
                )}
                <Button size="sm" variant="outline" disabled={!canExecute} onClick={() => handleAddLabor(stage.id)}>
                  {t("mo.labor_add_button")}
                </Button>
              </div>
              {selectedEmp && rate == null && (
                <p className="text-xs text-muted-foreground">{t("mo.labor_manual_cost_note")}</p>
              )}
            </div>

            {/* Manual material issue — advanced, only in manual issue mode; Record scrap always available */}
            <div className="pt-2 border-t border-border flex items-center gap-2">
              {mo.issue_mode === "manual" && (
                <ActionButton
                  label={t("mo.issue_button")}
                  onClick={() => setIssueDialogStage(stage)}
                  disabled={!canIssue}
                  tooltip={noPermissionTooltip}
                  variant="outline"
                />
              )}
              <ActionButton
                label={t("mo.scrap_button")}
                onClick={() => setScrapDialogStage(stage)}
                disabled={!canScrap}
                tooltip={noPermissionTooltip}
                variant="outline"
              />
            </div>
          </div>
        );
      })}

      {issueDialogStage && (
        <ManualIssueDialog
          open={!!issueDialogStage}
          onOpenChange={(o) => !o && setIssueDialogStage(null)}
          mo={mo}
          stageId={issueDialogStage.id}
          stageName={issueDialogStage.name_ar}
        />
      )}

      {scrapDialogStage && (
        <RecordScrapDialog
          open={!!scrapDialogStage}
          onOpenChange={(o) => !o && setScrapDialogStage(null)}
          mo={mo}
          stageId={scrapDialogStage.id}
          stageName={scrapDialogStage.name_ar}
        />
      )}
    </div>
  );
}
