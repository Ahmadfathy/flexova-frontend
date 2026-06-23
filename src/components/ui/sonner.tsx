import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  LoaderCircle,
} from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { useAppearance } from "@/stores/appearance";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { mode } = useAppearance();

  return (
    <Sonner
      theme={mode}
      dir="auto"
      position="bottom-right"
      icons={{
        success: <CheckCircle2  className="size-5 text-success" />,
        error:   <XCircle       className="size-5 text-danger"  />,
        warning: <AlertTriangle className="size-5 text-warning" />,
        info:    <Info          className="size-5 text-brand"   />,
        loading: <LoaderCircle  className="size-5 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        // unstyled removes data-styled="true" → Sonner's bg/border/color/radius CSS
        // doesn't fire; animations (transform/opacity) are unaffected (no data-styled gate)
        unstyled: true,
        classNames: {
          // Layout only — no color here so per-type overrides win cleanly
          toast: [
            "flex w-full items-start gap-3",
            "rounded border px-4 py-3 text-sm",
            "shadow-sm pointer-events-auto",
          ].join(" "),
          icon:        "mt-0.5 size-5 shrink-0",
          content:     "flex-1 min-w-0",
          title:       "font-semibold leading-snug",
          description: "leading-snug",
          // Default / loading → Alert "white" variant
          default: "bg-card border-border text-foreground",
          loading: "bg-card border-border text-muted-foreground",
          // Semantic variants — exact same tokens as the Alert component
          success: "bg-success-tint border-success/30 text-success-text",
          error:   "bg-danger-tint  border-danger/30  text-danger-text",
          warning: "bg-warning-tint border-warning/30 text-warning-text",
          info:    "bg-info-tint    border-brand/30   text-brand-text",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
