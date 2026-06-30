import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { StatCard }      from "@/components/patterns/StatCard";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  Settings, AlertTriangle, CheckCircle2, RefreshCw,
  ShieldCheck, ExternalLink, RotateCcw, XCircle,
} from "lucide-react";

import { useSalesData } from "@/features/sales/invoices/useSalesData";
import { useCan }       from "@/lib/permissions";
import type { EtaStatus, SalesData } from "@/features/sales/invoices/useSalesData";
import { cn } from "@/lib/utils";

// ── ETA queue document (flattened from invoices + notes) ──────────
interface EtaQueueDoc {
  id: string;
  number: string;
  docType: "invoice" | "credit_note" | "debit_note";
  channel: "e-invoice" | "e-receipt" | null;
  etaStatus: EtaStatus;
  customerId: string;
  date: string;
  windowRemainingHours?: number;
  reasonAr?: string;
  canResend: boolean;
}

function buildQueueDocs(data: SalesData): EtaQueueDoc[] {
  const docs: EtaQueueDoc[] = [];

  for (const inv of data.invoices) {
    if (inv.eta_status === "draft") continue;
    docs.push({
      id: inv.id,
      number: inv.number,
      docType: "invoice",
      channel: inv.channel,
      etaStatus: inv.eta_status,
      customerId: inv.customer_id,
      date: inv.date,
      windowRemainingHours: inv.eta.window_remaining_hours,
      reasonAr: inv.eta.reason_ar,
      canResend: ["rejected", "buyer_rejected", "queued", "unsent"].includes(inv.eta_status),
    });
  }

  for (const cn of data.creditNotes) {
    docs.push({
      id: cn.id,
      number: cn.number,
      docType: "credit_note",
      channel: null,
      etaStatus: cn.eta_status,
      customerId: cn.customer_id,
      date: cn.date,
      reasonAr: cn.reason_ar,
      canResend: ["rejected", "buyer_rejected", "unsent"].includes(cn.eta_status),
    });
  }

  for (const dn of data.debitNotes) {
    docs.push({
      id: dn.id,
      number: dn.number,
      docType: "debit_note",
      channel: null,
      etaStatus: dn.eta_status,
      customerId: dn.customer_id,
      date: dn.date,
      reasonAr: dn.reason_ar,
      canResend: ["rejected", "buyer_rejected", "unsent"].includes(dn.eta_status),
    });
  }

  return docs.sort((a, b) => b.date.localeCompare(a.date));
}

// ── Window countdown helpers ──────────────────────────────────────
type WindowTone = "muted" | "warning" | "danger";

function windowInfo(hours: number, lang: "ar" | "en"): { text: string; tone: WindowTone } {
  const days = Math.floor(hours / 24);
  const rem  = hours % 24;
  const text = lang === "ar"
    ? (days > 0 ? `${days} يوم ${rem} ساعة` : `${hours} ساعة`)
    : (days > 0 ? `${days}d ${rem}h`         : `${hours}h`);
  const tone: WindowTone = hours < 12 ? "danger" : hours < 24 ? "warning" : "muted";
  return { text, tone };
}

const windowToneClass: Record<WindowTone, string> = {
  muted:   "text-muted-foreground",
  warning: "text-warning",
  danger:  "text-destructive font-medium",
};

// ── Compliance tier helpers ───────────────────────────────────────
type StatTone = "plain" | "brand" | "success" | "warning" | "danger";
function tierTone(tier: number): StatTone {
  if (tier === 1) return "success";
  if (tier === 2) return "warning";
  return "danger";
}

// ── ETA status → StatusPill variant ──────────────────────────────
const ETA_PILL: Record<EtaStatus, Parameters<typeof StatusPill>[0]["variant"]> = {
  draft:          "default",
  unsent:         "default",
  queued:         "pending",
  clearing:       "active",
  valid:          "approved",
  rejected:       "rejected",
  buyer_rejected: "rejected",
  cancelled:      "inactive",
};

