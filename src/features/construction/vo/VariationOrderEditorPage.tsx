import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Lock, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { FormField, FormGrid, FormActions } from "@/components/patterns/FormLayout";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useConstructionStore } from "@/stores/constructionStore";
import { useMockState } from "@/features/projects/useMockState";
import { getPhases } from "@/lib/mock/construction";
import { computeVoLineImpact } from "@/features/construction/calc";
import { BoqItemFormDialog } from "@/features/construction/boq/BoqItemFormDialog";
import type { VoLine, VoLineType, VoStatus } from "@/features/construction/types";
import type { BoqItemFormInput, VoDraftInput } from "@/stores/constructionStore";

const STATUS_PILL: Record<VoStatus, PillVariant> = {
  draft: "inactive",
  submitted: "pending",
  approved: "approved",
  rejected: "rejected",
};

function emptyLine(type: VoLineType = "add_item"): VoLine {
  return { type, detail_ar: "" };
}

export function VariationOrderEditorPage() {
  const { id = "", vo: voParam = "" } = useParams<{ id: string; vo: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const isNew = voParam === "new";
  const existingVo = useConstructionStore((s) => (isNew ? undefined : s.variation_orders[voParam]));
  const boqItemsAll = useConstructionStore((s) => s.boq_items);
  const createVariationOrder = useConstructionStore((s) => s.createVariationOrder);
  const updateVariationOrderDraft = useConstructionStore((s) => s.updateVariationOrderDraft);
  const submitVariationOrder = useConstructionStore((s) => s.submitVariationOrder);
  const approveVariationOrder = useConstructionStore((s) => s.approveVariationOrder);
  const rejectVariationOrder = useConstructionStore((s) => s.rejectVariationOrder);
  const { isOffline } = useMockState();

  const phases = useMemo(() => getPhases(id), [id]);
  const contractValueNow = useMemo(() => Object.values(boqItemsAll).reduce((sum, i) => sum + i.value, 0), [boqItemsAll]);

  const canCreate = can("construction.vo.create");
  const canApprove = can("construction.vo.approve");

  const [reasonAr, setReasonAr] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [extRef, setExtRef] = useState("");
  const [lines, setLines] = useState<VoLine[]>([emptyLine()]);
  const [configuringLine, setConfiguringLine] = useState<number | null>(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (existingVo) {
      setReasonAr(existingVo.reason_ar);
      setDate(existingVo.date);
      setExtRef(existingVo.ext_ref ?? "");
      setLines(existingVo.lines.length ? existingVo.lines : [emptyLine()]);
    }
  }, [existingVo]);

  const isDraftEditable = isNew || existingVo?.status === "draft";
  const status = existingVo?.status;

  function updateLine(index: number, patch: Partial<VoLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function targetOf(line: VoLine) {
    return line.target_boq_item ? boqItemsAll[line.target_boq_item] : undefined;
  }

  const impact = useMemo(() => {
    let valueImpact = 0;
    let costImpact = 0;
    for (const line of lines) {
      const target = targetOf(line);
      const r = computeVoLineImpact({
        type: line.type,
        new_item: line.new_item,
        new_qty: line.new_qty,
        new_price: line.new_price,
        target: target ? { estimated_qty: target.estimated_qty, unit_price: target.unit_price, estimated_unit_cost: target.estimated_unit_cost } : undefined,
      });
      valueImpact += r.valueImpact;
      costImpact += r.costImpact;
    }
    return { valueImpact, costImpact, marginImpact: valueImpact - costImpact };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, boqItemsAll]);

  function lineNarrative(line: VoLine): string {
    if (line.type === "add_item" && line.new_item) {
      return `إضافة بند: ${line.new_item.description_ar} — ${line.new_item.estimated_qty} ${line.new_item.unit_ar} بسعر ${line.new_item.unit_price} ج/${line.new_item.unit_ar}`;
    }
    const target = targetOf(line);
    if (line.type === "modify_qty" && target && line.new_qty != null) {
      return `تعديل كمية: ${target.description_ar} من ${target.estimated_qty} إلى ${line.new_qty} ${target.unit_ar}`;
    }
    if (line.type === "modify_price" && target && line.new_price != null) {
      return `تعديل سعر: ${target.description_ar} من ${formatMoney(target.unit_price, "ar")} إلى ${formatMoney(line.new_price, "ar")}`;
    }
    return "";
  }

  function linesValid(): boolean {
    return lines.every((line) => {
      if (line.type === "add_item") return !!line.new_item;
      if (line.type === "modify_qty") return !!line.target_boq_item && line.new_qty != null;
      if (line.type === "modify_price") return !!line.target_boq_item && line.new_price != null;
      return false;
    });
  }

  function buildInput(): VoDraftInput {
    return { reason_ar: reasonAr.trim(), date, ext_ref: extRef.trim() || undefined, lines: lines.map((l) => ({ ...l, detail_ar: lineNarrative(l) })) };
  }

  function handleSaveDraft() {
    setAttempted(true);
    if (!reasonAr.trim() || lines.length === 0 || !linesValid()) return;
    if (isNew) {
      const result = createVariationOrder(id, buildInput());
      if (result.ok) navigate(`/projects/${id}/variations/${result.id}`);
    } else if (existingVo) {
      updateVariationOrderDraft(id, existingVo.id, buildInput());
      toast.success(t("vo.save_success"));
    }
  }

  function handleSubmit() {
    setAttempted(true);
    if (!reasonAr.trim() || lines.length === 0 || !linesValid()) return;
    let voId = existingVo?.id;
    if (isNew) {
      const result = createVariationOrder(id, buildInput());
      voId = result.id;
    } else if (existingVo) {
      updateVariationOrderDraft(id, existingVo.id, buildInput());
    }
    if (voId) {
      submitVariationOrder(id, voId);
      navigate(`/projects/${id}/variations/${voId}`);
    }
  }

  function confirmApprove() {
    if (!existingVo) return;
    const result = approveVariationOrder(id, existingVo.id);
    setApproveConfirmOpen(false);
    if (result.ok) toast.success(t("vo.save_success"));
  }

  function confirmReject() {
    if (!existingVo) return;
    rejectVariationOrder(id, existingVo.id);
    setRejectConfirmOpen(false);
  }

  const reduceWarnLines = lines.filter((l) => {
    const target = targetOf(l);
    return l.type === "modify_qty" && target && l.new_qty != null && l.new_qty < target.cumulative_executed_qty;
  });

  if (!isNew && !existingVo) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("vo.title")} />
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={existingVo ? existingVo.number : t("vo.new_vo")}
        actions={existingVo ? <StatusPill variant={STATUS_PILL[existingVo.status]} label={t(`vo.status_${existingVo.status}`)} /> : undefined}
        alert={existingVo?.status === "approved" ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground text-sm rounded border border-border">
            <Lock className="h-4 w-4 shrink-0" />
            <span>{t("vo.non_deletable_note")}</span>
          </div>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <PageSection>
            <FormGrid cols={3}>
              <FormField label={t("vo.reason")} htmlFor="vo-reason" required error={attempted && !reasonAr.trim() ? t("vo.reason_required") : undefined} className="sm:col-span-2">
                <Input id="vo-reason" disabled={!isDraftEditable} value={reasonAr} onChange={(e) => setReasonAr(e.target.value)} />
              </FormField>
              <FormField label={t("vo.date")} htmlFor="vo-date">
                <DatePicker value={date} onChange={setDate} disabled={!isDraftEditable} />
              </FormField>
            </FormGrid>
            <FormField label={t("vo.ext_ref")} htmlFor="vo-ext" className="mt-4">
              <Input id="vo-ext" disabled={!isDraftEditable} value={extRef} onChange={(e) => setExtRef(e.target.value)} placeholder={t("vo.ext_ref_placeholder")} />
            </FormField>
          </PageSection>

          <PageSection
            title={t("vo.lines_title")}
            actions={isDraftEditable ? (
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-4 w-4 me-1.5" />{t("vo.add_line")}
              </Button>
            ) : undefined}
          >
            <div className="space-y-3">
              {lines.length === 0 && <p className="text-sm text-muted-foreground">{t("vo.no_lines")}</p>}
              {lines.map((line, index) => {
                const target = targetOf(line);
                const overExecuted = line.type === "modify_qty" && target && line.new_qty != null && line.new_qty < target.cumulative_executed_qty;
                return (
                  <div key={index} className="rounded border border-border p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select value={line.type} onValueChange={(v) => updateLine(index, { type: v as VoLineType, target_boq_item: undefined, new_item: undefined, new_qty: undefined, new_price: undefined })} disabled={!isDraftEditable}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add_item">{t("vo.type_add")}</SelectItem>
                            <SelectItem value="modify_qty">{t("vo.type_qty")}</SelectItem>
                            <SelectItem value="modify_price">{t("vo.type_price")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {isDraftEditable && lines.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-danger hover:text-danger" onClick={() => removeLine(index)} aria-label={t("vo.remove_line")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {line.type === "add_item" && (
                      <div className="space-y-2">
                        <FormGrid cols={2}>
                          <FormField label={t("boq.select_phase")} htmlFor={`vo-phase-${index}`}>
                            <Select
                              value={line.new_item?.phase_ref ?? ""}
                              onValueChange={(v) => updateLine(index, { new_item: { phase_ref: v, code: "", section_header_ar: "", description_ar: "", unit_ar: "", estimated_qty: 0, unit_price: 0, estimated_unit_cost: 0 } })}
                              disabled={!isDraftEditable}
                            >
                              <SelectTrigger id={`vo-phase-${index}`}><SelectValue placeholder={t("boq.select_phase")} /></SelectTrigger>
                              <SelectContent>
                                {phases.map((p) => <SelectItem key={p.id} value={p.id}>{lang === "ar" ? p.name_ar : p.name_en}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormField>
                          <div className="flex items-end">
                            <Button
                              variant="outline" size="sm" disabled={!isDraftEditable || !line.new_item?.phase_ref}
                              onClick={() => setConfiguringLine(index)}
                            >
                              {t("vo.configure_item_cta")}
                            </Button>
                          </div>
                        </FormGrid>
                        {line.new_item?.description_ar && (
                          <p className="text-xs text-muted-foreground">{lineNarrative(line)}</p>
                        )}
                      </div>
                    )}

                    {(line.type === "modify_qty" || line.type === "modify_price") && (
                      <div className="space-y-2">
                        <FormGrid cols={2}>
                          <FormField label={t("vo.target_item")} htmlFor={`vo-target-${index}`}>
                            <Select value={line.target_boq_item ?? ""} onValueChange={(v) => updateLine(index, { target_boq_item: v })} disabled={!isDraftEditable}>
                              <SelectTrigger id={`vo-target-${index}`}><SelectValue placeholder={t("vo.target_item_placeholder")} /></SelectTrigger>
                              <SelectContent>
                                {Object.values(boqItemsAll).map((it) => (
                                  <SelectItem key={it.id} value={it.id}>{it.code} — {it.description_ar}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>
                          {line.type === "modify_qty" ? (
                            <FormField label={t("vo.new_qty")} htmlFor={`vo-qty-${index}`} error={overExecuted ? t("vo.reduce_warn") : undefined}>
                              <Input id={`vo-qty-${index}`} type="number" disabled={!isDraftEditable} value={line.new_qty ?? ""} onChange={(e) => updateLine(index, { new_qty: Number(e.target.value) || 0 })} className="tabular-nums" />
                            </FormField>
                          ) : (
                            <FormField label={t("vo.new_price")} htmlFor={`vo-price-${index}`}>
                              <Input id={`vo-price-${index}`} type="number" disabled={!isDraftEditable} value={line.new_price ?? ""} onChange={(e) => updateLine(index, { new_price: Number(e.target.value) || 0 })} className="tabular-nums" />
                            </FormField>
                          )}
                        </FormGrid>
                        {target && <p className="text-xs text-muted-foreground">{lineNarrative(line)}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </PageSection>

          {reduceWarnLines.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-warning-text px-1">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("vo.reduce_warn")}</span>
            </div>
          )}

          {isDraftEditable && (canCreate) && (
            <FormActions
              start={<Button variant="outline" onClick={handleSaveDraft}>{t("vo.save_draft")}</Button>}
              onSave={handleSubmit}
              saveLabel={t("vo.submit")}
            />
          )}

          {existingVo?.status === "submitted" && canApprove && (
            <div className="flex items-center gap-2">
              <Button onClick={() => setApproveConfirmOpen(true)} disabled={isOffline} title={isOffline ? t("vo.offline_approval_note") : undefined}>
                {t("vo.approve")}
              </Button>
              <Button variant="outline" className="text-danger hover:text-danger" onClick={() => setRejectConfirmOpen(true)}>
                {t("vo.reject")}
              </Button>
              {isOffline && <span className="text-xs text-muted-foreground">{t("vo.offline_approval_note")}</span>}
            </div>
          )}
        </div>

        {/* Live impact */}
        <div>
          <PageSection title={t("vo.impact_title")}>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("vo.value_before")}</span><span className="tabular-nums">{formatMoney(existingVo?.status === "approved" ? existingVo.contract_value_before : contractValueNow, lang)}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("vo.value_impact")}</span><span className={cn("tabular-nums font-medium", impact.valueImpact >= 0 ? "text-success-text" : "text-danger-text")}>{impact.valueImpact >= 0 ? "+" : ""}{formatMoney(existingVo?.status === "approved" ? existingVo.contract_value_impact : impact.valueImpact, lang)}</span></div>
              <div className="flex items-center justify-between border-t border-border pt-2"><span className="font-medium">{t("vo.value_after")}</span><span className="tabular-nums font-bold text-brand-text">{formatMoney(existingVo?.status === "approved" ? existingVo.contract_value_after : contractValueNow + impact.valueImpact, lang)}</span></div>
              <div className="flex items-center justify-between border-t border-border pt-2"><span className="text-muted-foreground">{t("vo.margin_impact")}</span><span className={cn("tabular-nums", impact.marginImpact >= 0 ? "text-success-text" : "text-danger-text")}>{impact.marginImpact >= 0 ? "+" : ""}{formatMoney(impact.marginImpact, lang)}</span></div>
            </div>
          </PageSection>

          {existingVo && existingVo.status !== "draft" && (
            <PageSection title={t("vo.applied_lines_title")} className="mt-4">
              <div className="space-y-2 text-sm">
                {existingVo.lines.map((line, i) => {
                  const t2 = targetOf(line);
                  return (
                    <div key={i} className="text-xs text-muted-foreground">
                      {t2 ? `${t("vo.resulting_item")}: ${t2.code} — ${t2.description_ar}` : line.detail_ar}
                    </div>
                  );
                })}
                {formatDate(existingVo.date)}
              </div>
            </PageSection>
          )}
        </div>
      </div>

      <BoqItemFormDialog
        open={configuringLine !== null}
        onOpenChange={(open) => !open && setConfiguringLine(null)}
        phaseRef={configuringLine != null ? (lines[configuringLine]?.new_item?.phase_ref ?? "") : ""}
        item={null}
        onSave={(input: BoqItemFormInput) => {
          if (configuringLine != null) updateLine(configuringLine, { new_item: input });
          setConfiguringLine(null);
        }}
      />

      <ConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        title={t("vo.approve_confirm_title")}
        description={t("vo.approve_confirm_body")}
        confirmTone="primary"
        confirmLabel={t("vo.approve")}
        onConfirm={confirmApprove}
      />
      <ConfirmDialog
        open={rejectConfirmOpen}
        onOpenChange={setRejectConfirmOpen}
        title={t("vo.reject_confirm_title")}
        description={t("vo.reject_confirm_body")}
        confirmTone="danger"
        confirmLabel={t("vo.reject")}
        onConfirm={confirmReject}
      />
    </div>
  );
}
