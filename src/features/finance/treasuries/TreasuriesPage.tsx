import { useTranslation } from "react-i18next";
import { Plus, Banknote, Building2, Smartphone } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";

import { formatMoney } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import { useFinanceData } from "../data/useFinanceData";

type TreasuryType = "cash" | "bank" | "wallet";

function typeIcon(type: TreasuryType) {
  if (type === "bank")   return Building2;
  if (type === "wallet") return Smartphone;
  return Banknote;
}

export function TreasuriesPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useFinanceData();
  const openCreate = useCreateDispatcher(s => s.openCreate);

  const totalBalance = (data?.treasuries ?? []).reduce((s, tr) => s + tr.balance, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("treasuries.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-40" />
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
        <PageHeader title={t("treasuries.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const treasuries = data!.treasuries;

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("treasuries.title")}
          count={t("treasuries.count", { n: treasuries.length })}
          actions={
            can("finance.treasury.create") ? (
              <Button size="sm" onClick={() => openCreate("new_treasury")}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("treasuries.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>
          {treasuries.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title={t("treasuries.no_treasuries")}
              description={t("treasuries.empty_sub")}
              action={can("finance.treasury.create")
                ? { label: t("treasuries.new"), onClick: () => openCreate("new_treasury") }
                : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("treasuries.col_name")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("treasuries.col_type")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("treasuries.col_account_no")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("treasuries.col_balance")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treasuries.map(tr => {
                  const name = lang === "ar" ? tr.name_ar : tr.name_en;
                  const Icon = typeIcon(tr.type);
                  const typeKey = `treasuries.type_${tr.type}` as Parameters<typeof t>[0];
                  return (
                    <TableRow key={tr.id} className="border-b border-border last:border-0">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="rounded bg-muted p-1.5">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-sm">{name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {t(typeKey)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {tr.account_no ?? "—"}
                      </TableCell>
                      <TableCell className="text-start tabular-nums font-semibold">
                        {formatMoney(tr.balance, lang)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total row */}
                <TableRow className="bg-muted/30 hover:bg-muted/30 font-semibold">
                  <TableCell colSpan={3} className="text-sm">
                    {t("treasuries.total_balance")}
                  </TableCell>
                  <TableCell className="text-start tabular-nums text-success font-bold">
                    {formatMoney(totalBalance, lang)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </PageSection>
      </div>
    </>
  );
}
