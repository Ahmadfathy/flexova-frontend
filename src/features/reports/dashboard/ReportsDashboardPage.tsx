import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, ExternalLink, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card }   from "@/components/ui/card";
import { cn }     from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useReportsData, type DashWidget } from "../data/useReportsData";

// ── KPI widget ────────────────────────────────────────────────────

function KpiWidget({ w, lang, t }: {
  w: DashWidget;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"reports">>["t"];
}) {
  const navigate = useNavigate();
  const up = (w.delta_pct ?? 0) >= 0;

  return (
    <Card
      className={cn("p-5 space-y-3", w.drill && "cursor-pointer transition-colors hover:bg-muted/30")}
      onClick={() => w.drill && navigate(w.drill)}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground truncate">{w.title_ar}</p>
        {w.drill && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </div>
      <p className="text-2xl font-bold tabular-nums">
        {w.unit === "ج.م" && typeof w.value === "number"
          ? formatMoney(w.value, lang)
          : w.value}
      </p>
      {w.delta_pct !== undefined && (
        <p className={cn("text-xs flex items-center gap-1", up ? "text-success" : "text-danger")}>
          {up
            ? <TrendingUp className="h-3 w-3" />
            : <TrendingDown className="h-3 w-3" />
          }
          {up
            ? t("dashboard.delta_up", { n: w.delta_pct })
            : t("dashboard.delta_down", { n: Math.abs(w.delta_pct) })}
        </p>
      )}
    </Card>
  );
}

// ── Cashflow chart ────────────────────────────────────────────────

function CashflowWidget({ w, t }: {
  w: DashWidget;
  t: ReturnType<typeof useTranslation<"reports">>["t"];
}) {
  return (
    <Card className="p-5 col-span-full lg:col-span-2">
      <p className="text-xs font-medium text-muted-foreground mb-4">{w.title_ar}</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={w.series} barCategoryGap="30%">
          <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip formatter={(v: number) => v.toLocaleString("ar-EG")} />
          <Legend iconType="circle" iconSize={8} />
          <Bar dataKey="in"  name={t("dashboard.cashflow_in")}  fill="var(--color-success, #22c55e)" radius={[4,4,0,0]} />
          <Bar dataKey="out" name={t("dashboard.cashflow_out")} fill="var(--color-danger, #ef4444)"  radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── List widget ───────────────────────────────────────────────────

function ListWidget({ w, lang }: { w: DashWidget; lang: "ar" | "en" }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-muted-foreground mb-3">{w.title_ar}</p>
      <div className="space-y-2">
        {(w.items ?? []).map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label_ar}</span>
            <span className="tabular-nums font-medium">{formatMoney(item.value, lang)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function ReportsDashboardPage() {
  const { t, i18n } = useTranslation("reports");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useReportsData();

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dashboard.title")} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-sm bg-card shadow-sm p-5 space-y-3">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dashboard.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const ownerDash = data!.dashboards.find(d => d.default) ?? data!.dashboards[0];
  const meta      = data!.aggregateMeta;
  const widgets   = ownerDash?.widgets ?? [];
  const kpis      = widgets.filter(w => w.type === "kpi");
  const charts    = widgets.filter(w => w.type === "chart");
  const lists     = widgets.filter(w => w.type === "list");

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={ownerDash ? (lang === "ar" ? ownerDash.name_ar : ownerDash.name_en) : undefined}
        actions={
          <div className="flex items-center gap-2">
            {meta?.staleness_minutes && (
              <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t("dashboard.stale_badge", { n: meta.staleness_minutes })}
              </Badge>
            )}
          </div>
        }
      />

      {isOffline && <OfflineBanner />}

      {/* KPI grid */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4">
          {kpis.map(w => <KpiWidget key={w.id} w={w} lang={lang} t={t} />)}
        </div>
      )}

      {/* Charts + lists */}
      {(charts.length > 0 || lists.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4">
          {charts.map(w => <CashflowWidget key={w.id} w={w} t={t} />)}
          {lists.map(w => <ListWidget key={w.id} w={w} lang={lang} />)}
        </div>
      )}
    </div>
  );
}
