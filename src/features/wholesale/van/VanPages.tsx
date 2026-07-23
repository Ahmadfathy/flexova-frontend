import { LockKeyhole } from "lucide-react";
import { WholesalePlaceholderPage } from "../WholesalePlaceholderPage";

// ── Van (PosLayout, route-scoped) — FE_13 §1.2, §2-3 ──────────────────

export { VanShiftOpenPage } from "./VanShiftOpenPage";
export { VanTodayPage } from "./VanTodayPage";
export { VanVisitPage } from "./VanVisitPage";
export { VanCollectPage } from "./VanCollectPage";

export function VanShiftClosePage() {
  return <WholesalePlaceholderPage ns="van" titleKey="shift_close" icon={LockKeyhole} padded />;
}
