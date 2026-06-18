import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Card({ title, subtitle, className, children }: CardProps) {
  return (
    <div className={cn("bg-card rounded-lg border border-border shadow-sm p-6", className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-sm font-semibold text-foreground leading-none">{title}</h3>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
