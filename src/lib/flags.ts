/**
 * Sector/feature flag registry (FE_13 §13 — flag-awareness).
 * Unregistered flags default to enabled, matching prior modules that never
 * had a real gate — only registered keys below are actually toggleable.
 */
export type FlagKey =
  | "sector.wholesale" | "mfg.enabled" | "projects.enabled" | "hr" | "construction.enabled"
  | "healthcare.lab" | "healthcare.insurance";

const FLAGS: Record<FlagKey, boolean> = {
  "sector.wholesale": import.meta.env.DEV,
  "mfg.enabled": import.meta.env.DEV,
  "projects.enabled": import.meta.env.DEV,
  "hr": true,
  "construction.enabled": import.meta.env.DEV,
  // FE_18 §9.3 — a consult-only clinic runs with lab/insurance off; both
  // default on here (registered, not just falling through the "unregistered
  // flags default enabled" rule) so they're actually toggleable per tenant
  // once a real settings surface exists, same convention as "hr" above.
  "healthcare.lab": true,
  "healthcare.insurance": true,
};

export function isFlagEnabled(flag?: string): boolean {
  if (!flag) return true;
  if (flag in FLAGS) return FLAGS[flag as FlagKey];
  return true;
}
