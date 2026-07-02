import { useTranslation } from "react-i18next";
import { XCircle, Clock3, CheckCircle2 } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { cn }          from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useReportsData, type EtaQueueItem } from "../data/useReportsData";

// ── Status icon helper ────────────────────────────────────────────

function StatusIcon({ status }: { status: EtaQueueItem["status"] }) {
  if (status === "clearing")  return <Clock3    className="h-3.5 w-3.5 text-warning" />;
  if (status === "rejected")  return <XCircle   className="h-3.5 w-3.5 text-danger" />;
  if (status === "accepted")  return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  return <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />;
}

function statusBadge(
  status: EtaQueueItem["status"],
  t: ReturnType<typeof useTranslation<"reports">>["t"],
) {
  const label = t(`eta_tax.status_${status}` as Parameters<typeof t>[0]);
  const variant: Record<string, string> = {
    clearing: "bg-warning/10 text-warning border-warning/30",
    rejected: "bg-danger/10 text-danger border-danger/30",
    accepted: "bg-success/10 text-success border-success/30",
    queued:   "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
      variant[status] ?? "bg-muted text-muted-foreground",
    )}>
      <StatusIcon status={status} />
      {label}
    </span>
  );
}

// ── Queue table ───────────────────────────────────────────────────

function QueueTable({
  items, lang, t,
}: {
  items: EtaQueueItem[];
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"reports">>["t"];
}) {
  if (!items.length) return null;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {["col_doc","col_customer","col_value","col_status","col_reason","col_window"].map(k => (
              <TableHead key={k} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`eta_tax.${k}` as Parameters<typeof t>[0])}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => (
            <TableRow key={i} className="border-b border-border last:border-0">
              <TableCell className="font-mono text-xs">{item.doc}</TableCell>
              <TableCell className="text-sm">{item.customer ?? "—"}</TableCell>
              <TableCell className="tabular-nums text-sm">{formatMoney(item.value, lang)}</TableCell>
              <TableCell>{statusBadge(item.status, t)}</TableCell>
              <TableCell className="text-xs text-danger max-w-48 truncate">
                {item.reason_ar ?? "—"}
              </TableCell>
              <TableCell className="text-xs tabular-nums">
                {item.window_remaining_hours !== undefined
                  ? t("eta_tax.hours_left", { n: item.window_remaining_hours })
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function EtaTaxPage() {
  const { t, i18n } = useTranslation("reports");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useReportsData();

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("eta_tax.title")} />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-sm bg-card shadow-sm p-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-56" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("eta_tax.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const eta      = data!.etaTaxDashboard;
  const vat      = eta.vat_return;
  const isRefund = vat.net < 0;

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title={t("eta_tax.title")}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={eta.environment === "production" ? "default" : "secondary"} className="text-xs">
              {eta.environment === "production" ? t("eta_tax.env_prod") : t("eta_tax.env_sandbox")}
            </Badge>
            {eta.test_mode && (
              <Badge variant="outline" className="text-xs text-warning border-warning/40">
                {t("eta_tax.test_mode")}
              </Badge>
            )}
          </div>
        }
      />

      {isOffline && <OfflineBanner />}

      {/* VAT return summary */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("eta_tax.vat_title")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "vat_payable",    value: vat.vat_payable,    danger: false },
            { label: "vat_deductible", value: vat.vat_deductible, danger: false },
            { label: isRefund ? "vat_refund" : "vat_due", value: Math.abs(vat.net), danger: !isRefund },
          ].map(({ label, value, danger }) => (
            <div key={label} className="rounded-sm bg-card shadow-sm p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{t(`eta_tax.${label}` as Parameters<typeof t>[0])}</p>
              <p className={cn("text-lg font-bold tabular-nums", danger ? "text-danger" : isRefund && label !== "vat_payable" && label !== "vat_deductible" ? "text-success" : "")}>
                {formatMoney(value, lang)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* B2B queue */}
      <PageSection title={t("eta_tax.b2b_title")} padded>
        <QueueTable items={eta.b2b_queue ?? []} lang={lang} t={t} />
      </PageSection>

      {/* B2C queue */}
      <PageSection title={t("eta_tax.b2c_title")} padded>
        <QueueTable items={eta.b2c_queue ?? []} lang={lang} t={t} />
      </PageSection>
    </div>
  );
}
