import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorPageBase } from "./ErrorPageBase";

export function OfflinePage() {
  const { t } = useTranslation("errors");
  return (
    <ErrorPageBase
      icon={WifiOff}
      title={t("offline.title")}
      subtitle={t("offline.subtitle")}
      actionLabel={t("offline.action")}
      onAction={() => window.location.reload()}
    />
  );
}
