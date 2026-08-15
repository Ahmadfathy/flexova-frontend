import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  danger?: boolean;
  size?: "sm" | "default";
  variant?: "outline";
}

/** Disabled buttons don't fire pointer/focus events, so the tooltip trigger wraps
 * them in a `<span tabIndex>` — the standard Radix workaround (FE_14 §7 SoD tooltips). */
export function ActionButton({ label, onClick, disabled, tooltip, danger, size = "sm", variant }: ActionButtonProps) {
  const button = (
    <Button
      size={size}
      variant={danger ? "outline" : variant}
      tone={danger ? "danger" : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
  if (!disabled || !tooltip) return button;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><span tabIndex={0}>{button}</span></TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
