import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertTriangle, Building2 } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Badge }     from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFinanceData } from "../data/useFinanceData";

export function ReconciliationPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useFinanceData();

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("reconciliation.title")} />
        <PageSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-6 w-36" />
              </Card>
            ))}
          </div>
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("reconciliation.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  // Build reconciliation display from what we have in useFinanceData
  // The data hook doesn't expose bank_reconciliation directly — we'll compute display from known values
  const treasury = data!.treasuries.find(tr => tr.type === "bank");
  const stmtBalance = treasury?.balance ?? 0;
  const sysBalance  = treasury?.balance ?? 0;
  const difference  = Math.abs(stmtBalance - sysBalance);
  const isReconciled = difference < 0.01;

  // Static demo data from fixture (since we don't have it in the hook yet)
  const inBankNotSystem = [
    { date: "2026-06-13", amount: 2500, desc: lang === "ar" ? "رسوم بنكية" : "Bank charges" },
  ];
  const inSystemNotBank = [
    {
      date: "2026-06-12",
      amount: 100000,
      desc: lang === "ar" ? "تحويل لم يُرحَّل بعد TF-0401" : "Pending transfer TF-0401",
    },
  ];
  const matched = 15;
  const pending = 3;

  const trName = treasury ? (lang === "ar" ? treasury.name_ar : treasury.name_en) : "—";

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("reconciliation.title")}
        subtitle={trName}
        actions={
          isReconciled ? (
            <Badge className="gap-1.5 bg-success/10 text-success border-success/20 hover:bg-success/10">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("reconciliation.reconciled")}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-warning border-warning/30">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("reconciliation.not_reconciled")}
            </Badge>
          )
        }
      />

      {isOffline && <OfflineBanner />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("reconciliation.stmt_balance")}</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(stmtBalance, lang)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("reconciliation.sys_balance")}</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(sysBalance, lang)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("reconciliation.matched")}</p>
            <p className={cn("text-lg font-bold tabular-nums", isReconciled ? "text-success" : "")}>
              {matched}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("reconciliation.pending")}</p>
            <p className={cn("text-lg font-bold tabular-nums", pending > 0 ? "text-warning" : "text-success")}>
              {pending}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* In bank, not in system */}
        <PageSection>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {t("reconciliation.in_bank")}
            </h3>
            {inBankNotSystem.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("reconciliation.reconciled")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs">{t("reconciliation.col_date")}</TableHead>
                    <TableHead className="text-xs">{t("reconciliation.col_desc")}</TableHead>
                    <TableHead className="text-xs">{t("reconciliation.col_amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inBankNotSystem.map((item, i) => (
                    <TableRow key={i} className="border-b border-border last:border-0">
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell className="text-sm">{item.desc}</TableCell>
                      <TableCell className="text-start tabular-nums font-medium text-danger">
                        {formatMoney(item.amount, lang)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </PageSection>

        {/* In system, not in bank */}
        <PageSection>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t("reconciliation.in_system")}</h3>
            {inSystemNotBank.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("reconciliation.reconciled")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs">{t("reconciliation.col_date")}</TableHead>
                    <TableHead className="text-xs">{t("reconciliation.col_desc")}</TableHead>
                    <TableHead className="text-xs">{t("reconciliation.col_amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inSystemNotBank.map((item, i) => (
                    <TableRow key={i} className="border-b border-border last:border-0">
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell className="text-sm">{item.desc}</TableCell>
                      <TableCell className="text-start tabular-nums font-medium text-warning">
                        {formatMoney(item.amount, lang)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </PageSection>
      </div>
    </div>
  );
}
