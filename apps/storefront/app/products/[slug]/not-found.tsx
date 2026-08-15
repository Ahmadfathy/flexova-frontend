import { getActiveTheme, getCatalogStatic } from "@/lib/core/mock-bff";
import { loadTheme } from "@/lib/core/theme-registry";

/** Rendered by Next when `notFound()` is called inside this segment — a
 * real 404 HTTP status, themed like the rest of the site (spec §4.4:
 * "themed 'not found' + suggestions + catalog link"). */
export default async function ProductNotFound() {
  const [activeTheme, all] = await Promise.all([getActiveTheme(), getCatalogStatic()]);
  const { NotFoundLayout } = await loadTheme(activeTheme);
  return <NotFoundLayout suggestions={all.slice(0, 4)} />;
}
