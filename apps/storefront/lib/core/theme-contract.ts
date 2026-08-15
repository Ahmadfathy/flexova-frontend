/**
 * The contract every theme package MUST satisfy (spec §2 Layer 2) — owned
 * by Shared Core, implemented by each `themes/<name>/index.ts`. A theme
 * changes presentation (layout/components/tokens.css) only; it receives
 * data and callbacks from Shared Core, never reaches into a fixture or the
 * mock BFF itself.
 *
 * Grows as later prompts add pages (PDP in S3 adds `ProductLayout`, cart in
 * S4 adds `CartLayout`, etc.) — each addition is implemented by both
 * `aurora` and `noir` at once, so the registry (`theme-registry.ts`) never
 * has to special-case a theme that's missing a piece.
 */
import type { ComponentType } from "react";
import type { Product, Category } from "./types";
import type { PlpResult } from "./catalog";

export interface ThemeConfig {
  name: "aurora" | "noir";
  label_ar: string;
  layout: string;
}

export interface HomeLayoutProps {
  storeName: string;
  featured: Product[];
  categories: Category[];
}

/** spec §5.2 — filter bar + grid + pagination. `result` carries either the
 * streaming static shell (per-card islands the theme wraps in Suspense) or
 * an already-resolved product list (price filter/sort's eager path) — see
 * `catalog.ts`'s `PlpResult`. */
export interface PlpLayoutProps {
  categories: Category[];
  activeCategory?: string;
  activeSort: "featured" | "price_asc" | "price_desc";
  result: PlpResult;
}

export interface ThemeModule {
  config: ThemeConfig;
  HomeLayout: ComponentType<HomeLayoutProps>;
  PlpLayout: ComponentType<PlpLayoutProps>;
}
