import { FileQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ErrorPageBase } from "./ErrorPageBase";

export function NotFoundPage() {
  const { t }    = useTranslation("errors");
  const navigate = useNavigate();
  return (
    <ErrorPageBase
      icon={FileQuestion}
      title={t("not_found.title")}
      subtitle={t("not_found.subtitle")}
      actionLabel={t("not_found.action")}
      onAction={() => navigate("/", { replace: true })}
    />
  );
}
