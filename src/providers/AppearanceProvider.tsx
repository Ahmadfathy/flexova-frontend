import { useEffect } from "react";
import { useAppearance, dirOf } from "@/stores/appearance";
import i18n from "@/i18n";

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const { theme, mode, nav, density, lang, collapsed } = useAppearance();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = mode === "system" ? mq.matches : mode === "dark";
      document.documentElement.setAttribute("data-mode", dark ? "dark" : "light");
    };
    apply();
    if (mode === "system") { mq.addEventListener("change", apply); return () => mq.removeEventListener("change", apply); }
  }, [mode]);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    html.setAttribute("data-nav", nav);
    html.setAttribute("data-density", density);
    html.setAttribute("data-collapsed", String(collapsed));
    html.setAttribute("dir", dirOf(lang));
    html.setAttribute("lang", lang);
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [theme, nav, density, collapsed, lang]);

  return <>{children}</>;
}
