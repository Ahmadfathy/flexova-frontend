import { ServerCrash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorPageBase } from "./ErrorPageBase";

export function ServerErrorPage() {
  const { t } = useTranslation("errors");
  return (
    <ErrorPageBase
      icon={ServerCrash}
      title={t("server_error.title")}
      subtitle={t("server_error.subtitle")}
      actionLabel={t("server_error.action")}
      onAction={() => window.location.reload()}
    />
  );
}
