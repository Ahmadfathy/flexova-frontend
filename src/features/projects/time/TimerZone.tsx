import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Square, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/patterns/Skeletons";
import { useAppearance } from "@/stores/appearance";
import { useProjectsTimer } from "@/stores/projectsTimer";
import { useProjectsStore } from "@/stores/projectsStore";
import { useTimerActions } from "./useTimerActions";
import { StartTimerModal } from "./StartTimerModal";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface TimerZoneProps {
  isOffline?: boolean;
}

/** Timer zone at the top of `/time` (spec §7.3). Mirrors to the Prompt-6 Topbar slot via the same `useProjectsTimer` store. */
export function TimerZone({ isOffline }: TimerZoneProps) {
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();
  const active = useProjectsTimer((s) => s.active);
  const hydrated = useProjectsTimer((s) => s.hydrated);
  const { stopTimer } = useTimerActions();

  const project = useProjectsStore((s) => (active ? s.projects[active.project_id] : undefined));
  const [modalOpen, setModalOpen] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) return;
    const startedAt = new Date(active.start_ts).getTime();
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [active]);

  if (!hydrated) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <div className="sticky top-0 z-10 sm:static rounded-sm bg-card shadow-sm p-3 sm:p-4 flex items-center justify-between gap-3">
      {active ? (
        <>
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger" />
            </span>
            <span className="text-xl sm:text-2xl font-bold tabular-nums num shrink-0">{formatElapsed(elapsedMs)}</span>
            <span className="text-sm text-muted-foreground truncate">
              {project ? (lang === "ar" ? project.title_ar : project.title_en) : active.project_id}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={t("time.switch")} title={t("time.switch")} onClick={() => setModalOpen(true)}>
              <Repeat className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => stopTimer(true, isOffline)}>
              <Square className="h-4 w-4 me-1.5" />{t("time.stop")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">{t("time.no_active")}</span>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Play className="h-4 w-4 me-1.5" />{t("time.start")}
          </Button>
        </>
      )}

      <StartTimerModal open={modalOpen} onOpenChange={setModalOpen} isOffline={isOffline} />
    </div>
  );
}
