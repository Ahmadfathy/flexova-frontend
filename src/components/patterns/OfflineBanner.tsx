import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export function OfflineBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-warning-tint text-warning-text text-sm font-medium border-b border-warning/20">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>{t("offline")}</span>
    </div>
  );
}
