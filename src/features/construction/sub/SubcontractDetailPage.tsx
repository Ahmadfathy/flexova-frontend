import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ClipboardCopy, Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { StatCard } from "@/components/patterns/StatCard";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField, FormGrid, FormActions } from "@/components/patterns/FormLayout";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useConstructionStore } from "@/stores/constructionStore";
import { useMockState } from "@/features/projects/useMockState";
import { computeClaimLine, computeClaimSummary, round2 } from "@/features/construction/calc";
import type { ClaimDeduction, ClaimStatus, ReleaseStage, SubBoqItem, SubClaimLine } from "@/features/construction/types";
import type { SubBoqItemFormInput, SubTermsFormInput } from "@/stores/constructionStore";

const CLAIM_STATUS_PILL: Record<ClaimStatus, PillVariant> = {
  draft: "inactive",
  submitted: "pending",
  approved: "approved",
  invoiced: "in-progress",
  collected: "paid",
};

export function SubcontractDetailPage() {
  const { id = "", sc: scId = "" } = useParams<{ id: string; sc: string }>();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const sc = useConstructionStore((s) => s.subcontracts[scId]);
  const boqItemsAll = useConstructionStore((s) => s.boq_items);
  const vatRate = useConstructionStore((s) => s.contract_terms.vat_rate);
  const addSubBoqItem = useConstructionStore((s) => s.addSubBoqItem);
  const updateSubBoqItem = useConstructionStore((s) => s.updateSubBoqItem);
  const copySubBoqFromMain = useConstructionStore((s) => s.copySubBoqFromMain);
  const updateSubTerms = useConstructionStore((s) => s.updateSubTerms);
  const createSubClaim = useConstructionStore((s) => s.createSubClaim);
  const updateSubClaimDraft = useConstructionStore((s) => s.updateSubClaimDraft);
  const submitSubClaim = useConstructionStore((s) => s.submitSubClaim);
  const approveSubClaim = useConstructionStore((s) => s.approveSubClaim);
  const createSubRetentionRelease = useConstructionStore((s) => s.createSubRetentionRelease);
  const { isOffline } = useMockState();

  const canManage = can("construction.subcontract.manage");

  // ── Sub-BOQ item modal ─────────────────────────────────────────────────
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubBoqItem | null>(null);
  const [itemDesc, setItemDesc] = useState("");
  const [itemUnit, setItemUnit] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [itemPrice, setItemPrice] = useState("");

  function openItemModal(item: SubBoqItem | null) {
    setEditingItem(item);
    setItemDesc(item?.description_ar ?? "");
    setItemUnit(item?.unit_ar ?? "");
    setItemQty(item ? String(item.estimated_qty) : "");
    setItemPrice(item ? String(item.unit_price) : "");
    setItemModalOpen(true);
  }

  function handleSaveItem() {
    if (!itemDesc.trim() || !itemUnit.trim()) return;
    const input: SubBoqItemFormInput = { description_ar: itemDesc.trim(), unit_ar: itemUnit.trim(), estimated_qty: Number(itemQty) || 0, unit_price: Number(itemPrice) || 0 };
    if (editingItem) updateSubBoqItem(id, scId, editingItem.id, input);
    else addSubBoqItem(id, scId, input);
    setItemModalOpen(false);
  }

  // ── Copy-from-main modal ────────────────────────────────────────────────
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [selectedMainIds, setSelectedMainIds] = useState<Set<string>>(new Set());

  function toggleMainId(id2: string) {
    setSelectedMainIds((prev) => {
      const next = new Set(prev);
      if (next.has(id2)) next.delete(id2); else next.add(id2);
      return next;
    });
  }

  function handleCopy() {
    const result = copySubBoqFromMain(id, scId, Array.from(selectedMainIds));
    if (result.ok) {
      toast.success(t("sub.copy_from_main_success", { n: result.count }));
      setSelectedMainIds(new Set());
      setCopyModalOpen(false);
    }
  }

  // ── Sub terms ────────────────────────────────────────────────────────────
  const [retentionRatePct, setRetentionRatePct] = useState("");
  const [hasCap, setHasCap] = useState(false);
  const [retentionCapAmt, setRetentionCapAmt] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [recoveryPct, setRecoveryPct] = useState("");

  useEffect(() => {
    if (!sc) return;
    setRetentionRatePct(String(sc.sub_terms.retention_rate * 100));
    setHasCap(sc.sub_terms.retention_cap != null);
    setRetentionCapAmt(sc.sub_terms.retention_cap != null ? String(sc.sub_terms.retention_cap) : "");
    setAdvanceAmount(String(sc.sub_terms.advance_amount));
    setRecoveryPct(String(sc.sub_terms.advance_recovery_pct * 100));
  }, [sc]);

  function handleSaveTerms() {
    const input: SubTermsFormInput = {
      retention_rate: (Number(retentionRatePct) || 0) / 100,
      retention_cap: hasCap ? (Number(retentionCapAmt) || 0) : null,
      advance_amount: Number(advanceAmount) || 0,
      advance_recovery_pct: (Number(recoveryPct) || 0) / 100,
    };
    const result = updateSubTerms(id, scId, input);
    if (result.ok) toast.success(t("common:save"));
  }

  // ── Sub-claim (current open draft/submitted, inline) ───────────────────
  const openClaim = useMemo(() => sc?.sub_claims.find((c) => c.status === "draft" || c.status === "submitted") ?? null, [sc]);
  const [claimDate, setClaimDate] = useState("");
  const [claimLines, setClaimLines] = useState<SubClaimLine[]>([]);
  const [claimDeductions, setClaimDeductions] = useState<ClaimDeduction[]>([]);
  const [approveClaimConfirmOpen, setApproveClaimConfirmOpen] = useState(false);

  useEffect(() => {
    if (openClaim) {
      setClaimDate(openClaim.date);
      setClaimLines(openClaim.lines);
      setClaimDeductions(openClaim.deductions);
    }
  }, [openClaim]);

  const claimEditable = openClaim?.status === "draft";

  function updateClaimLineQty(subBoqRef: string, newQty: number) {
    setClaimLines((prev) => prev.map((l) => {
      if (l.sub_boq_ref !== subBoqRef) return l;
      const item = sc?.sub_boq.find((i) => i.id === subBoqRef);
      const lineCalc = computeClaimLine({ contractQty: item?.estimated_qty ?? 0, unitPrice: item?.unit_price ?? 0, prevValue: l.prev_value, cumulativeQty: newQty });
      return { ...l, cumulative_qty: newQty, ...lineCalc };
    }));
  }

  const claimLineIssues = useMemo(() => {
    const map = new Map<string, { backward: boolean; overage: boolean }>();
    for (const l of claimLines) {
      const item = sc?.sub_boq.find((i) => i.id === l.sub_boq_ref);
      map.set(l.sub_boq_ref, { backward: l.cumulative_qty < l.prev_qty, overage: item ? l.cumulative_qty > item.estimated_qty : false });
    }
    return map;
  }, [claimLines, sc]);
  const claimHasBlockingIssue = Array.from(claimLineIssues.values()).some((i) => i.backward || i.overage);

  function addClaimDeduction() { setClaimDeductions((prev) => [...prev, { memo_ar: "", amount: 0 }]); }
  function updateClaimDeduction(index: number, patch: Partial<ClaimDeduction>) { setClaimDeductions((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d))); }
  function removeClaimDeduction(index: number) { setClaimDeductions((prev) => prev.filter((_, i) => i !== index)); }

  const claimSummary = useMemo(() => {
    if (!sc) return { grossCurrent: 0, retentionThis: 0, advanceRecoveryThis: 0, netBeforeVat: 0, vat: 0, netPayable: 0, deductionsTotal: 0 };
    if (!claimEditable && openClaim) {
      return {
        grossCurrent: openClaim.gross_current, retentionThis: openClaim.retention_this, advanceRecoveryThis: openClaim.advance_recovery_this,
        netBeforeVat: openClaim.net_before_vat, vat: openClaim.vat, netPayable: openClaim.net_payable,
        deductionsTotal: round2(openClaim.deductions.reduce((s, d) => s + d.amount, 0)),
      };
    }
    const grossCurrent = round2(claimLines.reduce((s, l) => s + l.current_value, 0));
    const deductionsTotal = round2(claimDeductions.reduce((s, d) => s + (d.amount || 0), 0));
    return computeClaimSummary({
      grossCurrent,
      retentionRate: sc.sub_terms.retention_rate,
      retentionCap: sc.sub_terms.retention_cap,
      retentionAccumulatedSoFar: sc.sub_retention.accumulated_retained,
      advanceAmount: sc.sub_terms.advance_amount,
      advanceRecoveryPct: sc.sub_terms.advance_recovery_pct,
      advanceRecoveredSoFar: sc.sub_claims.filter((c) => c.status === "approved" || c.status === "invoiced" || c.status === "collected").reduce((s, c) => s + c.advance_recovery_this, 0),
      vatRate,
      deductionsTotal,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sc, claimEditable, openClaim, claimLines, claimDeductions, vatRate]);

  function handleCreateClaim() {
    const result = createSubClaim(id, scId);
    if (!result.ok && result.reason === "no_sub_boq") toast.error(t("sub.no_claims"));
  }

  function handleSaveClaimDraft() {
    if (!openClaim) return;
    updateSubClaimDraft(id, scId, openClaim.id, { date: claimDate, lines: claimLines, deductions: claimDeductions.filter((d) => d.memo_ar.trim() || d.amount) });
    toast.success(t("claim.save_success"));
  }

  function handleSubmitClaim() {
    if (!openClaim || claimHasBlockingIssue) return;
    updateSubClaimDraft(id, scId, openClaim.id, { date: claimDate, lines: claimLines, deductions: claimDeductions.filter((d) => d.memo_ar.trim() || d.amount) });
    const result = submitSubClaim(id, scId, openClaim.id);
    if (result.ok) toast.success(t("claim.submit_success"));
  }

  function confirmApproveClaim() {
    if (!openClaim) return;
    const result = approveSubClaim(id, scId, openClaim.id);
    setApproveClaimConfirmOpen(false);
    if (result.ok) toast.success(t("claim.approve_success"));
  }

  // ── Sub-retention release ───────────────────────────────────────────────
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [releaseStage, setReleaseStage] = useState<ReleaseStage>("other");
  const [releaseDate, setReleaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [releaseReason, setReleaseReason] = useState("");
  const [releaseAttempted, setReleaseAttempted] = useState(false);

  function openReleaseModal() {
    setReleaseAmount(sc ? String(sc.sub_retention.outstanding) : "");
    setReleaseStage("other");
    setReleaseDate(new Date().toISOString().slice(0, 10));
    setReleaseReason("");
    setReleaseAttempted(false);
    setReleaseModalOpen(true);
  }

  const releaseAmountNum = Number(releaseAmount) || 0;
  const releaseOverOutstanding = sc ? releaseAmountNum > sc.sub_retention.outstanding : false;

  function handleSaveRelease() {
    setReleaseAttempted(true);
    if (releaseAmountNum <= 0 || releaseOverOutstanding) return;
    const result = createSubRetentionRelease(id, scId, { amount: releaseAmountNum, stage: releaseStage, date: releaseDate, reason_ar: releaseReason.trim() || undefined });
    if (result.ok) {
      toast.success(t("retention.save_release_success"));
      setReleaseModalOpen(false);
    }
  }

  if (!sc) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("sub.contract")} />
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }

  const linkedMain = boqItemsAll[sc.linked_boq_item];
  const isLoss = !!linkedMain && sc.sub_contract_value > linkedMain.value;

  return (
    <div className="space-y-4">
      <PageHeader
        title={sc.subcontractor_name_ar}
        subtitle={linkedMain ? `${linkedMain.code} — ${linkedMain.description_ar}` : undefined}
        actions={<StatusPill variant={sc.status === "in_progress" ? "active" : "inactive"} label={sc.status} />}
      />

      {linkedMain && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded border",
          isLoss ? "bg-danger-tint text-danger-text border-danger/20" : "bg-success-tint text-success-text border-success/20"
        )}>
          {isLoss ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>
            {isLoss ? t("sub.loss_warn") : t("sub.margin_ok")}
            {" — "}{formatMoney(sc.sub_contract_value, lang)} / {formatMoney(linkedMain.value, lang)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("sub.col_contract_value")} value={formatMoney(sc.sub_contract_value, lang)} />
        <StatCard
          label={t("sub.col_paid")}
          value={formatMoney(sc.sub_claims.filter((c) => c.status === "approved" || c.status === "invoiced" || c.status === "collected").reduce((s, c) => s + c.net_payable, 0), lang)}
          tone="success"
        />
        <StatCard label={t("sub.col_retained")} value={formatMoney(sc.sub_retention.accumulated_retained, lang)} tone="warning" />
        <StatCard label={t("sub.col_outstanding")} value={formatMoney(sc.sub_retention.outstanding, lang)} tone="warning" />
      </div>

      <PageSection
        title={t("sub.boq_title")}
        actions={canManage ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCopyModalOpen(true)}>
              <ClipboardCopy className="h-4 w-4 me-1.5" />{t("sub.copy_from_main")}
            </Button>
            <Button size="sm" onClick={() => openItemModal(null)}>
              <Plus className="h-4 w-4 me-1.5" />{t("boq.add_item")}
            </Button>
          </div>
        ) : undefined}
      >
        {sc.sub_boq.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">{t("claim.col_item")}</TableHead>
                  <TableHead className="text-xs">{t("boq.unit")}</TableHead>
                  <TableHead className="text-xs text-end">{t("boq.qty")}</TableHead>
                  <TableHead className="text-xs text-end">{t("boq.unit_price")}</TableHead>
                  <TableHead className="text-xs text-end">{t("boq.value")}</TableHead>
                  <TableHead className="text-xs w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sc.sub_boq.map((item) => (
                  <TableRow key={item.id} className="border-b border-border last:border-0">
                    <TableCell className="px-3 py-2 text-sm">{item.description_ar}</TableCell>
                    <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{item.unit_ar}</TableCell>
                    <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{item.estimated_qty}</TableCell>
                    <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{formatMoney(item.unit_price, lang)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm font-medium tabular-nums text-end">{formatMoney(item.value, lang)}</TableCell>
                    <TableCell className="px-2 py-2">
                      {canManage && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openItemModal(item)} aria-label={t("boq.edit_item")}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageSection>

      <PageSection title={t("sub.terms_title")}>
        <FormGrid cols={2}>
          <FormField label={t("contract.retention_rate")} htmlFor="sub-ret-rate">
            <Input id="sub-ret-rate" type="number" disabled={!canManage} value={retentionRatePct} onChange={(e) => setRetentionRatePct(e.target.value)} className="tabular-nums" />
          </FormField>
          <FormField label={t("contract.retention_cap_pct")} htmlFor="sub-ret-cap">
            <div className="flex items-center gap-2">
              <Input id="sub-ret-cap" type="number" disabled={!canManage || !hasCap} value={retentionCapAmt} onChange={(e) => setRetentionCapAmt(e.target.value)} className="tabular-nums" />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                <input type="checkbox" checked={!hasCap} disabled={!canManage} onChange={(e) => setHasCap(!e.target.checked)} />
                {t("contract.retention_cap_none")}
              </label>
            </div>
          </FormField>
        </FormGrid>
        <FormGrid cols={2} className="mt-4">
          <FormField label={t("contract.advance_amount")} htmlFor="sub-adv-amount">
            <Input id="sub-adv-amount" type="number" disabled={!canManage} value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} className="tabular-nums" />
          </FormField>
          <FormField label={t("contract.recovery_pct")} htmlFor="sub-rec-pct">
            <Input id="sub-rec-pct" type="number" disabled={!canManage} value={recoveryPct} onChange={(e) => setRecoveryPct(e.target.value)} className="tabular-nums" />
          </FormField>
        </FormGrid>
        {canManage && (
          <FormActions className="mt-4" onSave={handleSaveTerms} saveLabel={t("common:save")} />
        )}
      </PageSection>

      <PageSection
        title={t("sub.claims_title")}
        actions={canManage && !openClaim ? (
          <Button size="sm" onClick={handleCreateClaim} disabled={sc.sub_boq.length === 0}>
            <Plus className="h-4 w-4 me-1.5" />{t("sub.new_claim")}
          </Button>
        ) : undefined}
      >
        {sc.sub_claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("sub.no_claims")}</p>
        ) : (
          <div className="overflow-x-auto mb-4">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">{t("claims.col_number")}</TableHead>
                  <TableHead className="text-xs">{t("claims.col_period")}</TableHead>
                  <TableHead className="text-xs text-end">{t("claims.col_net_payable")}</TableHead>
                  <TableHead className="text-xs">{t("sub.voucher")}</TableHead>
                  <TableHead className="text-xs">{t("claims.col_status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...sc.sub_claims].sort((a, b) => b.number.localeCompare(a.number)).map((c) => (
                  <TableRow key={c.id} className="border-b border-border last:border-0">
                    <TableCell className="px-3 py-2 text-sm font-medium">{c.number}</TableCell>
                    <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{formatDate(c.date)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{c.status === "draft" ? "—" : formatMoney(c.net_payable, lang)}</TableCell>
                    <TableCell className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{c.payment_voucher_ref ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2"><StatusPill variant={CLAIM_STATUS_PILL[c.status]} label={t(`claim.status_${c.status}`)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {openClaim && (
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{openClaim.number}</p>
              <StatusPill variant={CLAIM_STATUS_PILL[openClaim.status]} label={t(`claim.status_${openClaim.status}`)} />
            </div>

            <FormField label={t("claim.date")} htmlFor="sub-claim-date" className="max-w-xs">
              <DatePicker value={claimDate} onChange={setClaimDate} disabled={!claimEditable} />
            </FormField>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">{t("claim.col_item")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.col_contract_qty")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.col_unit_price")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.prev_qty")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.cum_qty")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.cum_pct")}</TableHead>
                    <TableHead className="text-xs text-end">{t("claim.current_value")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claimLines.map((line) => {
                    const item = sc.sub_boq.find((i) => i.id === line.sub_boq_ref);
                    const issue = claimLineIssues.get(line.sub_boq_ref);
                    const hasIssue = issue?.backward || issue?.overage;
                    return (
                      <TableRow key={line.sub_boq_ref} className="border-b border-border last:border-0">
                        <TableCell className="px-3 py-2 text-sm">{item?.description_ar}</TableCell>
                        <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{item?.estimated_qty}</TableCell>
                        <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{formatMoney(item?.unit_price ?? 0, lang)}</TableCell>
                        <TableCell className="px-3 py-2 text-sm tabular-nums text-end text-muted-foreground">{line.prev_qty}</TableCell>
                        <TableCell className="px-2 py-2 text-end">
                          {claimEditable ? (
                            <Input
                              type="number"
                              className={cn("tabular-nums text-end w-24 ms-auto h-8", hasIssue && "border-danger text-danger-text")}
                              value={line.cumulative_qty}
                              onChange={(e) => updateClaimLineQty(line.sub_boq_ref, Number(e.target.value) || 0)}
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
                </TableBody>
              </Table>
            </div>
            {Array.from(claimLineIssues.values()).some((i) => i.backward) && (
              <div className="flex items-start gap-2 text-sm text-danger-text px-1">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t("claim.no_backward")}</span>
              </div>
            )}
            {Array.from(claimLineIssues.values()).some((i) => i.overage) && (
              <div className="flex items-start gap-2 text-sm text-danger-text px-1">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t("claim.overage_blocked")}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t("claim.deductions_title")}</p>
                  {claimEditable && (
                    <Button size="sm" variant="outline" onClick={addClaimDeduction}>
                      <Plus className="h-4 w-4 me-1.5" />{t("claim.add_deduction")}
                    </Button>
                  )}
                </div>
                {claimDeductions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("claim.no_deductions")}</p>
                ) : (
                  <div className="space-y-2">
                    {claimDeductions.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input className="flex-1" placeholder={t("claim.deduction_memo")} disabled={!claimEditable} value={d.memo_ar} onChange={(e) => updateClaimDeduction(i, { memo_ar: e.target.value })} />
                        <Input type="number" className="w-28 tabular-nums" placeholder={t("claim.deduction_amount")} disabled={!claimEditable} value={d.amount || ""} onChange={(e) => updateClaimDeduction(i, { amount: Number(e.target.value) || 0 })} />
                        {claimEditable && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-danger hover:text-danger" onClick={() => removeClaimDeduction(i)} aria-label={t("claim.remove_deduction")}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("claim.gross")}</span><span className="tabular-nums font-medium">{formatMoney(claimSummary.grossCurrent, lang)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">− {t("claim.retention")}</span><span className="tabular-nums text-warning-text">− {formatMoney(claimSummary.retentionThis, lang)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">− {t("claim.advance_recovery")}</span><span className="tabular-nums text-warning-text">− {formatMoney(claimSummary.advanceRecoveryThis, lang)}</span></div>
                {claimSummary.deductionsTotal > 0 && (
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">− {t("claim.deductions_title")}</span><span className="tabular-nums text-warning-text">− {formatMoney(claimSummary.deductionsTotal, lang)}</span></div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-2"><span className="font-medium">{t("claim.net_before_vat")}</span><span className="tabular-nums font-medium">{formatMoney(claimSummary.netBeforeVat, lang)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("claim.vat")}</span><span className="tabular-nums text-success-text">+ {formatMoney(claimSummary.vat, lang)}</span></div>
                <div className="flex items-center justify-between border-t border-border pt-2"><span className="font-semibold">{t("claim.net_payable")}</span><span className="tabular-nums font-bold text-brand-text">{formatMoney(claimSummary.netPayable, lang)}</span></div>
                <p className="text-xs text-muted-foreground pt-1">{t("sub.eta_input_vat_note")}</p>
              </div>
            </div>

            {claimEditable && (
              <FormActions
                start={<Button variant="outline" onClick={handleSaveClaimDraft}>{t("claim.save_draft")}</Button>}
                onSave={handleSubmitClaim}
                saveLabel={t("claim.submit")}
                disabled={claimHasBlockingIssue}
              />
            )}
            {openClaim.status === "submitted" && canManage && (
              <Button onClick={() => setApproveClaimConfirmOpen(true)} disabled={isOffline} title={isOffline ? t("claim.offline_note") : undefined}>
                {t("claim.approve")}
              </Button>
            )}
          </div>
        )}
      </PageSection>

      <PageSection
        title={t("sub.retention_title")}
        actions={canManage ? (
          <Button size="sm" onClick={openReleaseModal} disabled={sc.sub_retention.outstanding <= 0 || isOffline}>
            <Plus className="h-4 w-4 me-1.5" />{t("retention.release_new")}
          </Button>
        ) : undefined}
      >
        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
          <div><p className="text-muted-foreground">{t("retention.accumulated")}</p><p className="font-semibold tabular-nums">{formatMoney(sc.sub_retention.accumulated_retained, lang)}</p></div>
          <div><p className="text-muted-foreground">{t("retention.released")}</p><p className="font-semibold tabular-nums">{formatMoney(sc.sub_retention.released, lang)}</p></div>
          <div><p className="text-muted-foreground">{t("retention.outstanding")}</p><p className="font-semibold tabular-nums">{formatMoney(sc.sub_retention.outstanding, lang)}</p></div>
        </div>
        {(sc.sub_retention.release_events ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("retention.no_releases")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">{t("retention.release_date")}</TableHead>
                  <TableHead className="text-xs text-end">{t("retention.release_amount")}</TableHead>
                  <TableHead className="text-xs">{t("retention.release_voucher")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sc.sub_retention.release_events ?? []).map((ev, i) => (
                  <TableRow key={i} className="border-b border-border last:border-0">
                    <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{formatDate(ev.date)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm font-medium tabular-nums text-end">{formatMoney(ev.amount, lang)}</TableCell>
                    <TableCell className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{ev.voucher_ref}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageSection>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <ModalShell
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
        title={editingItem ? t("boq.edit_item") : t("boq.add_item")}
        size="md"
        footer={<FormActions onCancel={() => setItemModalOpen(false)} onSave={handleSaveItem} />}
      >
        <div className="space-y-4">
          <FormField label={t("boq.description")} htmlFor="scb-desc" required>
            <Input id="scb-desc" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />
          </FormField>
          <FormGrid cols={3}>
            <FormField label={t("boq.unit")} htmlFor="scb-unit" required>
              <Input id="scb-unit" value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} />
            </FormField>
            <FormField label={t("boq.qty")} htmlFor="scb-qty">
              <Input id="scb-qty" type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} className="tabular-nums" />
            </FormField>
            <FormField label={t("boq.unit_price")} htmlFor="scb-price">
              <Input id="scb-price" type="number" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} className="tabular-nums" />
            </FormField>
          </FormGrid>
        </div>
      </ModalShell>

      <ModalShell
        open={copyModalOpen}
        onOpenChange={setCopyModalOpen}
        title={t("sub.copy_from_main_title")}
        size="lg"
        footer={<FormActions onCancel={() => setCopyModalOpen(false)} onSave={handleCopy} saveLabel={t("sub.copy_from_main_cta")} disabled={selectedMainIds.size === 0} />}
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-2">{t("sub.copy_from_main_select")}</p>
          {Object.values(boqItemsAll).map((item) => (
            <label key={item.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 cursor-pointer">
              <Checkbox checked={selectedMainIds.has(item.id)} onCheckedChange={() => toggleMainId(item.id)} />
              <span className="text-sm">{item.code} — {item.description_ar}</span>
            </label>
          ))}
        </div>
      </ModalShell>

      <ModalShell
        open={releaseModalOpen}
        onOpenChange={setReleaseModalOpen}
        title={t("retention.release_new")}
        size="md"
        footer={<FormActions onCancel={() => setReleaseModalOpen(false)} onSave={handleSaveRelease} />}
      >
        <div className="space-y-4">
          <FormField label={t("retention.release_date")} htmlFor="sub-rel-date">
            <DatePicker value={releaseDate} onChange={setReleaseDate} />
          </FormField>
          <FormField
            label={t("retention.release_amount")} htmlFor="sub-rel-amount"
            error={releaseAttempted && releaseOverOutstanding ? t("retention.over_outstanding_error") : undefined}
            helper={t("retention.outstanding") + ": " + formatMoney(sc.sub_retention.outstanding, lang)}
          >
            <Input id="sub-rel-amount" type="number" className="tabular-nums" value={releaseAmount} onChange={(e) => setReleaseAmount(e.target.value)} />
          </FormField>
          <FormField label={t("retention.release_reason")} htmlFor="sub-rel-reason">
            <Input id="sub-rel-reason" value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} placeholder={t("retention.release_reason_placeholder")} />
          </FormField>
        </div>
      </ModalShell>

      <ConfirmDialog
        open={approveClaimConfirmOpen}
        onOpenChange={setApproveClaimConfirmOpen}
        title={t("claim.approve_confirm_title")}
        description={t("claim.approve_confirm_body")}
        confirmTone="primary"
        confirmLabel={t("claim.approve")}
        onConfirm={confirmApproveClaim}
      />
    </div>
  );
}
