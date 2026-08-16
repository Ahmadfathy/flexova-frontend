"use client";

import { useEffect } from "react";
import { captureRefFromQuery } from "./affiliate";

/**
 * Mounted once from the root layout (spec §10 "attribution ← affiliate
 * cookie") so `?ref=CODE` is captured on *any* landing page — a home/PLP/
 * PDP link from an affiliate, not just a direct `/checkout?ref=` visit.
 * S5 originally only captured it from the checkout page itself (disclosed
 * gap at the time); this closes it for real. Renders nothing — the cookie
 * write is the only effect, and it's a no-op when `?ref=` isn't present.
 */
export function RefCapture() {
  useEffect(() => {
    captureRefFromQuery(window.location.search);
  }, []);
  return null;
}
