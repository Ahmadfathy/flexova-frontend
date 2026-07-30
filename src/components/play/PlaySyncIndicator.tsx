import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff, Loader2, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncState = "local" | "syncing" | "synced";

const TONE: Record<SyncState, string> = {
  local: "bg-muted text-muted-foreground",
  syncing: "bg-brand-tint text-brand-text",
  synced: "bg-muted text-muted-foreground",
};

/** Floor Grid's `syncIndicator` slot (FE_15 §4.4/§10) — offline is a normal operating state,
 * never an error: counters keep running from the terminal clock regardless of this chip.
 * Mirrors `components/van/SyncIndicator.tsx`'s shape (online/offline + browser events), simplified
 * to the three states FE_15 asks for (no real sync queue exists yet for Play). */
export function PlaySyncIndicator() {
  const { t } = useTranslation("play");
  const [state, setState] = useState<SyncState>(() => (navigator.onLine ? "synced" : "local"));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleOnline() {
      setState("syncing");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setState("synced"), 1200);
    }
    function handleOffline() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState("local");
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const Icon = state === "local" ? WifiOff : state === "syncing" ? Loader2 : Wifi;

  return (
    <span className={cn("inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-xs font-medium shrink-0", TONE[state])}>
      <Icon className={cn("h-3.5 w-3.5", state === "syncing" && "animate-spin")} />
      <span className="hidden sm:inline whitespace-nowrap">{t(`floor.sync_${state}`)}</span>
    </span>
  );
}
