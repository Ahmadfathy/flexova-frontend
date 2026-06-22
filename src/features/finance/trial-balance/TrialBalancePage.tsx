import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Badge }   from "@/components/ui/badge";
import { Label }   from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFinanceData } from "../data/useFinanceData";

export function TrialBalancePage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useFinanceData();

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("trial_balance.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 px-4 py-2.5 border-b border-border"
              style={{ opacity: 1 - i * 0.1 }}>
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-36 col-span-2" />
              <Skeleton className="h-3.5 w-20 ms-auto" />
              <Skeleton className="h-3.5 w-20 ms-auto" />
              <Skeleton className="h-3.5 w-24 ms-auto" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("trial_balance.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const tb       = data!.trialBalance;
  const coa      = data!.chartOfAccounts;
  const periods  = data!.fiscalPeriods;
  const coaMap   = new Map(coa.map(a => [a.code, a]));

  const { rows, totals, period } = tb;
  const currentPeriod = periods.find(p => p.id === period);
  const periodLabel   = currentPeriod
    ? `${currentPeriod.year}-${String(currentPeriod.month).padStart(2, "0")}`
    : period;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("trial_balance.title")}
        actions={
          <div className="flex items-center gap-2">
            {totals.balanced
              ? (
                <Badge className="gap-1 bg-success/10 text-success border-success/20 hover:bg-success/10">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("trial_balance.balanced_badge")}
                </Badge>
              )
              : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  {t("trial_balance.unbalanced_badge")}
                </Badge>
              )
            }
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">{t("trial_balance.period_label")}</Label>
              <Select value={period}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.year}-{String(p.month).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      {isOffline && <OfflineBanner />}

      <PageSection padded={false}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-16">
                  {t("trial_balance.col_code")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("trial_balance.col_name")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-end">
                  {t("trial_balance.col_opening")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-end">
                  {t("trial_balance.col_dr")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-end">
                  {t("trial_balance.col_cr")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-end">
                  {t("trial_balance.col_closing")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => {
                const account = coaMap.get(row.account);
                const name    = account ? (lang === "ar" ? account.name_ar : account.name_en) : row.account;
                const isCredit = ["2","3","4"].includes(row.account[0]);
                return (
                  <TableRow key={row.account} className="border-b border-border last:border-0">
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.account}</TableCell>
                    <TableCell className="text-sm">{name}</TableCell>
                    <TableCell className="text-end tabular-nums text-sm text-muted-foreground">
                      {formatMoney(row.opening, lang)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-end tabular-nums text-sm",
                      row.dr > 0 ? "font-medium" : "text-muted-foreground",
                    )}>
                      {row.dr > 0 ? formatMoney(row.dr, lang) : "—"}
                    </TableCell>
                    <TableCell className={cn(
                      "text-end tabular-nums text-sm",
                      row.cr > 0 ? "font-medium" : "text-muted-foreground",
                    )}>
                      {row.cr > 0 ? formatMoney(row.cr, lang) : "—"}
                    </TableCell>
                    <TableCell className={cn(
                      "text-end tabular-nums font-semibold text-sm",
                      row.closing < 0 ? "text-danger" : "",
                    )}>
                      {formatMoney(row.closing, lang)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/30">
                <TableCell colSpan={2} className="font-semibold text-sm">
                  {t("trial_balance.totals")}
                </TableCell>
                <TableCell className="text-end tabular-nums font-semibold" />
                <TableCell className="text-end tabular-nums font-semibold">
                  {formatMoney(totals.dr, lang)}
                </TableCell>
                <TableCell className="text-end tabular-nums font-semibold">
                  {formatMoney(totals.cr, lang)}
                </TableCell>
                <TableCell className={cn(
                  "text-end tabular-nums font-bold",
                  totals.balanced ? "text-success" : "text-danger",
                )}>
                  {totals.balanced ? "✓" : `Δ ${formatMoney(Math.abs(totals.dr - totals.cr), lang)}`}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </PageSection>
    </div>
  );
}
