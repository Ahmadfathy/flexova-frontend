import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MENU } from "@/config/menu";

export interface BreadcrumbSegment {
  label: string;
  href?: string;     // present = clickable link; absent = current page
  loading?: boolean; // render a skeleton instead of label
}

export interface UseBreadcrumbOptions {
  /**
   * Resolved label for the deepest dynamic segment (e.g. an item name).
   * Provide alongside dynamicLoading=true while the record is fetching.
   */
  dynamicLabel?: string | null;
  dynamicLoading?: boolean;
}

/**
 * Derives breadcrumb segments from the current route and the MENU registry.
 * Returns [] on the dashboard so callers/PageHeader render nothing.
 *
 * Segments for a list page:   [Module (link), SubItem (current)]
 * Segments for a detail page: [Module (link), SubItem (link), Record (current)]
 */
export function useBreadcrumb(opts: UseBreadcrumbOptions = {}): BreadcrumbSegment[] {
  const { pathname } = useLocation();
  const { t } = useTranslation("shell");

  // Dashboard → no breadcrumb
  if (pathname === "/") return [];

  // Find matching top-level module
  const module = MENU.find(m => m.route !== "/" && pathname.startsWith(m.route));
  if (!module) return [];

  // Find matching sub-item (first sub whose route is a prefix of the current path)
  const subItem = module.subItems?.find(s => pathname.startsWith(s.route));

  if (!subItem) {
    // We're at the module root — module itself is the current page
    return [{ label: t(`nav.${module.key}`) }];
  }

  // A detail path goes deeper than the sub-item route (e.g. /inventory/items/123)
  const isDeepPath =
    pathname !== subItem.route && pathname.startsWith(subItem.route + "/");

  if (isDeepPath) {
    const leaf: BreadcrumbSegment = opts.dynamicLoading
      ? { label: "", loading: true }
      : { label: opts.dynamicLabel ?? "" };

    return [
      { label: t(`nav.${module.key}`), href: module.route },
      { label: t(`nav.${subItem.key}`), href: subItem.route },
      leaf,
    ];
  }

  // Sub-item is the current (leaf) page
  return [
    { label: t(`nav.${module.key}`), href: module.route },
    { label: t(`nav.${subItem.key}`) },
  ];
}
