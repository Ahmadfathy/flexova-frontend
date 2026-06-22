import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Printer, CheckCircle2, XCircle } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { cn }     from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { useReportsData } from "../data/useReportsData";

// ── Main page ─────────────────────────────────────────────────────

export function ZReportPage() {
  const { t, i18n } = useTranslation("reports");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useReportsData();

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("z_report.title")} />
        <div className="grid grid-cols-2 gap-4 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-5 space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("z_report.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const z = data!.zReportSample;

  function handlePrint() {
    toast.success(t("z_report.printed_toast"));
  }

  const variance = z.variance ?? (z.actual_cash - z.expected_cash);

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title={t("z_report.title")}
        actions={
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 me-1.5" />
            {t("z_report.print_btn")}
          </Button>
        }
      />

      {isOffline && <OfflineBanner />}

      {/* Shift info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4">
        {[
          { label: "shift_label",   value: z.shift_id },
          { label: "cashier_label", value: z.cashier },
          { label: "opened_label",  value: formatDate(z.opened) },
          { label: "closed_label",  value: formatDate(z.closed) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t(`z_report.${label}` as Parameters<typeof t>[0])}</p>
            <p className="font-medium text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* Sales total */}
      <div className="px-4">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-center justify-between">
          <p className="text-sm font-semibold">{t("z_report.sales_total")}</p>
          <p className="text-2xl font-bold tabular-nums">{formatMoney(z.sales_total, lang)}</p>
        </div>
      </div>

      {/* Payment breakdown */}
      <PageSection title={t("z_report.payment_title")} padded>
        <div className="space-y-2">
          {(z.payment_breakdown ?? []).map(pb => (
            <div key={pb.method} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{pb.method}</span>
              <span className="tabular-nums text-sm font-medium">{formatMoney(pb.amount, lang)}</span>
            </div>
          ))}
        </div>
      </PageSection>

      {/* Cash reconciliation */}
      <PageSection title={t("z_report.cash_title")} padded>
        <div className="space-y-3">
          {[
            { label: "expected", value: z.expected_cash, className: "" },
            { label: "actual",   value: z.actual_cash,  className: "" },
            { label: "variance", value: variance, className: variance === 0 ? "text-success" : variance < 0 ? "text-danger" : "text-success" },
          ].map(({ label, value, className }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{t(`z_report.${label}` as Parameters<typeof t>[0])}</span>
              <span className={cn("tabular-nums text-sm font-semibold", className)}>
                {variance < 0 && label === "variance" ? "-" : ""}
                {formatMoney(Math.abs(value), lang)}
              </span>
            </div>
          ))}

          {/* Sync indicator */}
          <div className="flex items-center gap-1.5 pt-1">
            {z.sync_state === "synced"
              ? <CheckCircle2 className="h-4 w-4 text-success" />
              : <XCircle      className="h-4 w-4 text-muted-foreground" />
            }
            <span className="text-xs text-muted-foreground">
              {z.sync_state === "synced" ? t("z_report.synced") : t("z_report.not_synced")}
            </span>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
