import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "nile" | "emerald" | "graphite";
type Mode = "system" | "light" | "dark";
type Nav = "vertical" | "horizontal";
type Density = "comfortable" | "compact";
type Lang = "ar" | "en";

interface AppearanceState {
  theme: Theme; mode: Mode; nav: Nav; density: Density; lang: Lang;
  collapsed: boolean;
  setTheme: (t: Theme) => void; setMode: (m: Mode) => void;
  setNav: (n: Nav) => void; setDensity: (d: Density) => void;
  setLang: (l: Lang) => void; toggleCollapsed: () => void;
}

export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      theme: "nile", mode: "system", nav: "vertical",
      density: "comfortable", lang: "ar", collapsed: false,
      setTheme: (theme) => set({ theme }),
      setMode: (mode) => set({ mode }),
      setNav: (nav) => set({ nav }),
      setDensity: (density) => set({ density }),
      setLang: (lang) => set({ lang }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: "flexova.appearance" }
  )
);

export const dirOf = (lang: Lang): "rtl" | "ltr" => (lang === "ar" ? "rtl" : "ltr");
