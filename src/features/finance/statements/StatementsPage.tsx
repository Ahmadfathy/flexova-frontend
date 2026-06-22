import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFinanceData, type CoaAccount } from "../data/useFinanceData";

// ── Derived financials ────────────────────────────────────────────

function sumRoot(accounts: CoaAccount[], root: string): number {
  return accounts
    .filter(a => a.type === "account" && a.code.startsWith(root) && a.balance !== undefined)
    .reduce((s, a) => s + (a.balance ?? 0), 0);
}

// ── Statement row ─────────────────────────────────────────────────

function StatRow({
  label, amount, lang, bold, indent, separator, highlight,
}: {
  label: string;
  amount?: number;
  lang: "ar" | "en";
  bold?: boolean;
  indent?: number;
  separator?: boolean;
  highlight?: "profit" | "loss";
}) {
  return (
    <>
      {separator && <Separator className="my-1" />}
      <div
        className={cn(
          "flex items-center justify-between py-2",
          indent === 1 && "ps-4",
          indent === 2 && "ps-8",
        )}
        style={{ paddingInlineStart: indent ? `${indent * 16}px` : undefined }}
      >
        <span className={cn("text-sm", bold && "font-semibold", !bold && "text-muted-foreground")}>
          {label}
        </span>
        {amount !== undefined && (
          <span className={cn(
            "tabular-nums text-sm",
            bold && "font-semibold",
            highlight === "profit" && amount >= 0 && "text-success font-bold",
            highlight === "loss"   && amount < 0  && "text-danger font-bold",
            highlight === "profit" && amount < 0  && "text-danger font-bold",
          )}>
            {formatMoney(amount, lang)}
          </span>
        )}
      </div>
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex justify-between" style={{ paddingInlineStart: (i % 3) * 16 }}>
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function StatementsPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useFinanceData();

  const financials = useMemo(() => {
    if (!data) return null;
    const coa = data.chartOfAccounts;

    // Income statement
    const revenue       = sumRoot(coa, "4");
    const cogs          = sumRoot(coa, "5100") + (coa.find(a => a.code === "5100")?.balance ?? 0) - (coa.find(a => a.code === "5100")?.balance ?? 0);
    const cogsAcc       = coa.find(a => a.code === "5100")?.balance ?? 0;
    const grossProfit   = revenue - cogsAcc;
    const opExpenses    = coa
      .filter(a => a.type === "account" && a.code.startsWith("5") && a.code !== "5100" && a.balance !== undefined)
      .reduce((s, a) => s + (a.balance ?? 0), 0);
    const netProfit     = grossProfit - opExpenses;

    // Balance sheet — assets
    const assets        = coa.filter(a => a.type === "account" && a.code.startsWith("1") && a.balance !== undefined);
    const totalAssets   = assets.reduce((s, a) => s + (a.balance ?? 0), 0);

    // Liabilities
    const liabilities   = coa.filter(a => a.type === "account" && a.code.startsWith("2") && a.balance !== undefined);
    const totalLiab     = liabilities.reduce((s, a) => s + (a.balance ?? 0), 0);

    // Equity
    const equity        = coa.filter(a => a.type === "account" && a.code.startsWith("3") && a.balance !== undefined);
    const totalEquity   = equity.reduce((s, a) => s + (a.balance ?? 0), 0) + netProfit;

    return {
      revenue, cogsAcc, grossProfit, opExpenses, netProfit,
      assets, totalAssets,
      liabilities, totalLiab,
      equity, totalEquity,
      totalLiabEq: totalLiab + totalEquity,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("statements.title")} />
        <PageSection><StatSkeleton /></PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("statements.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const fin = financials!;
  const coa = data!.chartOfAccounts;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={t("statements.title")} />

      {isOffline && <OfflineBanner />}

      <Tabs defaultValue="income">
        <TabsList className="mb-4">
          <TabsTrigger value="income">{t("statements.tab_income")}</TabsTrigger>
          <TabsTrigger value="balance">{t("statements.tab_balance")}</TabsTrigger>
        </TabsList>

        {/* ── Income statement ───────────────────────────────── */}
        <TabsContent value="income">
          <PageSection>
            <div className="max-w-lg">
              <StatRow label={t("statements.revenue")} amount={fin.revenue} lang={lang} bold />
              <StatRow label={t("statements.cogs")} amount={-fin.cogsAcc} lang={lang} indent={1} />
              <StatRow label={t("statements.gross_profit")} amount={fin.grossProfit} lang={lang} bold separator />

              <div className="mt-1">
                <StatRow label={t("statements.operating_exp")} lang={lang} bold />
                {coa
                  .filter(a => a.type === "account" && a.code.startsWith("5") && a.code !== "5100" && a.balance !== undefined)
                  .map(a => (
                    <StatRow
                      key={a.code}
                      label={lang === "ar" ? a.name_ar : a.name_en}
                      amount={-a.balance!}
                      lang={lang}
                      indent={1}
                    />
                  ))
                }
              </div>

              <StatRow
                label={t("statements.net_profit")}
                amount={fin.netProfit}
                lang={lang}
                bold
                separator
                highlight="profit"
              />
            </div>
          </PageSection>
        </TabsContent>

        {/* ── Balance sheet ──────────────────────────────────── */}
        <TabsContent value="balance">
          <PageSection>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-3xl">
              {/* Assets */}
              <div>
                <StatRow label={t("statements.assets")} lang={lang} bold />
                {fin.assets.map(a => (
                  <StatRow
                    key={a.code}
                    label={`${a.code} — ${lang === "ar" ? a.name_ar : a.name_en}`}
                    amount={a.balance!}
                    lang={lang}
                    indent={1}
                  />
                ))}
                <StatRow label={t("statements.assets")} amount={fin.totalAssets} lang={lang} bold separator />
              </div>

              {/* Liabilities + Equity */}
              <div>
                <StatRow label={t("statements.liabilities")} lang={lang} bold />
                {fin.liabilities.map(a => (
                  <StatRow
                    key={a.code}
                    label={`${a.code} — ${lang === "ar" ? a.name_ar : a.name_en}`}
                    amount={a.balance!}
                    lang={lang}
                    indent={1}
                  />
                ))}
                <Separator className="my-1" />

                <StatRow label={t("statements.equity")} lang={lang} bold />
                {fin.equity.map(a => (
                  <StatRow
                    key={a.code}
                    label={`${a.code} — ${lang === "ar" ? a.name_ar : a.name_en}`}
                    amount={a.balance!}
                    lang={lang}
                    indent={1}
                  />
                ))}
                <StatRow label={t("statements.retained")} amount={fin.netProfit} lang={lang} indent={1} />
                <StatRow label={t("statements.total_equity")} amount={fin.totalEquity} lang={lang} bold separator />
                <StatRow
                  label={t("statements.total_liab_eq")}
                  amount={fin.totalLiabEq}
                  lang={lang}
                  bold
                  separator
                  highlight="profit"
                />
              </div>
            </div>
          </PageSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
