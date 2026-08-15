import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useProjectsTimer } from "@/stores/projectsTimer";
import { useProjectsStore } from "@/stores/projectsStore";

interface StartTimerInput {
  project_id: string;
  milestone_id: string | null;
  description_ar: string;
}

/**
 * Shared timer start/stop logic — the single source both `/time` and the Prompt-6
 * Topbar slot / Quick-Add "Start timer" action will call, so there is exactly one
 * code path enforcing "one active timer per user" (kickoff invariant #3).
 */
export function useTimerActions() {
  const { t } = useTranslation("projects");
  const start = useProjectsTimer((s) => s.start);
  const stop = useProjectsTimer((s) => s.stop);
  const addTimerTimeEntry = useProjectsStore((s) => s.addTimerTimeEntry);

  function saveStoppedAsEntry(
    stopped: { project_id: string; milestone_id: string | null; description_ar: string; start_ts: string },
    billable = true,
    offline = false
  ) {
    addTimerTimeEntry({
      project_id: stopped.project_id,
      milestone_id: stopped.milestone_id,
      date: stopped.start_ts.slice(0, 10),
      start_ts: stopped.start_ts,
      stop_ts: new Date().toISOString(),
      description_ar: stopped.description_ar,
      billable,
    }, offline);
  }

  function startTimer(input: StartTimerInput, offline = false) {
    const previous = start(input);
    if (previous) {
      saveStoppedAsEntry(previous, true, offline);
      toast.info(t("time.timer_switched"));
    }
  }

  function stopTimer(billable = true, offline = false) {
    const stopped = stop();
    if (stopped) saveStoppedAsEntry(stopped, billable, offline);
    return stopped;
  }

  return { startTimer, stopTimer };
}
