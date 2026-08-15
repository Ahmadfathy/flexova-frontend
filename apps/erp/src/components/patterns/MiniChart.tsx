/**
 * MiniChart — lightweight Recharts wrappers for in-card sparklines and gauges.
 *
 * Color resolution: CSS custom properties can't be passed directly as SVG
 * attributes. We resolve them via a temporary DOM element so charts adapt
 * to active theme and mode changes.
 */
import { useMemo } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";

/* ── Color resolver ─────────────────────────────────────────── */
function useResolvedColor(cssColor: string, theme: string, mode: string): string {
  return useMemo(() => {
    try {
      const el = document.createElement("div");
      el.style.display = "none";
      el.style.color   = cssColor;
      document.documentElement.appendChild(el);
      const resolved = getComputedStyle(el).color;
      document.documentElement.removeChild(el);
      return resolved || "#888";
    } catch {
      return "#888";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssColor, theme, mode]);
}

export type ChartTone = "brand" | "success" | "warning" | "danger";

const CHART_CSS: Record<ChartTone, string> = {
  brand:   "hsl(var(--brand))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger:  "hsl(var(--danger))",
};

/* ─────────────────────────────────────────────────────────────
   SparkArea — small area chart for use inline in cards/rows
   ───────────────────────────────────────────────────────────── */
export interface SparkAreaProps {
  data: number[];
  tone?: ChartTone;
  height?: number;
  className?: string;
}

export function SparkArea({ data, tone = "brand", height = 48, className }: SparkAreaProps) {
  const { theme, mode } = useAppearance();
  const color = useResolvedColor(CHART_CSS[tone], theme, mode);
  const chartData = data.map((v) => ({ v }));
  const gradId = `spark-area-${tone}`;

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0}    />
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
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SparkBar — mini bar chart
   ───────────────────────────────────────────────────────────── */
export interface SparkBarProps {
  data: number[];
  tone?: ChartTone;
  height?: number;
  className?: string;
}

export function SparkBar({ data, tone = "brand", height = 48, className }: SparkBarProps) {
  const { theme, mode } = useAppearance();
  const color = useResolvedColor(CHART_CSS[tone], theme, mode);
  const chartData = data.map((v) => ({ v }));

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%">
          <Tooltip
            cursor={false}
            contentStyle={{ display: "none" }}
            wrapperStyle={{ display: "none" }}
          />
          <Bar dataKey="v" fill={color} fillOpacity={0.55} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RadialGauge — donut-style percentage gauge with center label
   Uses a half-donut arc (startAngle=180, endAngle=0).
   ───────────────────────────────────────────────────────────── */
export interface RadialGaugeProps {
  /** 0–100 */
  value: number;
  label?: string;
  tone?: ChartTone;
  /** Outer size in px */
  size?: number;
  className?: string;
}

export function RadialGauge({
  value,
  label,
  tone = "brand",
  size = 120,
  className,
}: RadialGaugeProps) {
  const { theme, mode } = useAppearance();
  const fillColor  = useResolvedColor(CHART_CSS[tone], theme, mode);
  const trackColor = useResolvedColor("hsl(var(--border))", theme, mode);

  const clamped = Math.min(100, Math.max(0, value));
  const data = [
    { value: clamped     },
    { value: 100 - clamped },
  ];

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="60%"
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="80%"
            dataKey="value"
            strokeWidth={0}
            paddingAngle={2}
          >
            <Cell fill={fillColor}  />
            <Cell fill={trackColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: "-10%" }}>
        <span className="text-xl font-bold tabular-nums num text-foreground leading-none">
          {clamped}%
        </span>
        {label && (
          <span className="text-[10px] text-muted-foreground mt-0.5 text-center leading-tight max-w-[80%]">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DonutGauge — full 360° donut with center label (for "User Base" style)
   ───────────────────────────────────────────────────────────── */
export interface DonutGaugeProps {
  /** Array of { label, value, tone } slices */
  slices: { label: string; value: number; tone: ChartTone }[];
  /** Center label (e.g. "Total") */
  centerLabel?: string;
  /** Center value (e.g. "5,230") */
  centerValue?: string;
  size?: number;
  className?: string;
}

export function DonutGauge({
  slices,
  centerLabel,
  centerValue,
  size = 140,
  className,
}: DonutGaugeProps) {
  const { theme, mode } = useAppearance();
  // Resolve all four tone colors upfront (hooks must be called unconditionally)
  const brandColor   = useResolvedColor(CHART_CSS.brand,   theme, mode);
  const successColor = useResolvedColor(CHART_CSS.success, theme, mode);
  const warningColor = useResolvedColor(CHART_CSS.warning, theme, mode);
  const dangerColor  = useResolvedColor(CHART_CSS.danger,  theme, mode);
  const RESOLVED: Record<ChartTone, string> = {
    brand: brandColor, success: successColor, warning: warningColor, danger: dangerColor,
  };
  const colors = slices.map((s) => RESOLVED[s.tone]);

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            dataKey="value"
            strokeWidth={0}
            paddingAngle={2}
          >
            {slices.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          {centerValue && (
            <span className="text-lg font-bold tabular-nums num text-foreground leading-none">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-[10px] text-muted-foreground">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
