import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getActiveTheme } from "@/lib/core/mock-bff";
import "./globals.css";
// Both themes' token VALUES ship statically (cheap CSS) — which one applies
// is decided purely by the `data-theme` attribute set below, resolved
// server-side before the HTML streams out. No client-side theme fetch, no
// flash of the wrong theme.
import "@/themes/aurora/tokens.css";
import "@/themes/noir/tokens.css";

export const metadata: Metadata = {
  title: "Flexova Store",
  description: "Flexova storefront — public e-commerce store.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Resolved server-side from StoreConfig (mocked) — spec §2: "no FOUC;
  // appears in the SSR HTML directly." Nothing here runs on the client.
  const activeTheme = await getActiveTheme();

  return (
    <html lang="ar" dir="rtl" data-theme={activeTheme}>
      <body>{children}</body>
    </html>
  );
}
