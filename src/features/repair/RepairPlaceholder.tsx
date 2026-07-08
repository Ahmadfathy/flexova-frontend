import type { LucideIcon } from "lucide-react";

interface RepairPlaceholderProps {
  icon: LucideIcon;
  title: string;
  note: string;
  detail?: string;
}

/** Shared "screen not built yet" placeholder for /repair/* routes — mirrors PosGridPlaceholder. */
export function RepairPlaceholder({ icon: Icon, title, note, detail }: RepairPlaceholderProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-muted-foreground p-6">
      <Icon className="h-8 w-8" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {detail && <p className="text-xs">{detail}</p>}
      <p className="text-xs">{note}</p>
    </div>
  );
}
