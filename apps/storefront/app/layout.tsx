import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flexova Store",
  description: "Flexova storefront — monorepo scaffold (FE_21 Phase A). No store features yet.",
};

// RTL-ready default: Arabic-first, matching apps/erp's FE_00 convention.
// Server-side activeTheme resolution (per-theme data-theme/dir) lands in
// Storefront Prompt S1 — this is intentionally the bare scaffold shell.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-mode="light" data-theme="nile">
      <body>{children}</body>
    </html>
  );
}
