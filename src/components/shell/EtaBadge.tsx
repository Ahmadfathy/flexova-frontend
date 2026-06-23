import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type EtaState = "connected" | "syncing" | "offline";

interface EtaBadgeProps {
  state?: EtaState;
}

const stateClasses: Record<EtaState, { badge: string; dot: string }> = {
  connected: { badge: "bg-success-tint text-success-text", dot: "bg-success" },
  syncing:   { badge: "bg-brand-tint text-brand-text",   dot: "bg-brand animate-eta-pulse" },
  offline:   { badge: "bg-warning-tint text-warning-text", dot: "bg-warning" },
};

export function EtaBadge({ state = "connected" }: EtaBadgeProps) {
  const { t } = useTranslation("shell");
  const cls = stateClasses[state];

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium", cls.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
      {t(`topbar.eta_${state}`)}
    </span>
  );
}
