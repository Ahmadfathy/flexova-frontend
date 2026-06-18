import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  Breadcrumb as ShadBreadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "./Skeletons";
import type { BreadcrumbSegment } from "@/hooks/useBreadcrumb";

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  className?: string;
}

const Sep = () => (
  <BreadcrumbSeparator>
    <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
  </BreadcrumbSeparator>
);

export function Breadcrumb({ segments, className }: BreadcrumbProps) {
  if (!segments.length) return null;

  const first    = segments[0];
  const last     = segments[segments.length - 1];
  const middle   = segments.slice(1, -1);
  const hasMiddle = middle.length > 0;
  const hasTail   = segments.length > 1;

  return (
    <ShadBreadcrumb className={className}>
      <BreadcrumbList className="gap-1 sm:gap-1.5 text-xs flex-nowrap overflow-hidden whitespace-nowrap">

        {/* First — always visible */}
        <BreadcrumbItem>
          {!hasTail ? (
            <BreadcrumbPage className="text-xs">{first.label}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild className="text-xs max-w-[10rem] truncate block">
              <Link to={first.href ?? "/"}>{first.label}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {/* Middle — visible sm+, ellipsis on xs */}
        {hasMiddle && (
          <>
            {middle.map((seg, i) => (
              <React.Fragment key={i}>
                <Sep />
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbLink asChild className="text-xs max-w-[10rem] truncate block">
                    <Link to={seg.href ?? "/"}>{seg.label}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </React.Fragment>
            ))}
            <Sep />
            <BreadcrumbItem className="sm:hidden">
              <BreadcrumbEllipsis className="h-4 w-4" />
            </BreadcrumbItem>
          </>
        )}

        {/* Last — always visible when multiple segments */}
        {hasTail && (
          <>
            <Sep />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs max-w-[10rem] truncate block">
                {last.loading
                  ? <Skeleton className="h-3 w-20 inline-block align-middle" />
                  : last.label
                }
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

      </BreadcrumbList>
    </ShadBreadcrumb>
  );
}
