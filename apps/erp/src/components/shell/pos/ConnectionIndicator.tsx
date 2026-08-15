import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionIndicatorProps {
  queueCount: number;
}

export function ConnectionIndicator({ queueCount }: ConnectionIndicatorProps) {
  const { t } = useTranslation("pos");
  const [online, setOnline] = useState(() => navigator.onLine);

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

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 h-11 text-xs font-medium shrink-0",
        online ? "bg-muted text-muted-foreground" : "bg-warning-tint text-warning-text"
      )}
    >
      {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline whitespace-nowrap">
        {online ? t("layout.online") : t("layout.offline")}
      </span>
      {queueCount > 0 && (
        <span className="whitespace-nowrap tabular-nums">{t("layout.queue", { n: queueCount })}</span>
      )}
    </div>
  );
}
