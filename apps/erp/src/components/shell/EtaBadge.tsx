import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useEtaConnection } from "@/hooks/useEtaConnection";
import type { EtaConnectionStatus } from "@/lib/mock/eta";

/** Shared status → color mapping, reused by EtaHubPage's connection card. */
export const ETA_CONN_STYLE: Record<EtaConnectionStatus, { badge: string; dot: string }> = {
  disconnected: { badge: "bg-muted text-muted-foreground",    dot: "bg-muted-foreground" },
  connecting:   { badge: "bg-brand-tint text-brand-text",     dot: "bg-brand animate-pulse" },
  connected:    { badge: "bg-success-tint text-success-text", dot: "bg-success" },
  error:        { badge: "bg-danger-tint text-danger-text",   dot: "bg-danger" },
};

export function EtaBadge() {
  const { t } = useTranslation("eta");
  const navigate = useNavigate();
  const { status, environment } = useEtaConnection();
  const cls = ETA_CONN_STYLE[status];
  const clickable = status === "disconnected" || status === "error";

  const label = status === "connected"
    ? `${t("connection.status_connected")} · ${t(`connection.environment_${environment}`)}`
    : t(`connection.status_${status}`);

  return (
    <button
      type="button"
      onClick={clickable ? () => navigate("/sales/settings/eta") : undefined}
      disabled={!clickable}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-opacity",
        cls.badge,
        clickable ? "cursor-pointer hover:opacity-80" : "cursor-default",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cls.dot)} />
      {label}
    </button>
  );
}
