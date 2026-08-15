/**
 * Theme registry — the one place Shared Core knows theme *names* exist.
 * It does not know anything about a theme's layout/components/tokens; it
 * only maps a `ThemeName` to a dynamic import of that theme's public entry
 * point (`themes/<name>/index.ts`). Adding a theme = one new line here +
 * a new `themes/<name>/` folder — zero edits anywhere else in Shared Core.
 *
 * The import is dynamic (not a static top-of-file import) so only the
 * active theme's module graph is pulled in for a given render — the spec's
 * "switch loads the theme's token set + component set via dynamic import,
 * so only the active theme's bundle ships" (§2).
 */
import type { ThemeName } from "./types";
import type { ThemeModule } from "./theme-contract";

const THEME_LOADERS: Record<ThemeName, () => Promise<{ default: ThemeModule }>> = {
  aurora: () => import("@/themes/aurora"),
  noir: () => import("@/themes/noir"),
};

export async function loadTheme(name: ThemeName): Promise<ThemeModule> {
  const mod = await THEME_LOADERS[name]();
  return mod.default;
}
