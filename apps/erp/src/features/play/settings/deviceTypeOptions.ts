import {
  Gamepad2, Gamepad, CircleDot, Table2, Baby, Monitor, Tv2, Dumbbell, Puzzle, Trophy,
  type LucideIcon,
} from "lucide-react";

/** Curated icon choices for a device type — covers every icon already used in
 * play.fixtures.json (gamepad-2/gamepad/circle-dot/table-2/baby) plus a few
 * generic extras for future device types. */
export const DEVICE_TYPE_ICONS: Record<string, LucideIcon> = {
  "gamepad-2": Gamepad2,
  "gamepad": Gamepad,
  "circle-dot": CircleDot,
  "table-2": Table2,
  "baby": Baby,
  "monitor": Monitor,
  "tv-2": Tv2,
  "dumbbell": Dumbbell,
  "puzzle": Puzzle,
  "trophy": Trophy,
};

/** Colors already used in play.fixtures.json ("brand"/"neutral"/"success"/"warning") plus
 * "danger", the remaining semantic token — kept to the app's existing tint palette rather
 * than inventing new colors (Flexova_Design_Foundations.md is the only token source). */
export const DEVICE_TYPE_COLORS = ["brand", "neutral", "success", "warning", "danger"] as const;

export function deviceTypeColorDotClass(color: string): string {
  switch (color) {
    case "brand": return "bg-brand";
    case "success": return "bg-success";
    case "warning": return "bg-warning";
    case "danger": return "bg-danger";
    default: return "bg-muted-foreground/50"; // "neutral" and any unrecognized value
  }
}
