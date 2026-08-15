import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ArrowRight, ArrowLeft, ArrowLeftRight } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }    from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import { useFinanceData } from "../data/useFinanceData";

export function TransfersPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useFinanceData();
  const openCreate = useCreateDispatcher(s => s.openCreate);

  const allTransfers = data?.transfers ?? [];

  const trMap = useMemo(
    () => Object.fromEntries((data?.treasuries ?? []).map(tr => [tr.id, tr])),
    [data?.treasuries],
  );

  const ArrowIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("transfers.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border"
              style={{ opacity: 1 - i * 0.25 }}>
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-4 w-24 ms-auto" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("transfers.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("transfers.title")}
          count={t("transfers.count", { n: allTransfers.length })}
          actions={
            can("finance.transfer.create") ? (
              <Button size="sm" onClick={() => openCreate("new_fin_transfer")}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("transfers.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>
          {allTransfers.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title={t("transfers.no_transfers")}
              description={t("transfers.empty_sub")}
              action={can("finance.transfer.create")
                ? { label: t("transfers.new"), onClick: () => openCreate("new_fin_transfer") }
                : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {["col_number","col_date","col_from","col_to","col_amount","col_memo"].map(k => (
                    <TableHead key={k} className={cn(
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                            )}>
                      {t(`transfers.${k}` as Parameters<typeof t>[0])}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTransfers.map(tf => {
                  const fromTr = trMap[tf.from];
                  const toTr   = trMap[tf.to];
                  const fromName = fromTr ? (lang === "ar" ? fromTr.name_ar : fromTr.name_en) : tf.from;
                  const toName   = toTr   ? (lang === "ar" ? toTr.name_ar   : toTr.name_en)   : tf.to;
                  return (
                    <TableRow key={tf.id} className="border-b border-border last:border-0">
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {tf.number}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatDate(tf.date)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{fromName}</TableCell>
                      <TableCell>
                        <ArrowIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{toName}</TableCell>
                      <TableCell className="text-start tabular-nums font-medium">
                        {formatMoney(tf.amount, lang)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tf.memo ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      </div>
    </>
  );
}
