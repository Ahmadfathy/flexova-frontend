import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";

export type StatCardTone = "plain" | "brand" | "success" | "warning" | "danger";

const TONE_STYLES: Record<StatCardTone, {
  card:  string;
  label: string;
  value: string;
  delta: { pos: string; neg: string };
  chart: string; // CSS color expression for the chart line/fill
}> = {
  plain:   {
    card:  "",
    label: "text-muted-foreground",
    value: "text-foreground",
    delta: { pos: "text-success-text", neg: "text-danger-text" },
    chart: "hsl(var(--brand))",
  },
  brand:   {
    card:  "bg-brand-tint   border-transparent",
    label: "text-brand-text",
    value: "text-brand-text",
    delta: { pos: "text-success-text", neg: "text-danger-text" },
    chart: "hsl(var(--brand))",
  },
  success: {
    card:  "bg-success-tint border-transparent",
    label: "text-success-text",
    value: "text-success-text",
    delta: { pos: "text-success-text", neg: "text-danger-text" },
    chart: "hsl(var(--success))",
  },
  warning: {
    card:  "bg-warning-tint border-transparent",
    label: "text-warning-text",
    value: "text-warning-text",
    delta: { pos: "text-success-text", neg: "text-danger-text" },
    chart: "hsl(var(--warning))",
  },
  danger:  {
    card:  "bg-danger-tint  border-transparent",
    label: "text-danger-text",
    value: "text-danger-text",
    delta: { pos: "text-success-text", neg: "text-danger-text" },
    chart: "hsl(var(--danger))",
  },
};

export interface StatCardProps {
  label: string;
  value: string | number;
  /** e.g. "+12%" or "-3" */
  delta?: string;
  deltaPositive?: boolean;
  /** Data points for the area sparkline */
  sparkline?: number[];
  /** Data points for the bar sparkline (takes precedence over sparkline) */
  bars?: number[];
  tone?: StatCardTone;
  className?: string;
}

/** Resolves a CSS custom property string (e.g. "hsl(var(--brand))")
 *  to an actual hex/hsl via the live stylesheet, so Recharts SVG attrs
 *  receive a resolved color value that adapts to theme changes. */
function useResolvedColor(cssExpression: string, theme: string, mode: string): string {
  return useMemo(() => {
    try {
      // Trick: create a temporary element, apply the color, read computed style
      const el = document.createElement("div");
      el.style.display = "none";
      el.style.color = cssExpression;
      document.documentElement.appendChild(el);
      const resolved = getComputedStyle(el).color;
      document.documentElement.removeChild(el);
      return resolved || "#888";
    } catch {
      return "#888";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssExpression, theme, mode]);
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  sparkline,
  bars,
  tone = "plain",
  className,
}: StatCardProps) {
  const { theme, mode } = useAppearance();
  const styles = TONE_STYLES[tone];

  const resolvedColor = useResolvedColor(styles.chart, theme, mode);

  const chartData = (bars ?? sparkline ?? []).map((v) => ({ v }));
  const hasChart  = chartData.length > 0;

  return (
    <Card className={cn("overflow-hidden", styles.card, className)}>
      <CardContent className="p-5 flex flex-col gap-3">
        {/* Label row */}
        <p className={cn("text-sm font-medium leading-tight", styles.label)}>
          {label}
        </p>

        {/* Value + delta */}
        <div className="flex items-end gap-2">
          <span className={cn("text-2xl font-bold tabular-nums num leading-none", styles.value)}>
            {value}
          </span>
          {delta && (
            <span
              className={cn(
                "text-xs font-semibold mb-0.5",
                deltaPositive ? styles.delta.pos : styles.delta.neg
              )}
            >
              {delta}
            </span>
          )}
        </div>

        {/* Sparkline — bleed to card edges by negative margin */}
        {hasChart && (
          <div className="-mx-5 -mb-5 mt-1 h-14">
            <ResponsiveContainer width="100%" height="100%">
              {bars ? (
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Tooltip
                    cursor={false}
                    contentStyle={{ display: "none" }}
                    wrapperStyle={{ display: "none" }}
                  />
                  <Bar dataKey="v" fill={resolvedColor} fillOpacity={0.5} radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`sg-${tone}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={resolvedColor} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={resolvedColor} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    cursor={false}
                    contentStyle={{ display: "none" }}
                    wrapperStyle={{ display: "none" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={resolvedColor}
                    strokeWidth={2}
                    fill={`url(#sg-${tone})`}
                    dot={false}
                    activeDot={false}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
