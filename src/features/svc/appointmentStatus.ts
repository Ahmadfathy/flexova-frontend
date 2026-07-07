import type { AppointmentStatus } from "@/stores/svcAppointments";
import type { PillVariant } from "@/components/patterns/StatusPill";

/** Status → block color (FE_11 §4) — shared by the day-grid block and the week-view chip. */
export const APPOINTMENT_STATUS_BLOCK: Record<AppointmentStatus, string> = {
  booked:       "bg-card border-border text-foreground",
  confirmed:    "bg-info-tint border-brand/40 text-brand-text",
  "checked-in": "bg-warning-tint border-warning text-warning-text",
  "in-service": "bg-brand border-brand text-on-brand",
  completed:    "bg-success-tint border-success text-success-text",
  "no-show":    "bg-danger-tint border-danger text-danger-text",
  cancelled:    "bg-muted border-muted-foreground/30 text-muted-foreground line-through",
};

export const APPOINTMENT_STATUS_DOT: Record<AppointmentStatus, string> = {
  booked:       "bg-muted-foreground/40",
  confirmed:    "bg-brand",
  "checked-in": "bg-warning",
  "in-service": "bg-on-brand",
  completed:    "bg-success",
  "no-show":    "bg-danger",
  cancelled:    "bg-muted-foreground",
};

export const APPOINTMENT_STATUS_PILL: Record<AppointmentStatus, PillVariant> = {
  booked: "default",
  confirmed: "active",
  "checked-in": "pending",
  "in-service": "in-progress",
  completed: "approved",
  "no-show": "inactive",
  cancelled: "inactive",
};

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "booked", "confirmed", "checked-in", "in-service", "completed", "no-show", "cancelled",
];
