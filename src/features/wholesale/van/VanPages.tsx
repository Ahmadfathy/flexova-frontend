import { LockKeyhole, ListChecks, MapPin, HandCoins } from "lucide-react";
import { WholesalePlaceholderPage } from "../WholesalePlaceholderPage";

// ── Van (PosLayout, route-scoped) — FE_13 §1.2, §2-3 ──────────────────

export function VanShiftOpenPage() {
  return <WholesalePlaceholderPage ns="van" titleKey="shift_open" icon={LockKeyhole} padded />;
}

export function VanTodayPage() {
  return <WholesalePlaceholderPage ns="van" titleKey="today" icon={ListChecks} padded />;
}

export function VanVisitPage() {
  return <WholesalePlaceholderPage ns="van" titleKey="visit" icon={MapPin} padded />;
}

export function VanCollectPage() {
  return <WholesalePlaceholderPage ns="van" titleKey="collect" icon={HandCoins} padded />;
}

export function VanShiftClosePage() {
  return <WholesalePlaceholderPage ns="van" titleKey="shift_close" icon={LockKeyhole} padded />;
}
