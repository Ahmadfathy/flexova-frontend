import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ShiftIndicatorProps {
  open: boolean;
  cashierName?: string;
  onClick?: () => void;
}

export function ShiftIndicator({ open, cashierName, onClick }: ShiftIndicatorProps) {
  const { t } = useTranslation("pos");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 h-11 text-xs font-medium shrink-0 transition-opacity",
        onClick && "cursor-pointer hover:opacity-80",
        open ? "bg-success-tint text-success-text" : "bg-muted text-muted-foreground"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", open ? "bg-success" : "bg-muted-foreground")} />
      <span className="whitespace-nowrap">{open ? t("layout.shift_open") : t("layout.shift_closed")}</span>
      {open && cashierName && (
        <span className="hidden md:inline text-muted-foreground/80 font-normal">· {cashierName}</span>
      )}
    </button>
  );
}
