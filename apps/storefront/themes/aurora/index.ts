/** aurora — public theme entry point (spec §2 Layer 2). This is the only
 * file `lib/core/theme-registry.ts` imports; everything else in this
 * folder is a private implementation detail of the theme. */
import type { ThemeModule } from "@/lib/core/theme-contract";
import config from "./theme.config";
import { HomeLayout } from "./layouts/HomeLayout";

const theme: ThemeModule = { config, HomeLayout };
export default theme;
