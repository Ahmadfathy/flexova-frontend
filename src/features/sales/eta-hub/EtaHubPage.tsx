import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { StatCard }      from "@/components/patterns/StatCard";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";

import {
  CheckCircle2, AlertTriangle, Clock, XCircle, ShieldCheck, ExternalLink,
} from "lucide-react";

import { useSalesData } from "@/features/sales/invoices/useSalesData";
import { cn } from "@/lib/utils";

export function EtaHubPage() {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const nav  = useNavigate();

  const { data, loading, error, isOffline, reload } = useSalesData();

  if (loading) return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );

  if (error) return <ErrorState description={error} onRetry={reload} />;

  const hub      = data?.etaHub;
  const settings = data?.etaSettings;
  const invoices = data?.invoices ?? [];

  const kpis     = hub?.kpis;
  const alerts   = hub?.alerts   ?? [];
  const reasons  = hub?.top_rejection_reasons ?? [];

  // counts derived from live invoices
  const nearing  = invoices.filter(inv => inv.eta_status === "queued" && inv._flag === "nearing_window");
  const rejected = invoices.filter(inv => inv.eta_status === "rejected" || inv.eta_status === "buyer_rejected");
  const clearing = invoices.filter(inv => inv.eta_status === "clearing");

  return (
    <div className="space-y-6">
      {isOffline && <OfflineBanner />}

      <PageHeader title={t("eta_hub.title")} />

      {/* ── Settings summary strip ─────────────────────────────── */}
      {settings && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground border rounded-lg px-4 py-3 bg-muted/30">
          <span className="font-medium text-foreground">{settings.trn}</span>
          <span>·</span>
          <span>{lang === "ar" ? settings.activity_ar : settings.activity_en}</span>
          <span>·</span>
          <Badge variant={settings.environment === "production" ? "default" : "secondary"} className="text-xs">
            {settings.environment === "production" ? t("eta_hub.env_prod") : t("eta_hub.env_sandbox")}
          </Badge>
          {settings.test_mode && (
            <Badge variant="outline" className="text-xs text-warning border-warning">
              {t("eta_hub.test_mode")}
            </Badge>
          )}
          <span className="ms-auto">
            {t("eta_hub.eseal")}: {settings.eseal.configured
              ? <span className="text-success font-medium">{t("eta_hub.eseal_ok")}</span>
              : <span className="text-danger font-medium">{t("eta_hub.eseal_missing")}</span>
            }
          </span>
        </div>
      )}

      {/* ── KPI cards ──────────────────────────────────────────── */}
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
          value={`Tier ${kpis?.compliance_tier ?? 1}`}
          tone="success"
        />
      </div>

      {/* ── Alerts ─────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <PageSection title={t("eta_hub.alerts_title")}>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3",
                  alert.level === "danger"  && "border-destructive/40 bg-destructive/5",
                  alert.level === "warning" && "border-warning/40 bg-warning/5",
                  alert.level === "info"    && "border-blue-200 bg-blue-50",
                )}
              >
                {alert.level === "danger"  && <XCircle       className="size-4 mt-0.5 shrink-0 text-destructive" />}
                {alert.level === "warning" && <AlertTriangle className="size-4 mt-0.5 shrink-0 text-warning" />}
                {alert.level === "info"    && <CheckCircle2  className="size-4 mt-0.5 shrink-0 text-blue-500" />}
                <p className="text-sm">
                  {lang === "ar" ? alert.text_ar : alert.text_en}
                </p>
              </div>
            ))}
          </div>
        </PageSection>
      )}

      {/* ── Documents needing attention ──────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Nearing window */}
        <PageSection
          title={t("eta_hub.nearing_title")}
          actions={
            nearing.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => nav("/sales/invoices")}>
                {t("eta_hub.view_all")}
              </Button>
            ) : undefined
          }
        >
          {nearing.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <CheckCircle2 className="size-4 shrink-0 text-success" />
              {t("eta_hub.none_nearing")}
            </div>
          ) : (
            <div className="space-y-2">
              {nearing.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3 rounded-md border border-warning/30 bg-warning/5 cursor-pointer hover:bg-warning/10 transition-colors"
                  onClick={() => nav(`/sales/invoices/${inv.id}`)}
                >
                  <Clock className="size-4 shrink-0 text-warning" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono" dir="ltr">{inv.number}</p>
                    {inv.eta.window_remaining_hours !== undefined && (
                      <p className="text-xs text-warning">
                        {t("issued.queued_deadline", { h: inv.eta.window_remaining_hours })}
                      </p>
                    )}
                  </div>
                  <StatusPill variant="pending" label={t("eta.queued")} />
                </div>
              ))}
            </div>
          )}
        </PageSection>

        {/* Rejected docs */}
        <PageSection
          title={t("eta_hub.rejected_title")}
          actions={
            rejected.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => nav("/sales/invoices")}>
                {t("eta_hub.view_all")}
              </Button>
            ) : undefined
          }
        >
          {rejected.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <CheckCircle2 className="size-4 shrink-0 text-success" />
              {t("eta_hub.none_rejected")}
            </div>
          ) : (
            <div className="space-y-2">
              {rejected.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3 rounded-md border border-destructive/30 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                  onClick={() => nav(`/sales/invoices/${inv.id}`)}
                >
                  <XCircle className="size-4 shrink-0 text-destructive" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono" dir="ltr">{inv.number}</p>
                    {inv.eta.reason_ar && (
                      <p className="text-xs text-muted-foreground truncate">
                        {lang === "ar" ? inv.eta.reason_ar : inv.eta.reason_en}
                      </p>
                    )}
                  </div>
                  <StatusPill variant="rejected" label={t(`eta.${inv.eta_status}`)} />
                </div>
              ))}
            </div>
          )}
        </PageSection>

      </div>

      {/* ── Clearing (B2B pending ETA) ───────────────────────── */}
      {clearing.length > 0 && (
        <PageSection title={t("eta_hub.clearing_title")}>
          <div className="space-y-2">
            {clearing.map(inv => (
              <div
                key={inv.id}
                className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => nav(`/sales/invoices/${inv.id}`)}
              >
                <Clock className="size-4 shrink-0 text-brand" />
                <p className="text-sm font-mono flex-1" dir="ltr">{inv.number}</p>
                {inv.eta.submitted_at && (
                  <p className="text-xs text-muted-foreground">
                    {inv.eta.note_ar && lang === "ar" ? inv.eta.note_ar : inv.eta.note_en}
                  </p>
                )}
                <StatusPill variant="active" label={t("eta.clearing")} />
              </div>
            ))}
          </div>
        </PageSection>
      )}

      {/* ── Top rejection reasons ────────────────────────────── */}
      {reasons.length > 0 && (
        <PageSection title={t("eta_hub.rejection_reasons_title")}>
          <div className="divide-y">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">
                  {lang === "ar" ? r.reason_ar : r.reason_en}
                </span>
                <Badge variant="secondary">{r.count}</Badge>
              </div>
            ))}
          </div>
        </PageSection>
      )}

      {/* ── E-seal status ────────────────────────────────────── */}
      {settings && (
        <PageSection title={t("eta_hub.eseal_title")}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex items-center justify-center rounded-lg p-3",
              settings.eseal.configured ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}>
              <ShieldCheck className="size-6" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="font-medium text-sm">
                {settings.eseal.configured ? t("eta_hub.eseal_ok") : t("eta_hub.eseal_missing")}
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
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => window.open("https://invoicing.eta.gov.eg", "_blank")}
            >
              <ExternalLink className="size-3.5 me-1.5" />
              {t("eta_hub.eta_portal")}
            </Button>
          </div>
        </PageSection>
      )}
    </div>
  );
}
