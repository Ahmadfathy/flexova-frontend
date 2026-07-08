import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";

/** /repair/settings — Workshop settings (back-office shell, not PosLayout). Placeholder for FE_12 Step 1. */
export default function RepairSettingsPage() {
  const { t } = useTranslation("repair");

  return (
    <div>
      <PageHeader title={t("settings.title")} />
      <PageSection>
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground py-10">
          <Settings className="h-8 w-8" />
          <p className="text-xs">{t("placeholder.note")}</p>
        </div>
      </PageSection>
    </div>
  );
}
