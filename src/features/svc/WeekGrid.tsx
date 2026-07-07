import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatTime } from "@/lib/format";
import type { Lang } from "@/stores/appearance";
import type { SvcAppointment } from "@/stores/svcAppointments";
import { clientName, findClient, findProvider, providerName, servicesLabel } from "./catalog";
import { APPOINTMENT_STATUS_DOT } from "./appointmentStatus";
import { addDays, dateKey, isSameDay } from "./scheduling";

const WEEKDAY_KEYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];

interface WeekGridProps {
  weekStart: Date;
  today: Date;
  appointments: SvcAppointment[];
  lang: Lang;
  dir: "rtl" | "ltr";
  onDayTap: (day: Date) => void;
  onBlockTap: (appointment: SvcAppointment) => void;
}

/**
 * Week overview — read-only (no drag). Each day column lists that day's appointments
 * as compact time-sorted chips across ALL visible providers; drag/resize stays a
 * Day-view-only affordance (see FE_11 Step 1 memory note for the reasoning).
 */
export function WeekGrid({ weekStart, today, appointments, lang, dir, onDayTap, onBlockTap }: WeekGridProps) {
  const { t } = useTranslation("svc");
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border bg-card" dir={dir}>
      <div className="grid grid-cols-7 min-w-[720px] h-full divide-x divide-border rtl:divide-x-reverse">
        {days.map((day, i) => {
          const dayAppointments = appointments
            .filter((a) => isSameDay(a.start, day))
            .sort((a, b) => a.start.localeCompare(b.start));
          const isToday = dateKey(day) === dateKey(today);

          return (
            <div key={dateKey(day)} className="flex flex-col min-h-0">
              <button
                type="button"
                onClick={() => onDayTap(day)}
                className="shrink-0 flex flex-col items-center gap-0.5 py-2 border-b border-border hover:bg-muted/50 transition-colors"
              >
                <span className="text-[11px] font-medium text-muted-foreground">{t(`calendar.weekday.${WEEKDAY_KEYS[i]}`)}</span>
                <span className={`text-sm font-bold tabular-nums h-6 w-6 rounded-full flex items-center justify-center ${isToday ? "bg-brand text-on-brand" : "text-foreground"}`}>
                  {day.getDate()}
                </span>
              </button>

              <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1.5">
                {dayAppointments.length === 0 ? (
                  <p className="text-center text-[11px] text-muted-foreground/60 pt-4">—</p>
                ) : (
                  dayAppointments.map((appt) => {
                    const provider = findProvider(appt.provider_id);
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => onBlockTap(appt)}
                        className="w-full text-start rounded border border-border bg-card hover:border-brand/40 p-1.5 text-[11px] leading-tight transition-colors"
                      >
                        <span className="flex items-center gap-1 font-bold tabular-nums text-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${APPOINTMENT_STATUS_DOT[appt.status]}`} />
                          {formatTime(appt.start)}
                        </span>
                        <span className="block font-semibold text-foreground truncate">{clientName(findClient(appt.client_id), lang)}</span>
                        <span className="block text-muted-foreground truncate">{servicesLabel(appt.services, lang)}</span>
                        <span className="block text-muted-foreground/80 truncate">{providerName(provider, lang)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
