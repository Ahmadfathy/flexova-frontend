import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWholesaleSyncQueue } from "@/stores/wholesaleSyncQueue";

type SyncState = "online" | "offline" | "syncing" | "error";

const TONE: Record<SyncState, string> = {
  // Offline is a normal operating state — neutral, never danger (FE_13 §2.1).
  online: "bg-muted text-muted-foreground",
  offline: "bg-muted text-muted-foreground",
  syncing: "bg-brand-tint text-brand-text",
  error: "bg-danger-tint text-danger-text",
};

/** Top-bar sync status for /van/* (FE_13 §2.1) — additive PosLayout slot. */
export function SyncIndicator() {
  const { t } = useTranslation("van");
  const [online, setOnline] = useState(() => navigator.onLine);
  const entries = useWholesaleSyncQueue((s) => s.entries);
  const syncState = useWholesaleSyncQueue((s) => s.syncState);
  const syncNow = useWholesaleSyncQueue((s) => s.syncNow);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const pendingCount = entries.filter((e) => e.status === "pending").length;

  const state: SyncState =
    syncState === "syncing" ? "syncing" : syncState === "error" ? "error" : !online ? "offline" : "online";

  const canRetry = state === "error" || state === "offline";

  return (
    <button
      type="button"
      onClick={canRetry ? () => void syncNow() : undefined}
      disabled={state === "syncing"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 h-11 text-xs font-medium shrink-0 transition-colors",
        canRetry && "cursor-pointer",
        !canRetry && "cursor-default",
        TONE[state],
      )}
    >
      {state === "online" && <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />}
      {state === "offline" && <WifiOff className="h-3.5 w-3.5 shrink-0" />}
      {state === "syncing" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
      {state === "error" && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      <span className="hidden sm:inline whitespace-nowrap">
        {state === "offline" ? t("sync.offline", { n: pendingCount }) : t(`sync.${state}`)}
      </span>
    </button>
  );
}
