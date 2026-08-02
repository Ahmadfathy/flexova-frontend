import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Download, Plus, Receipt } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { StatCard } from "@/components/patterns/StatCard";
import { EmptyState } from "@/components/patterns/EmptyState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useConstructionStore } from "@/stores/constructionStore";
import { useMockState } from "@/features/projects/useMockState";
import type { ClaimStatus } from "@/features/construction/types";

const STATUS_PILL: Record<ClaimStatus, PillVariant> = {
  draft: "inactive",
  submitted: "pending",
  approved: "approved",
  invoiced: "in-progress",
  collected: "paid",
};

const ALL_STATUSES: ClaimStatus[] = ["draft", "submitted", "approved", "invoiced", "collected"];

export function ClaimsRegisterPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const claimsAll = useConstructionStore((s) => s.progress_claims);
  const boqItemsAll = useConstructionStore((s) => s.boq_items);
  const retention = useConstructionStore((s) => s.retention);
  const { isOffline, forcedEmpty } = useMockState();

  const canCreate = can("construction.claim.create");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const claims = useMemo(() => (forcedEmpty ? [] : Object.values(claimsAll)), [claimsAll, forcedEmpty]);
  const openClaim = claims.find((c) => c.status === "draft" || c.status === "submitted") ?? null;

  const filtered = useMemo(() => {
    let list = [...claims].sort((a, b) => b.number.localeCompare(a.number));
    if (status) list = list.filter((c) => c.status === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.number.toLowerCase().includes(q) || c.period_ar.toLowerCase().includes(q));
    }
    return list;
  }, [claims, status, search]);

  const contractValue = useMemo(() => Object.values(boqItemsAll).reduce((sum, i) => sum + i.value, 0), [boqItemsAll]);

  const kpis = useMemo(() => {
    const billable = claims.filter((c) => c.status === "approved" || c.status === "invoiced" || c.status === "collected");
    const billed = billable.reduce((sum, c) => sum + c.gross_current, 0);
    const collected = claims.filter((c) => c.status === "collected").reduce((sum, c) => sum + c.net_payable, 0);
    return { billed, collected, retained: retention.outstanding, remaining: Math.max(0, contractValue - billed) };
  }, [claims, retention.outstanding, contractValue]);

  const totals = useMemo(() => filtered.reduce((acc, c) => ({
    gross: acc.gross + c.gross_current,
    retention: acc.retention + c.retention_this,
    advance: acc.advance + c.advance_recovery_this,
    deductions: acc.deductions + c.deductions.reduce((s, d) => s + d.amount, 0),
    vat: acc.vat + c.vat,
    netPayable: acc.netPayable + c.net_payable,
  }), { gross: 0, retention: 0, advance: 0, deductions: 0, vat: 0, netPayable: 0 }), [filtered]);

  function handleNewClaim() {
    navigate(`/projects/${id}/claims/new`);
  }

  function handleExport() {
    toast.success(t("claims.export_toast", { n: filtered.length }));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("claims.title")}
        actions={canCreate ? (
          <Button size="sm" onClick={handleNewClaim} disabled={!!openClaim} title={openClaim ? t("claims.open_draft_banner") : undefined}>
            <Plus className="h-4 w-4 me-1.5" />{t("claims.new_claim")}
          </Button>
        ) : undefined}
      />

      {isOffline && <OfflineBanner message={t("claims.offline_note")} />}

      {openClaim && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-warning-tint text-warning-text text-sm font-medium rounded border border-warning/20">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("claims.open_draft_banner")}
          </span>
          <button type="button" className="underline underline-offset-2 shrink-0" onClick={() => navigate(`/projects/${id}/claims/${openClaim.id}`)}>
            {t("claims.open_draft_cta")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("claims.billed")} value={formatMoney(kpis.billed, lang)} tone="success" />
        <StatCard label={t("claims.collected")} value={formatMoney(kpis.collected, lang)} tone="success" />
        <StatCard label={t("claims.retained")} value={formatMoney(kpis.retained, lang)} tone="warning" />
        <StatCard label={t("claims.remaining")} value={formatMoney(kpis.remaining, lang)} />
      </div>

      {claims.length === 0 ? (
        <PageSection>
          <EmptyState
            icon={Receipt}
            title={t("claims.empty_title")}
            action={canCreate ? { label: t("claims.new_claim"), onClick: handleNewClaim } : undefined}
          />
        </PageSection>
      ) : (
        <PageSection padded={false}>
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
            <Input
              className="max-w-64" placeholder={t("claims.search_placeholder")}
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-10 w-auto min-w-36"><SelectValue placeholder={t("claims.filter_all_statuses")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("claims.filter_all_statuses")}</SelectItem>
                {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`claim.status_${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="ms-auto" onClick={handleExport}>
              <Download className="h-4 w-4 me-1.5" />{t("claims.export")}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">{t("claims.col_number")}</TableHead>
                  <TableHead className="text-xs">{t("claims.col_period")}</TableHead>
                  <TableHead className="text-xs text-end">{t("claims.col_gross")}</TableHead>
                  <TableHead className="text-xs text-end">{t("claims.col_retention")}</TableHead>
                  <TableHead className="text-xs text-end">{t("claims.col_advance")}</TableHead>
                  <TableHead className="text-xs text-end">{t("claims.col_deductions")}</TableHead>
                  <TableHead className="text-xs text-end">{t("claims.col_vat")}</TableHead>
                  <TableHead className="text-xs text-end">{t("claims.col_net_payable")}</TableHead>
                  <TableHead className="text-xs">{t("claims.col_payment_status")}</TableHead>
                  <TableHead className="text-xs">{t("claims.col_status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const deductionsTotal = c.deductions.reduce((s, d) => s + d.amount, 0);
                  const isFinal = c.status === "approved" || c.status === "invoiced" || c.status === "collected";
                  const etaRejected = c.status === "approved" && c.eta_status === "rejected";
                  return (
                    <TableRow
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                      onClick={() => navigate(`/projects/${id}/claims/${c.id}`)}
                    >
                      <TableCell className="px-3 py-2.5 text-sm font-medium">{c.number}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap">{c.period_ar || formatDate(c.date)}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-end">{isFinal ? formatMoney(c.gross_current, lang) : "—"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-end">{isFinal ? formatMoney(c.retention_this, lang) : "—"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-end">{isFinal ? formatMoney(c.advance_recovery_this, lang) : "—"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-end">{isFinal ? formatMoney(deductionsTotal, lang) : "—"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-end">{isFinal ? formatMoney(c.vat, lang) : "—"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm font-medium tabular-nums text-end">{isFinal ? formatMoney(c.net_payable, lang) : "—"}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        {c.status === "collected" ? (
                          <StatusPill variant="paid" label={t("claims.payment_collected")} />
                        ) : isFinal ? (
                          <StatusPill variant="pending" label={t("claims.payment_outstanding")} />
                        ) : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <StatusPill variant={STATUS_PILL[c.status]} label={t(`claim.status_${c.status}`)} />
                          {etaRejected && (
                            <span title={t("claims.eta_rejected_flag")}>
                              <AlertTriangle className={cn("h-4 w-4 text-danger-text shrink-0")} />
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30">
                  <TableCell className="px-3 py-2 text-xs" colSpan={2}>{t("claims.totals_row")}</TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums text-end">{formatMoney(totals.gross, lang)}</TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums text-end">{formatMoney(totals.retention, lang)}</TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums text-end">{formatMoney(totals.advance, lang)}</TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums text-end">{formatMoney(totals.deductions, lang)}</TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums text-end">{formatMoney(totals.vat, lang)}</TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums text-end">{formatMoney(totals.netPayable, lang)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </PageSection>
      )}
    </div>
  );
}
