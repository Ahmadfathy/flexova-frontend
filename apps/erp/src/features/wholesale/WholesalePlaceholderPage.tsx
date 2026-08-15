import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";

interface WholesalePlaceholderPageProps {
  ns: "wholesale" | "van";
  titleKey: string;
  icon: LucideIcon;
  /** Van pages mount in PosLayout's unpadded body — pad locally there. */
  padded?: boolean;
}

/** Shared "screen not built yet" scaffold for FE_13 routes — PageHeader + standard EmptyState. */
export function WholesalePlaceholderPage({ ns, titleKey, icon, padded }: WholesalePlaceholderPageProps) {
  const { t } = useTranslation(ns);
  const title = t(`${titleKey}.title`);

  return (
    <div className={padded ? "h-full overflow-auto p-4 space-y-4" : "space-y-4"}>
      <PageHeader title={title} />
      <EmptyState icon={icon} title={title} description={t("placeholder.note")} />
    </div>
  );
}
