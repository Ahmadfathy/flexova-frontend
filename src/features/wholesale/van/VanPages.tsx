import { LockKeyhole, HandCoins } from "lucide-react";
import { WholesalePlaceholderPage } from "../WholesalePlaceholderPage";

// ── Van (PosLayout, route-scoped) — FE_13 §1.2, §2-3 ──────────────────

export { VanShiftOpenPage } from "./VanShiftOpenPage";
export { VanTodayPage } from "./VanTodayPage";
export { VanVisitPage } from "./VanVisitPage";

export function VanCollectPage() {
  return <WholesalePlaceholderPage ns="van" titleKey="collect" icon={HandCoins} padded />;
}

export function VanShiftClosePage() {
  return <WholesalePlaceholderPage ns="van" titleKey="shift_close" icon={LockKeyhole} padded />;
}
