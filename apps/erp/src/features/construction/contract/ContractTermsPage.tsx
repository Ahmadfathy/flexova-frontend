import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Lock, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { FormField, FormGrid, FormActions } from "@/components/patterns/FormLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useConstructionStore } from "@/stores/constructionStore";
import { useProjectsAudit } from "@/stores/projectsAudit";
import { CURRENT_EMPLOYEE_ID } from "@/features/projects/currentUser";
import { computeClaimPreview } from "@/features/construction/calc";
import type { AdvanceRecoveryMethod } from "@/features/construction/types";
import type { ContractTermsFormInput } from "@/stores/constructionStore";

export function ContractTermsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const terms = useConstructionStore((s) => s.contract_terms);
  const updateContractTerms = useConstructionStore((s) => s.updateContractTerms);
  const appendAudit = useProjectsAudit((s) => s.append);
  const contractValue = useConstructionStore((s) => Object.values(s.boq_items).reduce((sum, i) => sum + i.value, 0));

  const canEdit = can("construction.contract.edit");
  const canOverride = can("construction.contract.terms_override");
  const [overrideActive, setOverrideActive] = useState(false);
  const [overrideConfirmOpen, setOverrideConfirmOpen] = useState(false);

  const editable = (canEdit && !terms.locked) || overrideActive;

  const [retentionRatePct, setRetentionRatePct] = useState("");
  const [hasCap, setHasCap] = useState(true);
  const [retentionCapPct, setRetentionCapPct] = useState("");
  const [releaseInitialPct, setReleaseInitialPct] = useState("");
  const [releaseWarrantyPct, setReleaseWarrantyPct] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("");
  const [advanceMode, setAdvanceMode] = useState<"fixed" | "pct">("fixed");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advancePct, setAdvancePct] = useState("");
  const [recoveryMethod, setRecoveryMethod] = useState<AdvanceRecoveryMethod>("fixed_pct");
  const [recoveryPct, setRecoveryPct] = useState("");
  const [receiptRef, setReceiptRef] = useState("");

  useEffect(() => {
    setRetentionRatePct(String(terms.retention_rate * 100));
    setHasCap(terms.retention_cap != null);
    setRetentionCapPct(terms.retention_cap != null && contractValue > 0 ? String(Math.round((terms.retention_cap / contractValue) * 10000) / 100) : "");
    setReleaseInitialPct(String(terms.release_template.initial_handover_pct * 100));
    setReleaseWarrantyPct(String(terms.release_template.warranty_end_pct * 100));
    setWarrantyMonths(String(terms.release_template.warranty_months));
    setAdvanceMode("fixed");
    setAdvanceAmount(String(terms.advance_amount));
    setAdvancePct(contractValue > 0 ? String(Math.round((terms.advance_amount / contractValue) * 10000) / 100) : "");
    setRecoveryMethod(terms.advance_recovery_method);
    setRecoveryPct(String(terms.advance_recovery_pct * 100));
    setReceiptRef(terms.advance_received_receipt_ref ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms]);

  const retentionRateNum = (Number(retentionRatePct) || 0) / 100;
  const retentionCapNum = hasCap ? (Number(retentionCapPct) || 0) / 100 : null;
  const retentionCapAbs = retentionCapNum != null ? Math.round(retentionCapNum * contractValue * 100) / 100 : null;
  const advanceAmountNum = advanceMode === "fixed"
    ? (Number(advanceAmount) || 0)
    : Math.round(((Number(advancePct) || 0) / 100) * contractValue * 100) / 100;
  const recoveryPctNum = (Number(recoveryPct) || 0) / 100;

  const overCap = retentionRateNum + recoveryPctNum > 1;
  const capBelowRate = hasCap && retentionCapNum != null && retentionCapNum < retentionRateNum;

  const preview = useMemo(() => computeClaimPreview({
    grossCurrent: 100000,
    retentionRate: retentionRateNum,
    retentionCap: retentionCapAbs,
    retentionAccumulatedSoFar: 0,
    advanceAmount: advanceAmountNum,
    advanceRecoveryPct: recoveryPctNum,
    advanceRecoveredSoFar: 0,
    vatRate: terms.vat_rate,
  }), [retentionRateNum, retentionCapAbs, advanceAmountNum, recoveryPctNum, terms.vat_rate]);

  function buildInput(): ContractTermsFormInput {
    return {
      retention_rate: retentionRateNum,
      retention_cap: retentionCapAbs,
      retention_cap_basis_ar: retentionCapNum != null
        ? `${retentionCapPct}% من قيمة العقد (${formatMoney(contractValue, "ar")} × ${retentionCapPct}%)`
        : undefined,
      release_template: {
        initial_handover_pct: (Number(releaseInitialPct) || 0) / 100,
        warranty_end_pct: (Number(releaseWarrantyPct) || 0) / 100,
        warranty_months: Number(warrantyMonths) || 0,
      },
      advance_amount: advanceAmountNum,
      advance_recovery_method: recoveryMethod,
      advance_recovery_pct: recoveryPctNum,
      advance_received_receipt_ref: receiptRef.trim() || undefined,
    };
  }

  function handleSave() {
    if (overCap) {
      toast.error(t("contract.block_over_100"));
      return;
    }
    const result = updateContractTerms(id, buildInput(), overrideActive);
    if (result.ok) {
      toast.success(t("contract.save_success"));
      if (overrideActive) {
        appendAudit({
          user: CURRENT_EMPLOYEE_ID,
          action: "construction.contract.terms_override",
          entity: id,
          detail_ar: `تعديل شروط العقد بصلاحية عُليا رغم القفل — المشروع ${id}`,
          detail_en: `Overrode locked contract terms with elevated permission — project ${id}`,
        });
      }
      setOverrideActive(false);
    } else if (result.reason === "invalid") {
      toast.error(t("contract.block_over_100"));
    } else {
      toast.error(t("contract.locked"));
    }
  }

  function confirmOverride() {
    setOverrideActive(true);
    setOverrideConfirmOpen(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("contract.title")}
        alert={terms.locked ? (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-warning-tint text-warning-text text-sm font-medium rounded border border-warning/20">
            <span className="flex items-center gap-2"><Lock className="h-4 w-4 shrink-0" />{t("contract.locked")}</span>
            {canOverride && !overrideActive && (
              <button type="button" className="underline underline-offset-2 shrink-0" onClick={() => setOverrideConfirmOpen(true)}>
                {t("contract.override_button")}
              </button>
            )}
          </div>
        ) : undefined}
      />

      {overrideActive && (
        <div className="flex items-center gap-2 px-4 py-2 bg-danger-tint text-danger-text text-sm font-medium rounded border border-danger/20">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{t("contract.override_active_note")}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <PageSection title={t("contract.retention")}>
            <FormGrid cols={2}>
              <FormField label={t("contract.retention_rate")} htmlFor="ret-rate">
                <Input id="ret-rate" type="number" disabled={!editable} value={retentionRatePct} onChange={(e) => setRetentionRatePct(e.target.value)} className="tabular-nums" />
              </FormField>
              <FormField label={t("contract.retention_cap_pct")} htmlFor="ret-cap" error={capBelowRate ? t("contract.warn_cap_below_rate") : undefined}>
                <div className="flex items-center gap-2">
                  <Input id="ret-cap" type="number" disabled={!editable || !hasCap} value={retentionCapPct} onChange={(e) => setRetentionCapPct(e.target.value)} className="tabular-nums" />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <input type="checkbox" checked={!hasCap} disabled={!editable} onChange={(e) => setHasCap(!e.target.checked)} />
                    {t("contract.retention_cap_none")}
                  </label>
                </div>
                {hasCap && retentionCapAbs != null && (
                  <p className="text-xs text-muted-foreground mt-1">{t("contract.retention_cap_amount")} {formatMoney(retentionCapAbs, lang)}</p>
                )}
              </FormField>
            </FormGrid>

            <div className="mt-4 pt-4 border-t border-border space-y-1">
              <p className="text-sm font-medium">{t("contract.release_template")}</p>
              <FormGrid cols={3}>
                <FormField label={t("contract.release_initial_pct")} htmlFor="rel-initial">
                  <Input id="rel-initial" type="number" disabled={!editable} value={releaseInitialPct} onChange={(e) => setReleaseInitialPct(e.target.value)} className="tabular-nums" />
                </FormField>
                <FormField label={t("contract.release_warranty_pct")} htmlFor="rel-warranty">
                  <Input id="rel-warranty" type="number" disabled={!editable} value={releaseWarrantyPct} onChange={(e) => setReleaseWarrantyPct(e.target.value)} className="tabular-nums" />
                </FormField>
                <FormField label={t("contract.warranty_months")} htmlFor="rel-months">
                  <Input id="rel-months" type="number" disabled={!editable} value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} className="tabular-nums" />
                </FormField>
              </FormGrid>
            </div>
          </PageSection>

          <PageSection title={t("contract.advance_section")}>
            <FormGrid cols={2}>
              <FormField label={t("contract.advance_mode")} htmlFor="adv-mode">
                <Select value={advanceMode} onValueChange={(v) => setAdvanceMode(v as "fixed" | "pct")} disabled={!editable}>
                  <SelectTrigger id="adv-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">{t("contract.advance_mode_fixed")}</SelectItem>
                    <SelectItem value="pct">{t("contract.advance_mode_pct")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {advanceMode === "fixed" ? (
                <FormField label={t("contract.advance_amount")} htmlFor="adv-amount">
                  <Input id="adv-amount" type="number" disabled={!editable} value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} className="tabular-nums" />
                </FormField>
              ) : (
                <FormField label={t("contract.advance_pct")} htmlFor="adv-pct" helper={formatMoney(advanceAmountNum, lang)}>
                  <Input id="adv-pct" type="number" disabled={!editable} value={advancePct} onChange={(e) => setAdvancePct(e.target.value)} className="tabular-nums" />
                </FormField>
              )}
            </FormGrid>
            <FormGrid cols={3} className="mt-4">
              <FormField label={t("contract.recovery_method")} htmlFor="rec-method">
                <Select value={recoveryMethod} onValueChange={(v) => setRecoveryMethod(v as AdvanceRecoveryMethod)} disabled={!editable}>
                  <SelectTrigger id="rec-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_pct">{t("contract.recovery_fixed")}</SelectItem>
                    <SelectItem value="proportional">{t("contract.recovery_proportional")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t("contract.recovery_pct")} htmlFor="rec-pct" error={overCap ? t("contract.block_over_100") : undefined}>
                <Input id="rec-pct" type="number" disabled={!editable} value={recoveryPct} onChange={(e) => setRecoveryPct(e.target.value)} className="tabular-nums" />
              </FormField>
              <FormField label={t("contract.receipt_ref")} htmlFor="rec-ref">
                <Input id="rec-ref" disabled={!editable} value={receiptRef} onChange={(e) => setReceiptRef(e.target.value)} />
              </FormField>
            </FormGrid>
          </PageSection>

          <PageSection title={t("contract.billing_section")}>
            <FormGrid cols={2}>
              <FormField label={t("contract.vat_rate")} htmlFor="vat-rate" helper={t("contract.vat_rate_note")}>
                <Input id="vat-rate" disabled value={`${Math.round(terms.vat_rate * 10000) / 100}%`} className="tabular-nums" />
              </FormField>
              <FormField label={t("contract.claim_numbering")} htmlFor="claim-num" helper={t("contract.claim_numbering_note")}>
                <Input id="claim-num" disabled value="PC-001, PC-002, ..." />
              </FormField>
            </FormGrid>
            <p className="text-xs text-muted-foreground mt-3">{t("contract.vat_base_note")}</p>
          </PageSection>

          {editable && (
            <FormActions onSave={handleSave} saveLabel={t("common:save")} />
          )}
        </div>

        {/* Live preview */}
        <div>
          <PageSection title={t("contract.preview_title")}>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("contract.preview_gross")}</span><span className="tabular-nums font-medium">{formatMoney(preview.grossCurrent, lang)}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">− {t("contract.preview_retention")}</span><span className="tabular-nums text-warning-text">− {formatMoney(preview.retentionThis, lang)}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">− {t("contract.preview_advance")}</span><span className="tabular-nums text-warning-text">− {formatMoney(preview.advanceRecoveryThis, lang)}</span></div>
              <div className="flex items-center justify-between border-t border-border pt-2"><span className="font-medium">{t("contract.preview_net_before_vat")}</span><span className="tabular-nums font-medium">{formatMoney(preview.netBeforeVat, lang)}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("contract.preview_vat")}</span><span className="tabular-nums text-success-text">+ {formatMoney(preview.vat, lang)}</span></div>
              <div className="flex items-center justify-between border-t border-border pt-2"><span className="font-semibold">{t("contract.preview_net_payable")}</span><span className="tabular-nums font-bold text-brand-text">{formatMoney(preview.netPayable, lang)}</span></div>
            </div>
            {overCap && (
              <div className="flex items-start gap-2 text-xs text-danger-text mt-3">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{t("contract.block_over_100")}</span>
              </div>
            )}
          </PageSection>
        </div>
      </div>

      <ConfirmDialog
        open={overrideConfirmOpen}
        onOpenChange={setOverrideConfirmOpen}
        title={t("contract.override_confirm_title")}
        description={t("contract.override_confirm_body")}
        confirmTone="warning"
        confirmLabel={t("contract.override_button")}
        onConfirm={confirmOverride}
      />
    </div>
  );
}
