/**
 * Sector/feature flag registry (FE_13 §13 — flag-awareness).
 * Unregistered flags default to enabled, matching prior modules that never
 * had a real gate — only registered keys below are actually toggleable.
 */
export type FlagKey = "sector.wholesale";

const FLAGS: Record<FlagKey, boolean> = {
  "sector.wholesale": import.meta.env.DEV,
};

export function isFlagEnabled(flag?: string): boolean {
  if (!flag) return true;
  if (flag in FLAGS) return FLAGS[flag as FlagKey];
  return true;
}
