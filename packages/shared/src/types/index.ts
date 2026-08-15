/**
 * @flexova/shared — types
 *
 * Shared TypeScript contracts consumed by both apps/erp and apps/storefront.
 * Empty placeholder for now (Phase A stands up the monorepo only — no store
 * features yet per FE_21 Phase A scope). Add cross-app types here as the
 * storefront's BFF/mock layer starts mirroring ERP entities (products,
 * orders, etc.) so both sides share one definition instead of drifting.
 */

export type FlexovaTheme = "nile" | "emerald" | "graphite" | "clay" | "royal" | "teal";
export type FlexovaMode = "light" | "dark";
export type FlexovaDir = "rtl" | "ltr";
