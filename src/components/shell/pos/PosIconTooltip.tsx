import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface PosIconTooltipProps {
  label: string;
  children: ReactNode;
}

/**
 * Unified label-only tooltip for the POS top bar (dark pill + arrow),
 * shared by exactly three icons: Journal · Terminal · Language (FE_09a §2/§10).
 */
export function PosIconTooltip({ label, children }: PosIconTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={8}
            className="z-50 rounded bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-50 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-neutral-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
