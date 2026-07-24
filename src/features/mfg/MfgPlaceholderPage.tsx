import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";

interface MfgPlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  note: string;
}

/** Shared "screen not built yet" placeholder for /mfg/* routes — mirrors RepairSettingsPage. */
export function MfgPlaceholderPage({ icon: Icon, title, note }: MfgPlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} />
      <PageSection>
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground py-10">
          <Icon className="h-8 w-8" />
          <p className="text-xs">{note}</p>
        </div>
      </PageSection>
    </div>
  );
}
