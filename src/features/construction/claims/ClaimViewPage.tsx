import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Lock, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { FormField, FormGrid, FormActions } from "@/components/patterns/FormLayout";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useConstructionStore } from "@/stores/constructionStore";
import { useMockState } from "@/features/projects/useMockState";
import { computeClaimLine, computeClaimSummary, round2 } from "@/features/construction/calc";
import type { BoqItem, ClaimDeduction, ClaimLine, ClaimStatus } from "@/features/construction/types";
import type { ClaimDraftInput } from "@/stores/constructionStore";

const STATUS_PILL: Record<ClaimStatus, PillVariant> = {
  draft: "inactive",
  submitted: "pending",
  approved: "approved",
  invoiced: "in-progress",
  collected: "paid",
};

function groupLinesBySection(lines: ClaimLine[], boqItemsAll: Record<string, BoqItem>): { label: string | null; lines: ClaimLine[] }[] {
  const groups: { label: string | null; lines: ClaimLine[] }[] = [];
  for (const line of lines) {
    const label = boqItemsAll[line.boq_item_ref]?.section_header_ar ?? null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.lines.push(line);
    else groups.push({ label, lines: [line] });
  }
  return groups;
}

export function ClaimViewPage() {
  const { id = "", claim: claimId = "" } = useParams<{ id: string; claim: string }>();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const existingClaim = useConstructionStore((s) => s.progress_claims[claimId]);
  const progressClaims = useConstructionStore((s) => s.progress_claims);
  const boqItemsAll = useConstructionStore((s) => s.boq_items);
  const terms = useConstructionStore((s) => s.contract_terms);
  const retention = useConstructionStore((s) => s.retention);
  const advance = useConstructionStore((s) => s.advance);
  const updateProgressClaimDraft = useConstructionStore((s) => s.updateProgressClaimDraft);
  const submitProgressClaim = useConstructionStore((s) => s.submitProgressClaim);
  const approveProgressClaim = useConstructionStore((s) => s.approveProgressClaim);
  const collectProgressClaim = useConstructionStore((s) => s.collectProgressClaim);
  const resendClaimEta = useConstructionStore((s) => s.resendClaimEta);
  const { isOffline } = useMockState();

  const canCreate = can("construction.claim.create");
  const canApprove = can("construction.claim.approve");

  const [periodAr, setPeriodAr] = useState("");
  const [date, setDate] = useState("");
  const [lines, setLines] = useState<ClaimLine[]>([]);
  const [deductions, setDeductions] = useState<ClaimDeduction[]>([]);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [collectConfirmOpen, setCollectConfirmOpen] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (existingClaim) {
      setPeriodAr(existingClaim.period_ar);
      setDate(existingClaim.date);
      setLines(existingClaim.lines);
      setDeductions(existingClaim.deductions);
    }
  }, [existingClaim]);

  const editable = existingClaim?.status === "draft";

  function updateLineQty(boqItemRef: string, newQty: number) {
    setLines((prev) => prev.map((l) => {
      if (l.boq_item_ref !== boqItemRef) return l;
      const item = boqItemsAll[boqItemRef];
      const lineCalc = computeClaimLine({ contractQty: item?.estimated_qty ?? 0, unitPrice: item?.unit_price ?? 0, prevValue: l.prev_value, cumulativeQty: newQty });
      return { ...l, cumulative_qty: newQty, ...lineCalc };
    }));
  }

  const lineIssues = useMemo(() => {
    const map = new Map<string, { backward: boolean; overage: boolean }>();
    for (const l of lines) {
      const item = boqItemsAll[l.boq_item_ref];
      map.set(l.boq_item_ref, {
        backward: l.cumulative_qty < l.prev_qty,
        overage: item ? l.cumulative_qty > item.estimated_qty : false,
      });
    }
    return map;
  }, [lines, boqItemsAll]);
  const hasBlockingIssue = Array.from(lineIssues.values()).some((i) => i.backward || i.overage);

  function addDeduction() {
    setDeductions((prev) => [...prev, { memo_ar: "", amount: 0 }]);
  }
  function updateDeduction(index: number, patch: Partial<ClaimDeduction>) {
    setDeductions((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }
  function removeDeduction(index: number) {
    setDeductions((prev) => prev.filter((_, i) => i !== index));
  }

  const summary = useMemo(() => {
    if (!editable) {
      return {
        grossCurrent: existingClaim?.gross_current ?? 0,
        retentionThis: existingClaim?.retention_this ?? 0,
        advanceRecoveryThis: existingClaim?.advance_recovery_this ?? 0,
        netBeforeVat: existingClaim?.net_before_vat ?? 0,
        vat: existingClaim?.vat ?? 0,
        netPayable: existingClaim?.net_payable ?? 0,
        deductionsTotal: round2((existingClaim?.deductions ?? []).reduce((s, d) => s + d.amount, 0)),
      };
    }
    const grossCurrent = round2(lines.reduce((s, l) => s + l.current_value, 0));
    const deductionsTotal = round2(deductions.reduce((s, d) => s + (d.amount || 0), 0));
    return computeClaimSummary({
      grossCurrent,
      retentionRate: terms.retention_rate,
      retentionCap: terms.retention_cap,
      retentionAccumulatedSoFar: retention.accumulated_retained,
      advanceAmount: terms.advance_amount,
      advanceRecoveryPct: terms.advance_recovery_pct,
      advanceRecoveredSoFar: advance.recovered_to_date,
      vatRate: terms.vat_rate,
      deductionsTotal,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, lines, deductions, terms, retention, advance, existingClaim]);

  function buildInput(): ClaimDraftInput {
    return { period_ar: periodAr.trim(), date, lines, deductions: deductions.filter((d) => d.memo_ar.trim() || d.amount) };
  }

  function handleSaveDraft() {
    if (!existingClaim) return;
    updateProgressClaimDraft(id, existingClaim.id, buildInput());
    toast.success(t("claim.save_success"));
  }

  function handleSubmit() {
    if (!existingClaim || hasBlockingIssue) return;
    updateProgressClaimDraft(id, existingClaim.id, buildInput());
    const result = submitProgressClaim(id, existingClaim.id);
    if (result.ok) toast.success(t("claim.submit_success"));
  }

  function confirmApprove() {
    if (!existingClaim) return;
    const result = approveProgressClaim(id, existingClaim.id);
    setApproveConfirmOpen(false);
    if (result.ok) toast.success(t("claim.approve_success"));
  }

  function confirmCollect() {
    if (!existingClaim) return;
    const result = collectProgressClaim(id, existingClaim.id);
    setCollectConfirmOpen(false);
    if (result.ok) toast.success(t("claim.collect_success"));
  }

  async function handleResendEta() {
    if (!existingClaim) return;
    setResending(true);
    await new Promise<void>((r) => setTimeout(r, 900));
    resendClaimEta(id, existingClaim.id);
    setResending(false);
    toast.success(t("claim.eta_resend_success"));
  }

  function handlePrint() {
    toast.info(t("claim.print_toast"));
  }

  if (!existingClaim) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("claim.title")} />
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }

  const prevClaim = existingClaim.previous_claim_ref ? progressClaims[existingClaim.previous_claim_ref] : null;
  const etaRejected = existingClaim.status === "approved" && existingClaim.eta_status === "rejected";

  return (
    <div className="space-y-4">
      <PageHeader
        title={existingClaim.number}
        actions={
          <div className="flex items-center gap-2">
            {existingClaim.status !== "draft" && existingClaim.eta_status && (
              <StatusPill
                variant={existingClaim.eta_status === "accepted" ? "approved" : existingClaim.eta_status === "rejected" ? "rejected" : "pending"}
                label={t(`claim.eta_${existingClaim.eta_status}`)}
              />
            )}
            <StatusPill variant={STATUS_PILL[existingClaim.status]} label={t(`claim.status_${existingClaim.status}`)} />
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 me-1.5" />{t("claim.print")}
            </Button>
          </div>
        }
        alert={etaRejected ? (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-danger-tint text-danger-text text-sm font-medium rounded border border-danger/20">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t("claim.eta_rejected")}
            </span>
            <button type="button" className="underline underline-offset-2 shrink-0 flex items-center gap-1 disabled:opacity-50" onClick={handleResendEta} disabled={resending}>
              <RefreshCw className={cn("h-3.5 w-3.5", resending && "animate-spin")} />
              {t("claim.eta_resend")}
            </button>
          </div>
        ) : undefined}
      />

      {isOffline && <OfflineBanner />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <PageSection>
            <FormGrid cols={3}>
              <FormField label={t("claim.period")} htmlFor="claim-period">
                <Input id="claim-period" disabled={!editable} value={periodAr} onChange={(e) => setPeriodAr(e.target.value)} placeholder={t("claim.period_placeholder")} />
              </FormField>
              <FormField label={t("claim.date")} htmlFor="claim-date">
                <DatePicker value={date} onChange={setDate} disabled={!editable} />
              </FormField>
              <FormField label={t("claim.previous_claim")} htmlFor="claim-prev">
                <Input id="claim-prev" disabled value={prevClaim ? prevClaim.number : t("claim.previous_claim_none")} />
              </FormField>
            </FormGrid>
          </PageSection>

          <PageSection title={t("claim.title")}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">{t("boq.code")}</TableHead>
                    <TableHead className="text-xs">{t("claim.col_item")}</TableHead>
                    <TableHead className="text-xs">{t("claim.col_unit")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.col_contract_qty")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.col_unit_price")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.prev_qty")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.cum_qty")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.cum_pct")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.current_value")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupLinesBySection(lines, boqItemsAll).map((group, gi) => (
                    <Fragment key={gi}>
                      {group.label && (
                        <TableRow key={`sec-${gi}`} className="hover:bg-transparent bg-muted/20">
                          <TableCell colSpan={9} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</TableCell>
                        </TableRow>
                      )}
                      {group.lines.map((line) => {
                        const item = boqItemsAll[line.boq_item_ref];
                        const issue = lineIssues.get(line.boq_item_ref);
                        const hasIssue = issue?.backward || issue?.overage;
                        return (
                          <TableRow key={line.boq_item_ref} className="border-b border-border last:border-0">
                            <TableCell className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{item?.code}</TableCell>
                            <TableCell className="px-3 py-2 text-sm">{item?.description_ar}</TableCell>
                            <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{item?.unit_ar}</TableCell>
                            <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{item?.estimated_qty}</TableCell>
                            <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{formatMoney(item?.unit_price ?? 0, lang)}</TableCell>
                            <TableCell className="px-3 py-2 text-sm tabular-nums text-end text-muted-foreground">{line.prev_qty}</TableCell>
                            <TableCell className="px-2 py-2 text-end">
                              {editable ? (
                                <Input
                                  type="number"
                                  className={cn("tabular-nums text-end w-24 ms-auto h-8", hasIssue && "border-danger text-danger-text")}
                                  value={line.cumulative_qty}
                                  onChange={(e) => updateLineQty(line.boq_item_ref, Number(e.target.value) || 0)}
                                />
                              ) : (
                                <span className="text-sm tabular-nums">{line.cumulative_qty}</span>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{line.cumulative_pct}%</TableCell>
                            <TableCell className={cn("px-3 py-2 text-sm font-medium tabular-nums text-end", line.current_value < 0 ? "text-danger-text" : "")}>
                              {formatMoney(line.current_value, lang)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            {Array.from(lineIssues.values()).some((i) => i.backward) && (
              <div className="flex items-start gap-2 text-sm text-danger-text mt-3 px-1">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t("claim.no_backward")}</span>
              </div>
            )}
            {Array.from(lineIssues.values()).some((i) => i.overage) && (
              <div className="flex items-start gap-2 text-sm text-danger-text mt-2 px-1">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t("claim.overage_blocked")}</span>
              </div>
            )}
          </PageSection>

          {editable && (canCreate) && (
            <FormActions
              start={<Button variant="outline" onClick={handleSaveDraft}>{t("claim.save_draft")}</Button>}
              onSave={handleSubmit}
              saveLabel={t("claim.submit")}
              disabled={hasBlockingIssue}
            />
          )}

          {existingClaim.status === "submitted" && canApprove && (
            <div className="flex items-center gap-2">
              <Button onClick={() => setApproveConfirmOpen(true)} disabled={isOffline} title={isOffline ? t("claim.offline_note") : undefined}>
                {t("claim.approve")}
              </Button>
              {isOffline && <span className="text-xs text-muted-foreground">{t("claim.offline_note")}</span>}
            </div>
          )}

          {existingClaim.status === "approved" && canApprove && (
            <Button onClick={() => setCollectConfirmOpen(true)}>{t("claim.collect")}</Button>
          )}
        </div>

        <div className="space-y-4">
          <PageSection title={t("claim.summary_title")}>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("claim.gross")}</span><span className="tabular-nums font-medium">{formatMoney(summary.grossCurrent, lang)}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">− {t("claim.retention")}</span><span className="tabular-nums text-warning-text">− {formatMoney(summary.retentionThis, lang)}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">− {t("claim.advance_recovery")}</span><span className="tabular-nums text-warning-text">− {formatMoney(summary.advanceRecoveryThis, lang)}</span></div>
              {summary.deductionsTotal > 0 && (
                <div className="flex items-center justify-between"><span className="text-muted-foreground">− {t("claim.deductions_title")}</span><span className="tabular-nums text-warning-text">− {formatMoney(summary.deductionsTotal, lang)}</span></div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-2"><span className="font-medium">{t("claim.net_before_vat")}</span><span className="tabular-nums font-medium">{formatMoney(summary.netBeforeVat, lang)}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("claim.vat")}</span><span className="tabular-nums text-success-text">+ {formatMoney(summary.vat, lang)}</span></div>
              <div className="flex items-center justify-between border-t border-border pt-2"><span className="font-semibold">{t("claim.net_payable")}</span><span className="tabular-nums font-bold text-brand-text">{formatMoney(summary.netPayable, lang)}</span></div>
            </div>
            {retention.at_cap && (
              <p className="text-xs text-warning-text mt-3">{t("claim.retention_at_cap_note")}</p>
            )}
            {advance.outstanding <= 0 && advance.amount > 0 && (
              <p className="text-xs text-warning-text mt-1">{t("claim.advance_fully_recovered_note")}</p>
            )}
          </PageSection>

          <PageSection
            title={t("claim.deductions_title")}
            actions={editable ? (
              <Button size="sm" variant="outline" onClick={addDeduction}>
                <Plus className="h-4 w-4 me-1.5" />{t("claim.add_deduction")}
              </Button>
            ) : undefined}
          >
            {deductions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("claim.no_deductions")}</p>
            ) : (
              <div className="space-y-2">
                {deductions.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="flex-1" placeholder={t("claim.deduction_memo")} disabled={!editable}
                      value={d.memo_ar} onChange={(e) => updateDeduction(i, { memo_ar: e.target.value })}
                    />
                    <Input
                      type="number" className="w-28 tabular-nums" placeholder={t("claim.deduction_amount")} disabled={!editable}
                      value={d.amount || ""} onChange={(e) => updateDeduction(i, { amount: Number(e.target.value) || 0 })}
                    />
                    {editable && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-danger hover:text-danger" onClick={() => removeDeduction(i)} aria-label={t("claim.remove_deduction")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </PageSection>

          {existingClaim.status !== "draft" && existingClaim.tax_invoice_ref && (
            <PageSection title={t("claim.status_approved")}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0" />
                <span>{existingClaim.tax_invoice_ref}</span>
              </div>
            </PageSection>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        title={t("claim.approve_confirm_title")}
        description={t("claim.approve_confirm_body")}
        confirmTone="primary"
        confirmLabel={t("claim.approve")}
        onConfirm={confirmApprove}
      />
      <ConfirmDialog
        open={collectConfirmOpen}
        onOpenChange={setCollectConfirmOpen}
        title={t("claim.collect_confirm_title")}
        description={t("claim.collect_confirm_body")}
        confirmTone="primary"
        confirmLabel={t("claim.collect")}
        onConfirm={confirmCollect}
      />
    </div>
  );
}
