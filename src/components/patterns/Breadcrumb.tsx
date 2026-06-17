import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeletons";
import type { BreadcrumbSegment } from "@/hooks/useBreadcrumb";

interface SegmentLabelProps {
  seg: BreadcrumbSegment;
  isLast: boolean;
}

function SegmentLabel({ seg, isLast }: SegmentLabelProps) {
  if (seg.loading) {
    return <Skeleton className="h-3 w-20 inline-block align-middle" />;
  }
  if (seg.href) {
    return (
      <Link
        to={seg.href}
        className="truncate max-w-[10rem] hover:text-foreground transition-colors underline-offset-2 hover:underline"
      >
        {seg.label}
      </Link>
    );
  }
  return (
    <span className={cn("truncate max-w-[10rem]", isLast && "text-foreground")}>
      {seg.label}
    </span>
  );
}

const Sep = () => (
  <ChevronRight className="h-3 w-3 shrink-0 rtl:-scale-x-100" aria-hidden />
);

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  className?: string;
}

/**
 * Renders a horizontal breadcrumb trail.
 *
 * Responsive collapse: on screens narrower than `sm`, middle segments are
 * replaced by "…" so only the first and last segments remain visible.
 * Everything stays on one line; individual labels truncate with ellipsis.
 */
export function Breadcrumb({ segments, className }: BreadcrumbProps) {
  if (!segments.length) return null;

  const first    = segments[0];
  const last     = segments[segments.length - 1];
  const middle   = segments.slice(1, -1);
  const hasMiddle = middle.length > 0;
  const hasTail   = segments.length > 1;

  return (
    <nav
      aria-label="breadcrumb"
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground overflow-hidden whitespace-nowrap",
        className
      )}
    >
      {/* First — always visible */}
      <SegmentLabel seg={first} isLast={!hasTail} />

      {hasMiddle && (
        <>
          {/* Middle segments: visible on sm+, hidden on xs */}
          {middle.map((seg, i) => (
            <span key={i} className="hidden sm:flex items-center gap-1 min-w-0">
              <Sep />
              <SegmentLabel seg={seg} isLast={false} />
            </span>
          ))}
          {/* Ellipsis: visible on xs only, replaces hidden middle segments */}
          <span className="flex sm:hidden items-center gap-1 shrink-0" aria-hidden>
            <Sep />
            <span>…</span>
          </span>
        </>
      )}

      {/* Last — always visible when there are multiple segments */}
      {hasTail && (
        <span className="flex items-center gap-1 min-w-0">
          <Sep />
          <SegmentLabel seg={last} isLast />
        </span>
      )}
    </nav>
  );
}