// ── Doc type badge ────────────────────────────────────────────────
function DocTypeBadge({ type, t }: { type: EtaQueueDoc["docType"]; t: (k: string) => string }) {
  const map: Record<EtaQueueDoc["docType"], string> = {
    invoice:     "eta_hub.type_invoice",
    credit_note: "eta_hub.type_credit",
    debit_note:  "eta_hub.type_debit",
  };
  return (
    <Badge variant={type === "invoice" ? "secondary" : "outline"} className="text-xs whitespace-nowrap">
      {t(map[type])}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
export function EtaHubPage() {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const nav  = useNavigate();
  const can  = useCan();
  const canResend = can("eta.resend");

  const { data, loading, error, isOffline, reload } = useSalesData();

  // ── Filters ──────────────────────────────────────────────────
  const [queueTab,     setQueueTab]     = useState<"all" | "b2b" | "b2c">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter,   setTypeFilter]   = useState("all");

  // ── Selection ────────────────────────────────────────────────
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [resending, setResending] = useState(false);

  // ── Derived docs ─────────────────────────────────────────────
  const allDocs = useMemo(
    () => (data ? buildQueueDocs(data) : []),
    [data],
  );

  const filtered = useMemo(() => {
    return allDocs.filter(doc => {
      if (queueTab === "b2b" && doc.channel === "e-receipt")              return false;
      if (queueTab === "b2c" && doc.channel !== "e-receipt")              return false;
      if (statusFilter !== "all" && doc.etaStatus !== statusFilter)       return false;
      if (typeFilter   !== "all" && doc.docType   !== typeFilter)         return false;
      return true;
    });
  }, [allDocs, queueTab, statusFilter, typeFilter]);

  const resendableInSelection = filtered.filter(d => selection[d.id] && d.canResend);
  const selectedCount  = Object.values(selection).filter(Boolean).length;
  const allResendable  = filtered.filter(d => d.canResend);
  const allChecked     = allResendable.length > 0 && allResendable.every(d => selection[d.id]);
  const someChecked    = allResendable.some(d => selection[d.id]);

  // ── Handlers ─────────────────────────────────────────────────
  function toggleAll() {
    if (allChecked) {
      setSelection({});
    } else {
      setSelection(Object.fromEntries(allResendable.map(d => [d.id, true])));
    }
  }

  function toggleDoc(id: string) {
    setSelection(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleBulkResend() {
    setResending(true);
    await new Promise(r => setTimeout(r, 900));
    setResending(false);
    setSelection({});
    toast.success(t("eta_hub.resend_ok", { n: resendableInSelection.length }));
  }

  async function handleResendOne(doc: EtaQueueDoc) {
    await new Promise(r => setTimeout(r, 600));
    toast.success(`${t("eta_hub.resend_action")} — ${doc.number}`);
  }

  function navigateToDoc(doc: EtaQueueDoc) {
    if (doc.docType === "invoice") nav(`/sales/invoices/${doc.id}`);
    else if (doc.docType === "credit_note") nav("/sales/credit-notes");
    else nav("/sales/debit-notes");
  }

  // ── Loading / error ───────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (error) return <ErrorState description={error} onRetry={reload} />;

  const hub      = data?.etaHub;
  const settings = data?.etaSettings;
  const kpis     = hub?.kpis;
  const alerts   = hub?.alerts   ?? [];
  const reasons  = hub?.top_rejection_reasons ?? [];

  const customers    = data?.customers ?? [];
  const customerName = (id: string) => {
    const c = customers.find(x => x.id === id);
    return c ? (lang === "ar" ? c.name_ar : c.name_en) : id;
  };

  const tier        = kpis?.compliance_tier ?? 1;
  const tierToneVal = tierTone(tier);
  const tierLabel   = tier === 1
    ? t("eta_hub.tier_1_ok")
    : tier === 2
    ? t("eta_hub.tier_2_warn", { x: 30 })
    : t("eta_hub.tier_3_warn");

  const isSandbox  = settings?.environment !== "production";
  const isTestMode = settings?.test_mode;

  const ETA_STATUSES: EtaStatus[] = [
    "unsent", "queued", "clearing", "valid",
    "rejected", "buyer_rejected", "cancelled",
  ];

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* ── Header with env badge ──────────────────────────────── */}
      <PageHeader
        title={t("eta_hub.title")}
        alert={isOffline ? <OfflineBanner /> : undefined}
        actions={
          <div className="flex items-center gap-2">
            {isSandbox && (
              <Badge variant="outline" className="text-warning border-warning/50 gap-1">
                <AlertTriangle className="size-3" />
                {t("eta_hub.env_sandbox")}
              </Badge>
            )}
            {!isSandbox && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="size-3" />
                {t("eta_hub.env_prod")}
              </Badge>
            )}
            {isTestMode && isSandbox && (
              <Badge variant="outline" className="text-muted-foreground">
                {t("eta_hub.test_mode")}
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => nav("/sales/settings/eta")}>
              <Settings className="size-4 me-1" />
              {t("eta_hub.settings_link")}
            </Button>
          </div>
        }
      />

      {/* ── KPI row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("eta_hub.kpi_acceptance")}
          value={`${kpis?.acceptance_rate ?? 0}%`}
          tone={
            (kpis?.acceptance_rate ?? 0) >= 95 ? "success" :
            (kpis?.acceptance_rate ?? 0) >= 80 ? "warning" : "danger"
          }
        />
        <StatCard
          label={t("eta_hub.kpi_nearing")}
          value={kpis?.nearing_window ?? 0}
          tone={(kpis?.nearing_window ?? 0) > 0 ? "warning" : "plain"}
        />
        <StatCard
          label={t("eta_hub.kpi_rejected")}
          value={kpis?.rejected ?? 0}
          tone={(kpis?.rejected ?? 0) > 0 ? "danger" : "plain"}
        />
        <StatCard
          label={t("eta_hub.kpi_tier")}
          value={tierLabel}
          tone={tierToneVal}
        />
      </div>

      {/* ── Alerts band ────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 rounded border px-4 py-3 text-sm",
                alert.level === "danger"
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : alert.level === "warning"
                  ? "border-warning/40 bg-warning/5 text-warning"
                  : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {alert.level === "danger"  && <XCircle       className="size-4 mt-0.5 shrink-0" />}
              {alert.level === "warning" && <AlertTriangle className="size-4 mt-0.5 shrink-0" />}
              {alert.level === "info"    && <CheckCircle2  className="size-4 mt-0.5 shrink-0" />}
              <span>{lang === "ar" ? alert.text_ar : alert.text_en}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Queue section ──────────────────────────────────────── */}
      <PageSection
        title={t("eta_hub.queue_title")}
        padded={false}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* B2B / B2C / All tabs */}
            <div className="flex rounded border border-border overflow-hidden text-xs">
              {(["all", "b2b", "b2c"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setQueueTab(tab); setSelection({}); }}
                  className={cn(
                    "px-3 py-1.5 font-medium transition-colors",
                    queueTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {tab === "all"
                    ? t("eta_hub.filter_all_queues")
                    : tab.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={v => { setStatusFilter(v); setSelection({}); }}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("eta_hub.filter_all_statuses")}</SelectItem>
                {ETA_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{t(`eta.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select
              value={typeFilter}
              onValueChange={v => { setTypeFilter(v); setSelection({}); }}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("eta_hub.filter_all_types")}</SelectItem>
                <SelectItem value="invoice">{t("eta_hub.type_invoice")}</SelectItem>
                <SelectItem value="credit_note">{t("eta_hub.type_credit")}</SelectItem>
                <SelectItem value="debit_note">{t("eta_hub.type_debit")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk resend */}
            {canResend && selectedCount > 0 && (
              <Button
                size="sm"
                disabled={resending || resendableInSelection.length === 0}
                onClick={handleBulkResend}
              >
                {resending
                  ? <RefreshCw className="size-3.5 animate-spin me-1" />
                  : <RotateCcw className="size-3.5 me-1" />}
                {t("eta_hub.bulk_resend", { n: resendableInSelection.length })}
              </Button>
            )}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CheckCircle2}
              title={t("eta_hub.all_clear")}
              description={t("eta_hub.no_results")}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {canResend && (
                  <TableHead className="w-10 ps-4">
                    <Checkbox
                      checked={allChecked || (someChecked ? "indeterminate" : false)}
                      onCheckedChange={toggleAll}
                      aria-label="select all"
                    />
                  </TableHead>
                )}
                <TableHead className="ps-4">{t("eta_hub.col_doc")}</TableHead>
                <TableHead>{t("eta_hub.col_type")}</TableHead>
                <TableHead>{t("eta_hub.col_channel")}</TableHead>
                <TableHead>{t("eta_hub.col_customer")}</TableHead>
                <TableHead>{t("eta_hub.col_status")}</TableHead>
                <TableHead>{t("eta_hub.col_window")}</TableHead>
                <TableHead>{t("eta_hub.col_reason")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => {
                const win = (
                  doc.windowRemainingHours !== undefined &&
                  doc.etaStatus === "queued" &&
                  doc.channel === "e-receipt"
                )
                  ? windowInfo(doc.windowRemainingHours, lang)
                  : null;
                const isSelected = Boolean(selection[doc.id]);

                return (
                  <TableRow
                    key={doc.id}
                    className={cn("cursor-pointer", isSelected && "bg-muted/50")}
                    onClick={() => navigateToDoc(doc)}
                  >
                    {canResend && (
                      <TableCell className="ps-4" onClick={e => e.stopPropagation()}>
                        {doc.canResend && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleDoc(doc.id)}
                            aria-label={doc.number}
                          />
                        )}
                      </TableCell>
                    )}

                    {/* Doc number */}
                    <TableCell className="ps-4 font-mono text-sm tabular-nums" dir="ltr">
                      {doc.number}
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <DocTypeBadge type={doc.docType} t={t} />
                    </TableCell>

                    {/* Channel */}
                    <TableCell>
                      {doc.channel ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            doc.channel === "e-invoice"
                              ? "text-brand border-brand/40"
                              : "text-muted-foreground",
                          )}
                        >
                          {doc.channel === "e-invoice" ? "B2B" : "B2C"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Customer */}
                    <TableCell className="text-sm">
                      {customerName(doc.customerId)}
                    </TableCell>

                    {/* Status pill */}
                    <TableCell>
                      <StatusPill
                        variant={ETA_PILL[doc.etaStatus]}
                        label={t(`eta.${doc.etaStatus}`)}
                      />
                    </TableCell>

                    {/* B2C window countdown */}
                    <TableCell>
                      {win ? (
                        <span
                          className={cn("tabular-nums text-sm", windowToneClass[win.tone])}
                          dir="ltr"
                        >
                          {win.text}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Plain-Arabic rejection reason — never raw codes */}
                    <TableCell className="max-w-48">
                      {doc.reasonAr ? (
                        <span
                          className="text-xs text-destructive truncate block"
                          title={doc.reasonAr}
                        >
                          {doc.reasonAr}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Row resend action */}
                    <TableCell onClick={e => e.stopPropagation()}>
                      {canResend && doc.canResend && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          title={t("eta_hub.resend_action")}
                          onClick={() => handleResendOne(doc)}
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Footer row count */}
        {filtered.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground tabular-nums">
            {filtered.length} {lang === "ar" ? "مستند" : "document(s)"}
            {selectedCount > 0 && (
              <span className="ms-2 text-primary font-medium">
                · {t("eta_hub.n_selected", { n: selectedCount })}
              </span>
            )}
          </div>
        )}
      </PageSection>

      {/* ── Top rejection reasons ───────────────────────────────── */}
      {reasons.length > 0 && (
        <PageSection title={t("eta_hub.rejection_reasons_title")}>
          <div className="divide-y">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-foreground">
                  {lang === "ar" ? r.reason_ar : r.reason_en}
                </span>
                <Badge variant="outline" className="tabular-nums text-destructive border-destructive/40">
                  {r.count}
                </Badge>
              </div>
            ))}
          </div>
        </PageSection>
      )}

      {/* ── E-seal + ETA portal ────────────────────────────────── */}
      {settings && (
        <PageSection
          title={t("eta_hub.eseal_title")}
          actions={
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 text-muted-foreground"
              onClick={() => window.open("https://invoicing.eta.gov.eg", "_blank")}
            >
              <ExternalLink className="size-3.5" />
              {t("eta_hub.eta_portal")}
            </Button>
          }
        >
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex items-center justify-center rounded p-3",
              settings.eseal.configured
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}>
              <ShieldCheck className="size-6" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="font-medium text-sm">
                {settings.eseal.configured
                  ? t("eta_hub.eseal_ok")
                  : t("eta_hub.eseal_missing")}
              </p>
              {settings.eseal.configured && (
                <>
                  <p className="text-xs text-muted-foreground">{settings.eseal.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("eta_hub.eseal_expires")}: {settings.eseal.expires}
                  </p>
                </>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => nav("/sales/settings/eta")}
            >
              <Settings className="size-3.5 me-1.5" />
              {t("eta_hub.settings_link")}
            </Button>
          </div>
        </PageSection>
      )}
    </div>
  );
}
