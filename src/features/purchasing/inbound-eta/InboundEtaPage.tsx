import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Download, Search, CheckCircle2, XCircle, Clock, FileText, Loader2,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { StatCard }      from "@/components/patterns/StatCard";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { usePurchasingData, type InboundEtaStatus } from "../data/usePurchasingData";
import { inboundEtaPillVariant } from "../data/statusHelpers";

// ── Skeleton ──────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded" />
        ))}
      </div>
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

// ── Remaining-hours badge ─────────────────────────────────────────

function DeadlineBadge({ hours, t }: { hours: number; t: ReturnType<typeof useTranslation<"purchasing">>["t"] }) {
  const isUrgent = hours < 24;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium",
      isUrgent ? "text-danger" : "text-warning",
    )}>
      <Clock className="h-3 w-3 shrink-0" />
      {t("inbound_eta.hours_remaining", { n: hours })}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export function InboundEtaPage() {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const can = useCan();

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");

  // ── Reject dialog ─────────────────────────────────────────────
  const [rejectId, setRejectId]       = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting]     = useState(false);

  // ── Lookup maps ───────────────────────────────────────────────
  const supplierMap = useMemo(
    () => Object.fromEntries((data?.suppliers ?? []).map(s => [s.id, s])),
    [data?.suppliers],
  );
  const invoiceMap = useMemo(
    () => Object.fromEntries((data?.purchaseInvoices ?? []).map(i => [i.id, i])),
    [data?.purchaseInvoices],
  );

  // ── Filtered list ─────────────────────────────────────────────
  const allRecords = data?.inboundEta ?? [];
  const filtered = useMemo(() => {
    let list = allRecords;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => {
        const s = supplierMap[e.supplier_id];
        return (
          e.uuid.toLowerCase().includes(q) ||
          e.supplier_name_ar?.toLowerCase().includes(q) ||
          s?.name_en?.toLowerCase().includes(q)
        );
      });
    }
    if (statusFilter) list = list.filter(e => e.status === statusFilter);
    return list;
  }, [allRecords, search, statusFilter, supplierMap]);

  // ── Accept ────────────────────────────────────────────────────
  const handleAccept = useCallback((uuid: string) => {
    toast.success(t("inbound_eta.accept_toast"));
  }, [t]);

  // ── Reject ────────────────────────────────────────────────────
  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    await new Promise(r => setTimeout(r, 600));
    setRejecting(false);
    setRejectId(null);
    setRejectReason("");
    toast.success(t("inbound_eta.rejected_toast"));
  }, [rejectReason, t]);

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("inbound_eta.title")} />
        <PageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("inbound_eta.title")} />
        <PageSection>
          <ErrorState description={t("errors.load")} onRetry={reload} />
        </PageSection>
      </div>
    );
  }

  const kpis = data!.inboundEtaKpis;

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("inbound_eta.title")}
          subtitle={allRecords.length > 0 ? t("inbound_eta.count", { n: allRecords.length }) : undefined}
          actions={
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 me-1.5" />
              {t("inbound_eta.export")}
            </Button>
          }
        />

        {isOffline && <OfflineBanner />}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={t("inbound_eta.kpi_vat")}
            value={formatMoney(kpis.deductible_input_vat, lang)}
            tone="brand"
          />
          <StatCard
            label={t("inbound_eta.kpi_nearing")}
            value={kpis.nearing_window}
            tone="warning"
          />
          <StatCard
            label={t("inbound_eta.kpi_pending")}
            value={kpis.pending}
            tone="plain"
          />
          <StatCard
            label={t("inbound_eta.kpi_rejected")}
            value={kpis.rejected}
            tone="danger"
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("inbound_eta.search_placeholder")}
              className="ps-9"
            />
          </div>
          <Select
            value={statusFilter || "__all__"}
            onValueChange={v => setStatus(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-10 w-auto min-w-44">
              <SelectValue placeholder={t("inbound_eta.all_statuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("inbound_eta.all_statuses")}</SelectItem>
              <SelectItem value="pending">{t("inbound.pending")}</SelectItem>
              <SelectItem value="accepted">{t("inbound.accepted")}</SelectItem>
              <SelectItem value="rejected">{t("inbound.rejected")}</SelectItem>
              <SelectItem value="unmatched">{t("inbound.unmatched")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <PageSection padded={false}>
          {allRecords.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("inbound_eta.no_records")}
              description={t("inbound_eta.empty_sub")}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("inbound_eta.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatus(""); }}>
                {t("inbound_eta.clear_filters")}
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("inbound_eta.col_uuid")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("inbound_eta.col_supplier")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("inbound_eta.col_value")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("inbound_eta.col_tax")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("inbound_eta.col_status")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("inbound_eta.col_received")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("inbound_eta.col_deadline")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("inbound_eta.col_matched")}
                      </TableHead>
                      <TableHead className="w-28" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(e => {
                      const supplier = supplierMap[e.supplier_id];
                      const sName = supplier
                        ? (lang === "ar" ? supplier.name_ar : supplier.name_en)
                        : e.supplier_name_ar;
                      const matchedInvoice = e.matched_pi ? invoiceMap[e.matched_pi] : null;
                      const isPending = e.status === "pending";
                      const etaLabel = t(`inbound.${e.status}`);
                      return (
                        <TableRow
                          key={e.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30"
                        >
                          {/* UUID */}
                          <TableCell>
                            <span
                              className="font-mono text-xs text-muted-foreground"
                              dir="ltr"
                            >
                              {e.uuid}
                            </span>
                          </TableCell>

                          {/* Supplier */}
                          <TableCell className="text-sm font-medium">
                            {sName}
                          </TableCell>

                          {/* Value */}
                          <TableCell className="text-start tabular-nums font-medium">
                            {formatMoney(e.value, lang)}
                          </TableCell>

                          {/* Tax */}
                          <TableCell className="text-start tabular-nums text-muted-foreground text-sm">
                            {formatMoney(e.tax, lang)}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <StatusPill
                              variant={inboundEtaPillVariant(e.status)}
                              label={etaLabel}
                            />
                          </TableCell>

                          {/* Received at */}
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                            {formatDate(e.received_at)}
                          </TableCell>

                          {/* Deadline / remaining */}
                          <TableCell>
                            {isPending && e.window_remaining_hours !== undefined ? (
                              <DeadlineBadge hours={e.window_remaining_hours} t={t} />
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>

                          {/* Matched PI */}
                          <TableCell>
                            {matchedInvoice ? (
                              <button
                                className="font-mono text-xs text-brand hover:underline"
                                dir="ltr"
                                onClick={() => navigate(`/purchasing/invoices/${e.matched_pi}`)}
                              >
                                {matchedInvoice.number}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Actions — only for pending */}
                          <TableCell>
                            {isPending && (
                              <div className="flex items-center gap-1.5">
                                {can("purchasing.inbound.respond") && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs gap-1 text-success hover:text-success hover:bg-success/10"
                                      onClick={() => handleAccept(e.uuid)}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      {t("inbound_eta.action_accept")}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs gap-1 text-danger hover:text-danger hover:bg-danger/10"
                                      onClick={() => { setRejectId(e.id); setRejectReason(""); }}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      {t("inbound_eta.action_reject")}
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map(e => {
                  const supplier = supplierMap[e.supplier_id];
                  const sName = supplier
                    ? (lang === "ar" ? supplier.name_ar : supplier.name_en)
                    : e.supplier_name_ar;
                  const isPending = e.status === "pending";
                  const etaLabel = t(`inbound.${e.status}`);
                  return (
                    <div key={e.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                          {e.uuid}
                        </span>
                        <StatusPill
                          variant={inboundEtaPillVariant(e.status)}
                          label={etaLabel}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{sName}</span>
                        <span className="tabular-nums font-medium text-sm">
                          {formatMoney(e.value, lang)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(e.received_at)}</span>
                        {isPending && e.window_remaining_hours !== undefined && (
                          <DeadlineBadge hours={e.window_remaining_hours} t={t} />
                        )}
                      </div>
                      {isPending && can("purchasing.inbound.respond") && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm" variant="outline"
                            className="flex-1 h-7 text-xs text-success border-success/30"
                            onClick={() => handleAccept(e.uuid)}
                          >
                            {t("inbound_eta.action_accept")}
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="flex-1 h-7 text-xs text-danger border-danger/30"
                            onClick={() => { setRejectId(e.id); setRejectReason(""); }}
                          >
                            {t("inbound_eta.action_reject")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </PageSection>
      </div>

      <ConfirmDialog
        open={rejectId !== null}
        onOpenChange={open => !open && setRejectId(null)}
        title={t("inbound_eta.reject_title")}
        confirmTone="danger"
        confirmLabel={t("inbound_eta.reject_confirm")}
        onConfirm={handleReject}
        loading={rejecting}
        confirmDisabled={!rejectReason.trim()}
      >
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("inbound_eta.reject_reason_label")} *
          </Label>
          <Textarea
            rows={3}
            className="resize-none"
            placeholder={t("inbound_eta.reject_reason_ph")}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
