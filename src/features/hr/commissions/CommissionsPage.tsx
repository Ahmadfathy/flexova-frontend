import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, ChevronDown, ChevronRight } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EntityCell }    from "@/components/patterns/DataTable";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useHrData, type CommissionAccrued } from "../data/useHrData";

export function CommissionsPage() {
  const { t, i18n } = useTranslation("hr");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useHrData();

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const employees         = data?.employees          ?? [];
  const rules             = data?.commissionRules    ?? [];
  const accrued           = data?.commissionsAccrued ?? [];

  function empName(id: string) {
    const e = employees.find(emp => emp.id === id);
    if (!e) return id;
    return lang === "ar" ? e.name_ar : e.name_en;
  }

  function ruleName(id: string) {
    const r = rules.find(ru => ru.id === id);
    if (!r) return id;
    return lang === "ar" ? r.name_ar : r.name_en;
  }

  function ruleLabel(id: string) {
    const r = rules.find(ru => ru.id === id);
    if (!r) return id;
    if (r.type === "percent") return t("commissions.rule_percent", { v: r.value, base: r.base });
    return t("commissions.rule_fixed", { v: r.value });
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("commissions.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3.5 w-28 flex-1" />
              <Skeleton className="h-3.5 w-20 tabular-nums" />
              <Skeleton className="h-3.5 w-24 tabular-nums text-success" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("commissions.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title={t("commissions.title")} />

      {isOffline && <OfflineBanner />}

      {/* Commission rules */}
      <PageSection title={t("commissions.rules_title")}>
        <div className="flex flex-wrap gap-3">
          {rules.map(r => (
            <div key={r.id} className="rounded-sm bg-muted/50 px-4 py-3 space-y-1 min-w-48">
              <p className="font-semibold text-sm">{lang === "ar" ? r.name_ar : r.name_en}</p>
              <p className="text-xs text-muted-foreground">{ruleLabel(r.id)}</p>
              <Badge variant="outline" className="text-xs font-normal">
                {lang === "ar" ? (r.base === "collected" ? "على المحصّل" : r.base) : r.base}
              </Badge>
            </div>
          ))}
        </div>
      </PageSection>

      {/* Accrued commissions */}
      <PageSection title={t("commissions.accrued_title")} padded={false}>
        {accrued.length === 0 ? (
          <EmptyState icon={TrendingUp} title={t("commissions.no_accrued")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-8" />
                  {["col_employee","col_period","col_rule","col_base","col_commission"].map(k => (
                    <TableHead key={k} className={cn(
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    )}>
                      {t(`commissions.${k}` as Parameters<typeof t>[0])}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {accrued.map(item => {
                  const name = empName(item.employee_id);
                  const isExp = expanded.has(item.employee_id + item.period);
                  const hasSources = item.sources.length > 0;
                  return (
                    <>
                      <TableRow
                        key={`${item.employee_id}_${item.period}`}
                        className={cn(
                          "border-b border-border hover:bg-muted/30",
                          hasSources && "cursor-pointer",
                        )}
                        onClick={() => hasSources && toggleExpand(item.employee_id + item.period)}
                      >
                        <TableCell className="w-8 text-center">
                          {hasSources && (
                            isExp
                              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <EntityCell name={name} avatarFallback={name.slice(0, 2)} />
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {item.period}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ruleName(item.rule_id)}</TableCell>
                        <TableCell className="text-start tabular-nums text-sm">
                          {formatMoney(item.base_amount, lang)}
                        </TableCell>
                        <TableCell className="text-start tabular-nums text-sm font-semibold text-success">
                          {formatMoney(item.commission, lang)}
                        </TableCell>
                      </TableRow>

                      {/* Sources expandable */}
                      {isExp && item.sources.map((src, si) => (
                        <TableRow key={`${item.employee_id}_src_${si}`} className="bg-muted/20 border-b border-border last:border-0">
                          <TableCell />
                          <TableCell colSpan={2} className="text-xs text-muted-foreground ps-8 font-mono">
                            {src.txn}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {src.note ?? ""}
                          </TableCell>
                          <TableCell className="text-start tabular-nums text-xs text-muted-foreground">
                            {formatMoney(src.collected, lang)}
                          </TableCell>
                          <TableCell className="text-start tabular-nums text-xs text-success">
                            {src.collected > 0 ? formatMoney(src.collected * 0.025, lang) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </PageSection>
    </div>
  );
}
