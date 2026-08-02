import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Plus, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { StatCard } from "@/components/patterns/StatCard";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton, KpiSkeleton } from "@/components/patterns/Skeletons";
import { StatusPill } from "@/components/patterns/StatusPill";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField, FormGrid, FormActions } from "@/components/patterns/FormLayout";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useConstructionStore } from "@/stores/constructionStore";
import { useMockState } from "@/features/projects/useMockState";
import { computeWarrantyReleaseDue, round2 } from "@/features/construction/calc";
import type { ReleaseStage } from "@/features/construction/types";

const STAGE_LABEL_KEY: Record<ReleaseStage, string> = {
  initial_handover: "retention.stage_initial",
  warranty_end: "retention.stage_warranty",
  other: "retention.stage_other",
};

export function RetentionPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const retention = useConstructionStore((s) => s.retention);
  const terms = useConstructionStore((s) => s.contract_terms);
  const claimsAll = useConstructionStore((s) => s.progress_claims);
  const createRetentionRelease = useConstructionStore((s) => s.createRetentionRelease);
  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canRelease = can("construction.retention.release");

  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<ReleaseStage>("initial_handover");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reasonAr, setReasonAr] = useState("");
  const [attempted, setAttempted] = useState(false);

  const accrualRows = useMemo(() => {
    const finalClaims = Object.values(claimsAll)
      .filter((c) => c.status === "approved" || c.status === "invoiced" || c.status === "collected")
      .sort((a, b) => a.number.localeCompare(b.number));
    let running = 0;
    return finalClaims.map((c) => {
      running = round2(running + c.retention_this);
      return { claim: c, running };
    });
  }, [claimsAll]);

  const warranty = useMemo(
    () => computeWarrantyReleaseDue(retention.release_events, terms.release_template.warranty_months, retention.outstanding),
    [retention.release_events, terms.release_template.warranty_months, retention.outstanding]
  );

  const suggestedAmount = useMemo(() => {
    if (stage === "initial_handover") return round2(retention.outstanding * terms.release_template.initial_handover_pct);
    if (stage === "warranty_end") return retention.outstanding;
    return 0;
  }, [stage, retention.outstanding, terms.release_template.initial_handover_pct]);

  function openModal() {
    setAmount(suggestedAmount ? String(suggestedAmount) : "");
    setStage("initial_handover");
    setDate(new Date().toISOString().slice(0, 10));
    setReasonAr("");
    setAttempted(false);
    setModalOpen(true);
  }

  const amountNum = Number(amount) || 0;
  const overOutstanding = amountNum > retention.outstanding;

  function handleSave() {
    setAttempted(true);
    if (amountNum <= 0 || overOutstanding) return;
    const result = createRetentionRelease(id, { amount: amountNum, stage, date, reason_ar: reasonAr.trim() || undefined });
    if (result.ok) {
      toast.success(t("retention.save_release_success"));
      setModalOpen(false);
    } else {
      toast.error(t("retention.over_outstanding_error"));
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("retention.title")} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
        <TableSkeleton rows={3} cols={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("retention.title")} />
        <PageSection><ErrorState onRetry={reload} /></PageSection>
      </div>
    );
  }

  if (forcedEmpty || (accrualRows.length === 0 && retention.accumulated_retained === 0)) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("retention.title")} />
        <PageSection>
          <EmptyState icon={ShieldCheck} title={t("retention.empty_title")} />
        </PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("retention.title")}
        actions={canRelease ? (
          <Button
            size="sm" onClick={openModal}
            disabled={retention.outstanding <= 0 || isOffline}
            title={isOffline ? t("retention.offline_note") : undefined}
          >
            <Plus className="h-4 w-4 me-1.5" />{t("retention.release_new")}
          </Button>
        ) : undefined}
      />

      {isOffline && <OfflineBanner />}

      {retention.at_cap && (
        <div className="flex items-center gap-2 px-4 py-2 bg-warning-tint text-warning-text text-sm font-medium rounded border border-warning/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t("retention.at_cap_banner")}</span>
        </div>
      )}

      {warranty.due && (
        <div className="flex items-center gap-2 px-4 py-2 bg-danger-tint text-danger-text text-sm font-medium rounded border border-danger/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t("retention.warranty_due_alert", { date: formatDate(warranty.sinceDate ?? "") })}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("retention.accumulated")} value={formatMoney(retention.accumulated_retained, lang)} />
        <StatCard label={t("retention.released")} value={formatMoney(retention.released, lang)} tone="success" />
        <StatCard label={t("retention.outstanding")} value={formatMoney(retention.outstanding, lang)} tone="warning" />
        <StatCard
          label={t("retention.rate_label")}
          value={`${Math.round(retention.rate * 10000) / 100}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PageSection title={t("retention.accrual_title")}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">{t("retention.col_claim")}</TableHead>
                  <TableHead className="text-xs text-end">{t("retention.col_work_value")}</TableHead>
                  <TableHead className="text-xs text-end">{t("retention.col_retained")}</TableHead>
                  <TableHead className="text-xs text-end">{t("retention.col_running_accumulated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accrualRows.map(({ claim, running }) => (
                  <TableRow key={claim.id} className="border-b border-border last:border-0">
                    <TableCell className="px-3 py-2 text-sm font-medium">{claim.number}</TableCell>
                    <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{formatMoney(claim.gross_current, lang)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{formatMoney(claim.retention_this, lang)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm font-medium tabular-nums text-end">{formatMoney(running, lang)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </PageSection>

        <PageSection title={t("retention.releases_title")}>
          {retention.release_events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("retention.no_releases")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">{t("retention.release_date")}</TableHead>
                    <TableHead className="text-xs">{t("retention.release_stage")}</TableHead>
                    <TableHead className="text-xs text-end">{t("retention.release_amount")}</TableHead>
                    <TableHead className="text-xs">{t("common:status")}</TableHead>
                    <TableHead className="text-xs">{t("retention.release_voucher")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retention.release_events.map((ev, i) => (
                    <TableRow key={i} className="border-b border-border last:border-0">
                      <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{formatDate(ev.date)}</TableCell>
                      <TableCell className="px-3 py-2 text-sm">{t(STAGE_LABEL_KEY[ev.stage])}</TableCell>
                      <TableCell className="px-3 py-2 text-sm font-medium tabular-nums text-end">{formatMoney(ev.amount, lang)}</TableCell>
                      <TableCell className="px-3 py-2"><StatusPill variant="approved" label={t("retention.release_status_executed")} /></TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{ev.voucher_ref}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PageSection>
      </div>

      <ModalShell
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={t("retention.release_new")}
        size="md"
        footer={<FormActions onCancel={() => setModalOpen(false)} onSave={handleSave} />}
      >
        <div className="space-y-4">
          <FormGrid cols={2}>
            <FormField label={t("retention.release_stage")} htmlFor="rel-stage">
              <Select value={stage} onValueChange={(v) => setStage(v as ReleaseStage)}>
                <SelectTrigger id="rel-stage"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial_handover">{t("retention.stage_initial")}</SelectItem>
                  <SelectItem value="warranty_end">{t("retention.stage_warranty")}</SelectItem>
                  <SelectItem value="other">{t("retention.stage_other")}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("retention.release_date")} htmlFor="rel-date">
              <DatePicker value={date} onChange={setDate} />
            </FormField>
          </FormGrid>
          <FormField
            label={t("retention.release_amount")} htmlFor="rel-amount"
            error={attempted && (amountNum <= 0 || overOutstanding) ? (overOutstanding ? t("retention.over_outstanding_error") : undefined) : undefined}
            helper={t("retention.outstanding") + ": " + formatMoney(retention.outstanding, lang)}
          >
            <Input id="rel-amount" type="number" className="tabular-nums" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField label={t("retention.release_reason")} htmlFor="rel-reason">
            <Input id="rel-reason" value={reasonAr} onChange={(e) => setReasonAr(e.target.value)} placeholder={t("retention.release_reason_placeholder")} />
          </FormField>
        </div>
      </ModalShell>
    </div>
  );
}
