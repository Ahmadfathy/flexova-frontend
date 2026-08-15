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
import type { Product } from "./types";

export interface ThemeConfig {
  name: "aurora" | "noir";
  label_ar: string;
  layout: string;
}

export interface HomeLayoutProps {
  storeName: string;
  featured: Product[];
}

export interface ThemeModule {
  config: ThemeConfig;
  HomeLayout: ComponentType<HomeLayoutProps>;
}
