import { useTranslation } from "react-i18next";
import { formatTime } from "@/lib/format";
import type { Lang } from "@/stores/appearance";
import type { SvcAppointment, AppointmentStatus } from "@/stores/svcAppointments";
import type { SvcProvider } from "./catalog";
import { clientName, findClient, providerName, servicesLabel } from "./catalog";
import { APPOINTMENT_STATUS_BLOCK } from "./appointmentStatus";
import { AppointmentBlock } from "./AppointmentBlock";
import {
  COLUMN_WIDTH, GRID_END_MIN, GRID_HEIGHT, GRID_START_MIN, GUTTER_WIDTH, PX_PER_MIN,
  composeIso, minutesOfDay, providerOffHoursSegments, snapMinutes,
} from "./scheduling";

const HOUR_MARKS = Array.from(
  { length: Math.floor(GRID_END_MIN / 60) - Math.ceil(GRID_START_MIN / 60) + 1 },
  (_, i) => Math.ceil(GRID_START_MIN / 60) + i
);

interface DayGridProps {
  day: Date;
  providers: SvcProvider[];
  appointments: SvcAppointment[];
  interactive: boolean;
  lang: Lang;
  dir: "rtl" | "ltr";
  onEmptySlotTap: (provider: SvcProvider, startIso: string) => void;
  onBlockTap: (appointment: SvcAppointment) => void;
  onReschedule: (appointment: SvcAppointment, providerId: string, startIso: string, durationMin?: number) => void;
}

function statusLabel(t: (k: string) => string, status: AppointmentStatus) {
  return t(`calendar.status.${status}`);
}

export function DayGrid({ day, providers, appointments, interactive, lang, dir, onEmptySlotTap, onBlockTap, onReschedule }: DayGridProps) {
  const { t } = useTranslation("svc");
  const singleColumn = providers.length === 1;

  function handleColumnClick(provider: SvcProvider, e: React.MouseEvent<HTMLDivElement>) {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutesFromTop = (e.clientY - rect.top) / PX_PER_MIN;
    const startMin = snapMinutes(GRID_START_MIN + minutesFromTop);
    onEmptySlotTap(provider, composeIso(day, startMin));
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border bg-card" dir={dir}>
      <div style={{ minWidth: GUTTER_WIDTH + (singleColumn ? 0 : providers.length * COLUMN_WIDTH) }}>
        {/* Header row — provider names, sticky top */}
        <div className="sticky top-0 z-20 flex bg-card border-b border-border">
          <div className="sticky insetInlineStart-0 z-30 bg-card shrink-0" style={{ width: GUTTER_WIDTH }} />
          {providers.map((p) => (
            <div
              key={p.id}
              className="shrink-0 flex items-center justify-center h-11 px-2 text-sm font-semibold text-foreground border-s border-border truncate"
              style={singleColumn ? { flex: 1 } : { width: COLUMN_WIDTH }}
            >
              {providerName(p, lang)}
            </div>
          ))}
        </div>

        {/* Body — time gutter + provider columns */}
        <div className="relative flex" style={{ height: GRID_HEIGHT }}>
          <div className="sticky insetInlineStart-0 z-10 bg-card shrink-0" style={{ width: GUTTER_WIDTH }}>
            {HOUR_MARKS.map((h) => (
              <span
                key={h}
                className="absolute text-[10px] text-muted-foreground tabular-nums px-1"
                style={{ insetBlockStart: (h * 60 - GRID_START_MIN) * PX_PER_MIN - 7, insetInlineEnd: 0 }}
                dir="ltr"
              >
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          <div className="relative flex-1">
            {/* Hour gridlines */}
            {HOUR_MARKS.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-border/60"
                style={{ insetBlockStart: (h * 60 - GRID_START_MIN) * PX_PER_MIN }}
              />
            ))}

            {/* Provider columns — off-hours shading + empty-slot tap target */}
            {providers.map((p, idx) => (
              <div
                key={p.id}
                className="absolute inset-y-0 border-s border-border"
                style={singleColumn ? { insetInlineStart: 0, width: "100%" } : { insetInlineStart: idx * COLUMN_WIDTH, width: COLUMN_WIDTH }}
                onClick={(e) => handleColumnClick(p, e)}
              >
                {providerOffHoursSegments(p, day).map((seg, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 bg-muted-foreground/10"
                    style={{
                      insetBlockStart: seg.top,
                      height: seg.height,
                      backgroundImage: "repeating-linear-gradient(135deg, hsl(var(--muted-foreground) / 0.14) 0px, hsl(var(--muted-foreground) / 0.14) 1px, transparent 1px, transparent 9px)",
                    }}
                  />
                ))}
              </div>
            ))}

            {/* Appointment blocks */}
            {appointments.map((appt) => {
              const columnIndex = providers.findIndex((p) => p.id === appt.provider_id);
              if (columnIndex === -1) return null;
              const top = (minutesOfDay(appt.start) - GRID_START_MIN) * PX_PER_MIN;
              const left = singleColumn ? 0 : columnIndex * COLUMN_WIDTH + 3;
              const width = singleColumn ? "calc(100% - 6px)" : COLUMN_WIDTH - 6;
              const height = appt.duration_min * PX_PER_MIN;
              const client = clientName(findClient(appt.client_id), lang);
              const services = servicesLabel(appt.services, lang);
              const time = formatTime(appt.start);

              return (
                <AppointmentBlock
                  key={appt.id}
                  top={top}
                  left={left}
                  width={width}
                  height={height}
                  colorClass={APPOINTMENT_STATUS_BLOCK[appt.status]}
                  timeLabel={time}
                  clientLabel={client}
                  serviceLabel={services}
                  ariaLabel={`${client} — ${services} — ${time} — ${statusLabel(t, appt.status)}`}
                  interactive={interactive && appt.status !== "cancelled" && appt.status !== "no-show" && appt.status !== "completed"}
                  dir={dir}
                  columnWidth={COLUMN_WIDTH}
                  columnCount={providers.length}
                  singleColumn={singleColumn}
                  onTap={() => onBlockTap(appt)}
                  onCommitMove={(newColumnIndex, startMin) => {
                    const provider = providers[newColumnIndex];
                    if (!provider) return;
                    onReschedule(appt, provider.id, composeIso(day, startMin));
                  }}
                  onCommitResize={(durationMin) => onReschedule(appt, appt.provider_id, appt.start, durationMin)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
