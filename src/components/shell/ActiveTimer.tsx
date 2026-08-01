import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Timer, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/stores/appearance";
import { useProjectsTimer } from "@/stores/projectsTimer";
import { useProjectsStore } from "@/stores/projectsStore";
import { useCan } from "@/lib/permissions";
import { isFlagEnabled } from "@/lib/flags";
import { StartTimerModal } from "@/features/projects/time/StartTimerModal";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHms(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Additive Topbar slot (FE_16 Prompt 6, spec §11) — the only approved shell change.
 * Reads the same `useProjectsTimer` store as `/time`, so starting a timer from
 * either surface is a single source of truth (one active timer, always in sync).
 */
export function ActiveTimer() {
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const active = useProjectsTimer((s) => s.active);
  const hydrated = useProjectsTimer((s) => s.hydrated);
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

  if (!hydrated || !isFlagEnabled("projects.enabled") || !can("projects.time.log")) return null;

  if (!active) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex shrink-0 h-9"
          onClick={() => setModalOpen(true)}
        >
          <Play className="h-3.5 w-3.5 me-1.5" />
          {t("time.start")}
        </Button>
        <StartTimerModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  const title = project ? (lang === "ar" ? project.title_ar : project.title_en) : active.project_id;

  return (
    <button
      type="button"
      onClick={() => navigate("/time")}
      className="flex items-center gap-1.5 shrink-0 rounded-full border border-border bg-card px-2 sm:px-3 h-9 text-sm hover:bg-accent transition-colors"
      aria-label={`${t("time.active_timer")}: ${title}, ${formatHms(elapsedMs)}`}
      title={title}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
      </span>

      {/* Desktop/tablet — full pill */}
      <Timer className="hidden sm:inline-block h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="hidden sm:inline tabular-nums num font-medium">{formatHms(elapsedMs)}</span>
      <span className="hidden sm:inline text-muted-foreground truncate max-w-[120px]">{title}</span>

      {/* Mobile — icon-only (dot + MM:SS) */}
      <span className="sm:hidden tabular-nums num font-medium">{formatMs(elapsedMs)}</span>
    </button>
  );
}
