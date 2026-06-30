import { cn } from "@/lib/utils";
import { Breadcrumb } from "./Breadcrumb";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Page-level alert/banner rendered AFTER the title, before page content. */
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
      {segments.length > 0 && (
        <Breadcrumb segments={segments} className="mb-2" />
      )}
      <div className="flex items-start justify-between gap-4">
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
      {alert && <div className="mt-4">{alert}</div>}
    </div>
  );
}
