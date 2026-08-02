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

// ── S6 Claims register (spec §7) ────────────────────────────────────────────
export { ClaimsRegisterPage } from "./claims/ClaimsRegisterPage";

// ── S7 Retention + release (spec §8) ────────────────────────────────────────
export { RetentionPage } from "./retention/RetentionPage";

// ── S8 Subcontract + sub-claim (spec §9) ────────────────────────────────────
export { SubcontractsListPage } from "./sub/SubcontractsListPage";
export { SubcontractDetailPage } from "./sub/SubcontractDetailPage";

// ── S9 Actual vs Estimated / Profitability (spec §10) — last screen ────────
export { ProfitabilityPage } from "./profitability/ProfitabilityPage";
