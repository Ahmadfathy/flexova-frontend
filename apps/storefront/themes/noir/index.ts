/** noir — public theme entry point (spec §2 Layer 2). Mirrors aurora's
 * index.ts shape (both satisfy `ThemeModule`), nothing else shared. */
import type { ThemeModule } from "@/lib/core/theme-contract";
import config from "./theme.config";
import { HomeLayout } from "./layouts/HomeLayout";
import { PlpLayout } from "./layouts/PlpLayout";
import { PdpLayout } from "./layouts/PdpLayout";
import { NotFoundLayout } from "./layouts/NotFoundLayout";

const theme: ThemeModule = { config, HomeLayout, PlpLayout, PdpLayout, NotFoundLayout };
export default theme;
