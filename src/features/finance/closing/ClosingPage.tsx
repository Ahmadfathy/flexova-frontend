import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock, LockOpen, Loader2, CalendarClock } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { Alert }         from "@/components/ui/alert";

import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { useFinanceData, type FiscalPeriod } from "../data/useFinanceData";

function periodLabel(p: FiscalPeriod, lang: "ar" | "en") {
  const m = new Date(p.year, p.month - 1, 1)
    .toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { month: "long", year: "numeric" });
  return m;
}

export function ClosingPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useFinanceData();

  const [pendingPeriod, setPending] = useState<{ period: FiscalPeriod; action: "close" | "reopen" } | null>(null);
  const [saving, setSaving]         = useState(false);

  async function handleConfirm() {
    if (!pendingPeriod) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setPending(null);
    toast.success(
      pendingPeriod.action === "close" ? t("closing.closed_toast") : t("closing.reopened_toast"),
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("closing.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border"
              style={{ opacity: 1 - i * 0.3 }}>
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded ms-auto" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("closing.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const periods = data!.fiscalPeriods;

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader title={t("closing.title")} />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>
          {periods.length === 0 ? (
            <EmptyState icon={CalendarClock} title={t("closing.title")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {["col_period","col_status","col_type"].map(k => (
                    <TableHead key={k} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(`closing.${k}` as Parameters<typeof t>[0])}
                    </TableHead>
                  ))}
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map(p => {
                  const label = periodLabel(p, lang);
                  const isClosed = p.status === "closed";
                  return (
                    <TableRow key={p.id} className="border-b border-border last:border-0">
                      <TableCell className="font-medium text-sm">{label}</TableCell>
                      <TableCell>
                        <StatusPill
                          variant={isClosed ? "inactive" : "approved"}
                          label={isClosed ? t("closing.status_closed") : t("closing.status_open")}
                        />
                      </TableCell>
                      <TableCell>
                        {p.close_type ? (
                          <Badge variant="outline" className="text-xs font-normal">
                            {t(p.close_type === "soft" ? "closing.close_type_soft" : "closing.close_type_hard")}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {isClosed ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-warning border-warning/30 hover:bg-warning/5"
                            onClick={() => setPending({ period: p, action: "reopen" })}
                          >
                            <LockOpen className="h-3.5 w-3.5" />
                            {t("closing.action_reopen")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setPending({ period: p, action: "close" })}
                          >
                            <Lock className="h-3.5 w-3.5" />
                            {t("closing.action_close")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      </div>

      <ConfirmDialog
        open={pendingPeriod !== null}
        onOpenChange={o => !o && !saving && setPending(null)}
        title={pendingPeriod?.action === "close"
          ? t("closing.confirm_close")
          : t("closing.confirm_reopen")
        }
        confirmTone={pendingPeriod?.action === "reopen" ? "warning" : "primary"}
        confirmLabel={
          <>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {pendingPeriod?.action === "close" ? t("closing.action_close") : t("closing.action_reopen")}
          </>
        }
        cancelLabel={lang === "ar" ? "إلغاء" : "Cancel"}
        onConfirm={handleConfirm}
        loading={saving}
      >
        {pendingPeriod?.action === "reopen" && (
          <Alert variant="warning">{t("closing.reopen_warning")}</Alert>
        )}
        {pendingPeriod && (
          <p className="text-sm text-muted-foreground">
            {t("closing.confirm_body", { period: periodLabel(pendingPeriod.period, lang) })}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
