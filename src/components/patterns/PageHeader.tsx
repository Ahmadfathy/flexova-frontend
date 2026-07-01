import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "./Breadcrumb";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface PageHeaderProps {
  title: string;
  /** Free-text line under the title (non-count context, e.g. a record name). */
  subtitle?: string;
  /** Record count — rendered as a brand-tint pill next to the title. */
  count?: string | number;
  /** Unit label paired with `count` (e.g. count=1, countLabel="تسوية" → "1 تسوية"). */
  countLabel?: string;
  /** End-side action buttons. */
  actions?: React.ReactNode;
  /** Page-level alert/banner — renders AFTER the header block, before content. */
  alert?: React.ReactNode;
  className?: string;
  /**
   * Resolved label for a dynamic leaf segment (e.g. an item or invoice name).
   * Pass null or omit on list pages. Pass together with crumbLoading=true
   * while the record is still fetching so a skeleton is shown.
   */
  crumbLabel?: string | null;
  crumbLoading?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  count,
  countLabel,
  actions,
  alert,
  className,
  crumbLabel,
  crumbLoading,
}: PageHeaderProps) {
  const segments = useBreadcrumb({ dynamicLabel: crumbLabel, dynamicLoading: crumbLoading });

  useDocumentTitle(title);

  return (
    <div className={cn("mb-6", className)}>
      {/*
       * Two-side header block:
       *   START (right in RTL) — vertical stack: title + count pill, then breadcrumb below
       *   END   (left  in RTL) — action buttons
       */}
      <div className="flex items-start justify-between gap-4">
        {/* START: title row, then breadcrumb */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{title}</h1>
            {count != null && (
              <Badge className="border-transparent bg-brand-tint text-brand-text rounded">
                {countLabel ? `${count} ${countLabel}` : count}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {segments.length > 0 && (
            <Breadcrumb segments={segments} className="min-w-0" />
          )}
        </div>

        {/* END: actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {/* Alert: after the header block, before content */}
      {alert && <div className="mt-4">{alert}</div>}
    </div>
  );
}
