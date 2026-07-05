import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const KEY = "flexova.pos.lastRoute";

/**
 * Mounted once at the router root. Records the last non-POS route so
 * ExitPosBtn can return the cashier to wherever they came from, even
 * after a hard refresh inside /pos.
 */
export function PosExitTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith("/pos")) {
      sessionStorage.setItem(KEY, location.pathname + location.search);
    }
  }, [location]);

  return null;
}

export function getPosExitTarget(): string {
  return sessionStorage.getItem(KEY) || "/";
}
