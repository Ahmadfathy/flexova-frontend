import { ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ErrorPageBase } from "./ErrorPageBase";

export function ForbiddenPage() {
  const { t }    = useTranslation("errors");
  const navigate = useNavigate();
  return (
    <ErrorPageBase
      icon={ShieldOff}
      title={t("forbidden.title")}
      subtitle={t("forbidden.subtitle")}
      actionLabel={t("forbidden.action")}
      onAction={() => navigate("/", { replace: true })}
    />
  );
}
