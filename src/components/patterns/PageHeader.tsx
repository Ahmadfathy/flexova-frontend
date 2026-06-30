import { cn } from "@/lib/utils";
import { Breadcrumb } from "./Breadcrumb";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Page-level alert/banner — renders AFTER the header row, before content. */
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
       * Single header row:
       *   Logical START (right in RTL) — page title + optional actions
       *   Logical END   (left  in RTL) — breadcrumb (ms-auto pushes it to the end,
       *                                  even when it wraps to a second line on xs)
       */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5">
        {/* START: title + subtitle + actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>

        {/* END: breadcrumb — single line, truncates before wrapping */}
        {segments.length > 0 && (
          <Breadcrumb segments={segments} className="ms-auto min-w-0" />
        )}
      </div>

      {/* Alert: after the header row, before content */}
      {alert && <div className="mt-4">{alert}</div>}
    </div>
  );
}
