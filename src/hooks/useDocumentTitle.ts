import { useEffect } from "react";

const SYSTEM_NAME = "Flexova";
const SEP = " — "; // em dash with spaces

/**
 * Sets document.title to "{pageTitle} — Flexova".
 * Falls back to just "Flexova" when pageTitle is falsy.
 * Called from PageHeader so every routed page gets the correct <title>.
 */
export function useDocumentTitle(pageTitle?: string | null): void {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle}${SEP}${SYSTEM_NAME}` : SYSTEM_NAME;
  }, [pageTitle]);
}
