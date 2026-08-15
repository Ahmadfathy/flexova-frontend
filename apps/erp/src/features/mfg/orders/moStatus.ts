import type { PillVariant } from "@/components/patterns/StatusPill";
import type { MoStatus } from "@/types/mfg";

export const ALL_MO_STATUSES: MoStatus[] = [
  "draft", "approved", "in_progress", "partial", "done", "cancelled",
];

/** Semantic mapping per FE_14 §5: draft/cancelled=neutral, approved=warning, in_progress/partial=info, done=success. */
export function moStatusPillVariant(status: MoStatus): PillVariant {
  switch (status) {
    case "draft":       return "inactive";
    case "approved":    return "pending";
    case "in_progress": return "active";
    case "partial":     return "active";
    case "done":        return "approved";
    case "cancelled":   return "inactive";
  }
}

/** Cancel is only meaningful before the MO is finished or already cancelled. */
export function isMoCancellable(status: MoStatus): boolean {
  return status !== "done" && status !== "cancelled";
}
