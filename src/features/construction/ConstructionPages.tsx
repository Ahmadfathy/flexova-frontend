import { ClipboardList, FileSignature, FileDiff, Receipt, ShieldCheck, Users, BarChart3 } from "lucide-react";
import { ConstructionPlaceholderPage } from "./ConstructionPlaceholderPage";

// ── S1 project-workspace facet (spec §11) — Step 0 ─────────────────────────
// Wired directly into `ProjectDetailLayout`/`ProjectOverviewPage` (FE_16) —
// no standalone page component here.

// ── Remaining screens (S2-S9) — scaffolded as placeholders, one screen per
// build step per the Kickoff order. Real content replaces each export below
// as its step lands; the route registration in App.tsx never changes. ──────

export function BoqEditorPage() {
  return <ConstructionPlaceholderPage titleKey="boq.title" icon={ClipboardList} bare />;
}

export function ContractTermsPage() {
  return <ConstructionPlaceholderPage titleKey="contract.retention" icon={FileSignature} bare />;
}

export function VariationOrdersPage() {
  return <ConstructionPlaceholderPage titleKey="vo.title" icon={FileDiff} bare />;
}

export function VariationOrderEditorPage() {
  return <ConstructionPlaceholderPage titleKey="vo.title" icon={FileDiff} bare />;
}

export function ClaimsRegisterPage() {
  return <ConstructionPlaceholderPage titleKey="claims.title" icon={Receipt} bare />;
}

export function ClaimEditorPage() {
  return <ConstructionPlaceholderPage titleKey="claim.title" icon={Receipt} bare />;
}

export function ClaimViewPage() {
  return <ConstructionPlaceholderPage titleKey="claim.title" icon={Receipt} bare />;
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
