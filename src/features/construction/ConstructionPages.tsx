import { Receipt, ShieldCheck, Users, BarChart3 } from "lucide-react";
import { ConstructionPlaceholderPage } from "./ConstructionPlaceholderPage";

// ── S1 project-workspace facet (spec §11) — Step 0 ─────────────────────────
// Wired directly into `ProjectDetailLayout`/`ProjectOverviewPage` (FE_16) —
// no standalone page component here.

// ── S2 BOQ + Cost Budget editor (spec §3) ──────────────────────────────────
export { BoqEditorPage } from "./boq/BoqEditorPage";

// ── S3 Contract terms (spec §4) ────────────────────────────────────────────
export { ContractTermsPage } from "./contract/ContractTermsPage";

// ── S4 Variation Orders (spec §5) ──────────────────────────────────────────
export { VariationOrdersPage } from "./vo/VariationOrdersPage";
export { VariationOrderEditorPage } from "./vo/VariationOrderEditorPage";

// ── S5 Progress Claim engine (spec §6) ──────────────────────────────────────
export { ClaimEditorPage } from "./claims/ClaimEditorPage";
export { ClaimViewPage } from "./claims/ClaimViewPage";

// ── Remaining screens (S6-S9) — scaffolded as placeholders, one screen per
// build step per the Kickoff order. Real content replaces each export below
// as its step lands; the route registration in App.tsx never changes. ──────

export function ClaimsRegisterPage() {
  return <ConstructionPlaceholderPage titleKey="claims.title" icon={Receipt} bare />;
}

export function RetentionPage() {
  return <ConstructionPlaceholderPage titleKey="retention.accumulated" icon={ShieldCheck} bare />;
}

export function SubcontractsListPage() {
  return <ConstructionPlaceholderPage titleKey="sub.title" icon={Users} bare />;
}

export function SubcontractDetailPage() {
  return <ConstructionPlaceholderPage titleKey="sub.contract" icon={Users} bare />;
}

export function ProfitabilityPage() {
  return <ConstructionPlaceholderPage titleKey="profit.title" icon={BarChart3} bare />;
}
