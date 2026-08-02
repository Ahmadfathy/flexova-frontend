import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";

import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { Button } from "@/components/ui/button";

import { formatTime } from "@/lib/format";
import { useAppearance, dirOf } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore, type AppointmentFormInput } from "@/stores/projectsStore";
import { useMockState } from "../useMockState";
import { AppointmentModal } from "./AppointmentModal";
import type { Appointment } from "@/features/projects/types";

function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
/** Sat→Fri week start (Egypt week), matching the reused Services FE_11 calendar convention. */
function startOfWeekSat(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 1) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function ProjectAppointmentsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();
  const dir = dirOf(lang);
  const can = useCan();

  const allAppointments = useProjectsStore((s) => s.appointments);
  const project = useProjectsStore((s) => s.projects[id]);
  const addAppointment = useProjectsStore((s) => s.addAppointment);
  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canCreate = can("projects.appointment.create");

  const [weekStart, setWeekStart] = useState(() => startOfWeekSat(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string | undefined>(undefined);

  const appointments = useMemo(
    () => (forcedEmpty ? [] : Object.values(allAppointments).filter((a) => a.project_id === id)),
    [allAppointments, id, forcedEmpty]
  );

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const today = new Date();

  const weekdayFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short" });

  function openNew(day?: Date) {
    setModalDate(day ? dateKey(day) : undefined);
    setModalOpen(true);
  }

  function handleSave(input: AppointmentFormInput) {
    addAppointment(id, input);
    toast.success(t("appt.save_success"));
    setModalOpen(false);
  }

  if (loading) {
    return (
      <PageSection>
        <Skeleton className="h-72 w-full" />
      </PageSection>
    );
  }
  if (error) {
    return <PageSection><ErrorState onRetry={reload} /></PageSection>;
  }

  return (
    <div className="space-y-4">
      {isOffline && <OfflineBanner message={t("list.offline_note")} />}

      <PageSection
        title={t("appt.title")}
        actions={
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label={t("appt.prev_week")}>
              <ChevronRight className="h-4 w-4 rtl:hidden" />
              <ChevronLeft className="h-4 w-4 hidden rtl:block" />
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setWeekStart(startOfWeekSat(new Date()))}>
              {t("appt.today")}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label={t("appt.next_week")}>
              <ChevronLeft className="h-4 w-4 rtl:hidden" />
              <ChevronRight className="h-4 w-4 hidden rtl:block" />
            </Button>
            {canCreate && !isOffline && (
              <Button size="sm" onClick={() => openNew()}>{t("appt.new")}</Button>
            )}
          </div>
        }
        padded={false}
      >
        {appointments.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={t("appt.empty_title")}
            description={t("appt.empty_body")}
            action={canCreate && !isOffline && project?.client_id ? { label: t("appt.new"), onClick: () => openNew() } : undefined}
          />
        ) : (
          <div className="overflow-x-auto" dir={dir}>
            <div className="grid grid-cols-7 min-w-[700px] divide-x divide-border rtl:divide-x-reverse">
              {days.map((day) => {
                const dayAppointments = appointments
                  .filter((a) => a.start_ts.slice(0, 10) === dateKey(day))
                  .sort((a, b) => a.start_ts.localeCompare(b.start_ts));
                const isToday = dateKey(day) === dateKey(today);

                return (
                  <div key={dateKey(day)} className="flex flex-col min-h-[240px]">
                    <button
                      type="button"
                      onClick={() => canCreate && !isOffline && openNew(day)}
                      className="shrink-0 flex flex-col items-center gap-0.5 py-2 border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-[11px] font-medium text-muted-foreground">{weekdayFmt.format(day)}</span>
                      <span className={`text-sm font-bold tabular-nums h-6 w-6 rounded-full flex items-center justify-center ${isToday ? "bg-brand text-on-brand" : "text-foreground"}`}>
                        {day.getDate()}
                      </span>
                    </button>

                    <div className="flex-1 p-1.5 space-y-1.5">
                      {dayAppointments.length === 0 ? (
                        <p className="text-center text-[11px] text-muted-foreground/60 pt-4">—</p>
                      ) : (
                        dayAppointments.map((appt: Appointment) => (
                          <div key={appt.id} className="rounded border border-border bg-card p-1.5 text-[11px] leading-tight">
                            <span className="block font-bold tabular-nums text-foreground" dir="ltr">
                              {formatTime(appt.start_ts)}–{formatTime(appt.end_ts)}
                            </span>
                            <span className="block font-semibold text-foreground truncate">{appt.title_ar}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PageSection>

      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultDate={modalDate}
        onSave={handleSave}
      />
    </div>
  );
}
