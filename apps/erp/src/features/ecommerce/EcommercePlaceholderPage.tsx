import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";

interface EcommercePlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  note: string;
}

/** Shared "screen not built yet" placeholder for /ecommerce/* routes — mirrors HealthcarePlaceholderPage.
 * Products/categories/affiliates/settings land in Admin Prompts A2–A4; this A1 pass only builds Orders. */
export function EcommercePlaceholderPage({ icon: Icon, title, note }: EcommercePlaceholderPageProps) {
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
