import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme     = "nile" | "emerald" | "graphite";
export type Mode      = "system" | "light" | "dark";
export type Layout    = "sidebar" | "sidebar-split" | "horizontal";
export type Density   = "comfortable" | "compact";
export type Lang      = "ar" | "en";
export type FontScale = "sm" | "md" | "lg";
export type FontAr    = "plex-arabic" | "cairo";
export type FontEn    = "inter" | "plex-sans";

export interface Branding { logoUrl: string | null; companyName: string; }

interface AppearanceState {
  theme: Theme; mode: Mode; layout: Layout; density: Density; lang: Lang;
  fontScale: FontScale; fontAr: FontAr; fontEn: FontEn;
  branding: Branding; collapsed: boolean;
  setTheme: (t: Theme) => void;
  setMode: (m: Mode) => void;
  setLayout: (l: Layout) => void;
  setDensity: (d: Density) => void;
  setLang: (l: Lang) => void;
  setFontScale: (s: FontScale) => void;
  setFontAr: (f: FontAr) => void;
  setFontEn: (f: FontEn) => void;
  setBranding: (b: Partial<Branding>) => void;
  toggleCollapsed: () => void;
}

export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      theme: "nile", mode: "system", layout: "sidebar",
      density: "comfortable", lang: "ar",
      fontScale: "md", fontAr: "plex-arabic", fontEn: "inter",
      branding: { logoUrl: null, companyName: "" }, collapsed: false,
      setTheme:    (theme)    => set({ theme }),
      setMode:     (mode)     => set({ mode }),
      setLayout:   (layout)   => set({ layout }),
      setDensity:  (density)  => set({ density }),
      setLang:     (lang)     => set({ lang }),
      setFontScale:(fontScale)=> set({ fontScale }),
      setFontAr:   (fontAr)   => set({ fontAr }),
      setFontEn:   (fontEn)   => set({ fontEn }),
      setBranding: (b)        => set((s) => ({ branding: { ...s.branding, ...b } })),
      toggleCollapsed:        () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: "flexova.appearance" }
  )
);

export const dirOf = (lang: Lang): "rtl" | "ltr" => (lang === "ar" ? "rtl" : "ltr");
