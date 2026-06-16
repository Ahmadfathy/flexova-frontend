# Flexova — FE_00 Foundation (build-ready)

> **Phase 4 — first file.** Token/theme system + Appearance + shadcn binding + Tailwind + i18n + folder structure + App Shell wiring + core component inventory.
> Version: **1.1 — June 2026**
> **Source of truth:** `Flexova_SPEC_EN_00_DesignSystem` + `Flexova_Design_Foundations` + `flexova-app-shell.html` (visual reference). Do not redefine anything in those — this file translates them into code.
>
> ⚠️ **READ §14 FIRST — Design Update v1.1.** §14 supersedes parts of §4/§6/§7/§8/§9/§12 per the notes there (menu registry, 3 layout variants, collapse→mini, finalized Topbar + User menu, Fullscreen, font system with per-language fonts + font-size scale, Appearance settings page, and the MatDash-inspired visual language). Where §14 conflicts with an earlier section, **§14 wins.** Build from §1–§13 as the base, then apply §14.

---

## 0) How this file is consumed

This is the **Foundation** every module (FE_01..08) builds on top of. Every value here is final and copy-ready. Claude Code implements the files literally (`globals.css`, `tailwind.config.ts`, appearance store, i18n, shell components). Any later module **imports** from here and never re-defines a token.

---

## 1) Stack (locked)

`React 18 + Vite + TypeScript + TailwindCSS v3.4 + shadcn/ui (Radix) + react-i18next + Zustand + JSON fixtures via a mock layer`.

**Tailwind decision:** lock **v3.4** (stable, matches the requested `tailwind.config.ts`). A future v4 upgrade = move tokens into `@theme` + `@custom-variant dark`. The structure below is compatible with both paths, but the build default is v3.4.

---

## 2) Folder structure

```
src/
├── main.tsx                      # ReactDOM + AppearanceProvider + I18nProvider + DirProvider
├── App.tsx                       # Router + AppShell
├── styles/
│   └── globals.css               # Full tokens (§4) + base + shadcn bridge
├── lib/
│   ├── utils.ts                  # cn() (clsx + tailwind-merge) — required by shadcn
│   ├── format.ts                 # formatMoney(), formatNumber(), formatDate() — western + tabular
│   └── mock/
│       ├── client.ts             # mock layer: reads fixtures with artificial latency + simulated states (error/empty/offline)
│       └── *.fixtures.json       # per module (shipped with its module)
├── stores/
│   └── appearance.ts             # Zustand: theme · mode · nav · density · lang/dir (§7)
├── providers/
│   ├── AppearanceProvider.tsx    # applies data-* on <html> + listens to prefers-color-scheme
│   └── DirProvider.tsx           # Radix DirectionProvider (dir from the store)
├── i18n/
│   ├── index.ts                  # react-i18next init
│   └── locales/
│       ├── ar/                   # common.json + <module>.json … (keys from day one)
│       └── en/
├── components/
│   ├── ui/                       # generated shadcn components (button, input, table, dialog, …) — themed by our tokens
│   ├── shell/                    # AppShell, Sidebar, Topbar, AppearancePopover, EtaBadge, UserChip, MobileDrawer
│   └── patterns/                 # Flexova patterns on top of ui/: DataTable, PageHeader, KpiCard, StatusPill, EmptyState, ErrorState, OfflineBanner, Skeletons
└── features/
    └── <module>/                 # each module: routes + pages + module-specific components (delivered in FE_01..08)
```

**Note:** `components/ui/` = raw themed shadcn. `components/patterns/` = our recurring compositions (do not repeat per module). `components/shell/` = the global frame.

---

## 3) Token layering model (the key)

Four layers, each with a single responsibility:

| Layer | Changes with | Content |
|---|---|---|
| **A — Theme palette** | `data-theme` | `--brand` + `--brand-dark` **only** (HSL channels). Adding a theme = one line. |
| **B — Mode neutrals + semantics** | `data-mode` | Neutrals (`--fx-bg/surface/ink/muted/line/tint-base`) + solid semantics (`--success/--warning/--danger`) + semantic text (`*-text`). |
| **C — shadcn bridge** | static | Maps canonical shadcn names (`--background/--primary/…`) to layer A/B channels. No new colors. |
| **D — Derived tints** | auto-derived | `--brand-tint/--success-tint/…` via `color-mix` — adapt to mode without duplication. |

**Two governing rules:**
1. **Base colors = HSL channels** (`H S% L%` with no `hsl()` wrapper) so opacity modifiers like `bg-primary/50` work.
2. **Tints = `color-mix`** (full color values, used as solid fills only — no opacity modifier).

---

## 4) `src/styles/globals.css` (full file — copy as-is)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================================
   LAYER B — MODE NEUTRALS + SEMANTICS  (HSL channels)
   source: SPEC_00 §2 — converted to HSL channels to support opacity modifiers
   ============================================================ */
:root{
  /* neutrals — light */
  --fx-bg:        220 37% 97%;   /* #F4F6FA */
  --fx-surface:   0 0% 100%;     /* #FFFFFF */
  --fx-tint-base: 0 0% 100%;     /* #FFFFFF */
  --fx-ink:       222 47% 11%;   /* #0F172A */
  --fx-muted:     215 16% 47%;   /* #64748B */
  --fx-line:      218 28% 92%;   /* #E6EAF1 */

  /* semantic solids — fixed across modes and themes */
  --success: 142 76% 36%;        /* #16A34A */
  --warning: 32 95% 44%;         /* #D97706 */
  --danger:  0 72% 51%;          /* #DC2626 */
  --on-brand: 0 0% 100%;

  /* semantic text — lightened in dark (color-mix) */
  --success-text: hsl(var(--success));
  --warning-text: hsl(26 90% 37%);            /* #B45309 (slightly darker for contrast on tint) */
  --danger-text:  hsl(var(--danger));
  --brand-text:   hsl(var(--brand-dark));

  /* shape (SPEC_00 §5) */
  --radius: 14px;                              /* container; control=rounded-sm(10) pill=rounded-full */

  /* derived tints (LAYER D) — auto-adapt to tint-base */
  --brand-tint:   color-mix(in srgb, hsl(var(--brand))   12%, hsl(var(--fx-tint-base)));
  --success-tint: color-mix(in srgb, hsl(var(--success)) 14%, hsl(var(--fx-tint-base)));
  --warning-tint: color-mix(in srgb, hsl(var(--warning)) 14%, hsl(var(--fx-tint-base)));
  --danger-tint:  color-mix(in srgb, hsl(var(--danger))  14%, hsl(var(--fx-tint-base)));

  /* shadow + ease + shell metrics */
  --shadow:    0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.18);
  --shadow-sm: 0 1px 2px rgba(15,23,42,.06);
  --ease: cubic-bezier(.2,.8,.2,1);
  --nav-w: 240px; --nav-w-collapsed: 72px; --topbar-h: 60px;
}

/* DARK overrides */
html[data-mode="dark"]{
  --fx-bg:        218 36% 9%;     /* #0E141E */
  --fx-surface:   215 29% 13%;    /* #171F2A */
  --fx-tint-base: 214 26% 16%;    /* #1E2733 */
  --fx-ink:       215 33% 93%;    /* #E7ECF3 */
  --fx-muted:     215 19% 64%;    /* #93A1B5 */
  --fx-line:      213 21% 20%;    /* #29333F */

  --success-text: color-mix(in srgb, white 36%, hsl(var(--success)));
  --warning-text: color-mix(in srgb, white 40%, hsl(var(--warning)));
  --danger-text:  color-mix(in srgb, white 38%, hsl(var(--danger)));
  --brand-text:   color-mix(in srgb, white 38%, hsl(var(--brand)));

  --shadow:    0 1px 2px rgba(0,0,0,.4), 0 10px 28px -12px rgba(0,0,0,.6);
  --shadow-sm: 0 1px 2px rgba(0,0,0,.35);
}

/* ============================================================
   LAYER A — THEME PALETTE  (only --brand + --brand-dark per theme)
   launch: nile · emerald · graphite — structure ready for six
   ============================================================ */
html[data-theme="nile"]    { --brand: 224 76% 48%; --brand-dark: 224 76% 42%; }
html[data-theme="emerald"] { --brand: 161 94% 30%; --brand-dark: 163 94% 24%; }
html[data-theme="graphite"]{ --brand: 215 19% 35%; --brand-dark: 215 25% 27%; }
/* ready but not enabled at launch: */
html[data-theme="clay"]    { --brand: 17 75% 48%;  --brand-dark: 18 85% 39%; }
html[data-theme="royal"]   { --brand: 263 70% 50%; --brand-dark: 263 69% 42%; }
html[data-theme="teal"]    { --brand: 175 84% 32%; --brand-dark: 175 83% 26%; }
/* fallback if data-theme is unset */
:root{ --brand: 224 76% 48%; --brand-dark: 224 76% 42%; }

/* ============================================================
   LAYER C — shadcn BRIDGE  (canonical names → our channels)
   channels only (H S% L%) so hsl(var(--x) / <alpha>) works
   ============================================================ */
:root{
  --background:            var(--fx-bg);
  --foreground:            var(--fx-ink);
  --card:                  var(--fx-surface);
  --card-foreground:       var(--fx-ink);
  --popover:               var(--fx-surface);
  --popover-foreground:    var(--fx-ink);
  --primary:               var(--brand);
  --primary-foreground:    var(--on-brand);
  --secondary:             var(--fx-bg);      /* neutral fill for secondary buttons */
  --secondary-foreground:  var(--fx-ink);
  --muted:                 var(--fx-bg);      /* shadcn muted = subtle background */
  --muted-foreground:      var(--fx-muted);   /* our secondary text (#64748B) */
  --accent:                var(--fx-bg);
  --accent-foreground:     var(--fx-ink);
  --destructive:           var(--danger);
  --destructive-foreground:0 0% 100%;
  --border:                var(--fx-line);
  --input:                 var(--fx-line);
  --ring:                  var(--brand);
}

/* ============================================================ BASE */
*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; }
body{
  font-family: theme('fontFamily.sans');
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased;
  transition: background .3s var(--ease), color .3s var(--ease);
}
@media (prefers-reduced-motion: reduce){ *{ transition:none!important; animation:none!important; } }
:focus-visible{ outline:2px solid hsl(var(--ring)); outline-offset:2px; border-radius:6px; }
::selection{ background: var(--brand-tint); }
.num{ font-variant-numeric: tabular-nums; }   /* numbers/amounts */
```

> **bidi:** western digits and Latin text inside Arabic render LTR within RTL automatically — test in tables and amounts.

---

## 5) shadcn theming map

| shadcn token | our source | note (collision warning) |
|---|---|---|
| `--background` | `--fx-bg` | app background |
| `--foreground` | `--fx-ink` | primary text |
| `--card` / `--popover` | `--fx-surface` | surfaces |
| `--primary` | `--brand` | follows theme |
| `--primary-foreground` | `--on-brand` | white |
| `--secondary` | `--fx-bg` | neutral secondary button |
| `--muted` | `--fx-bg` | **background**, subtle (≠ our text) |
| `--muted-foreground` | `--fx-muted` | **our secondary text** `#64748B` |
| `--destructive` | `--danger` | solid red (delete button) |
| `--border` / `--input` | `--fx-line` | borders |
| `--ring` | `--brand` | focus ring |
| `--radius` | `14px` | lg=14 · md=12 · sm=10 |

**Critical warning:** the name `--muted` means **background** in shadcn, but in our Design Foundations it means **secondary text**. Resolution: shadcn `--muted-foreground` = our secondary text. Do not use `text-muted` for secondary text — use `text-muted-foreground`.

**Our extended tokens available in Tailwind** (non-standard in shadcn): `success · warning · danger(=destructive) · *-text · brand-tint · success-tint · warning-tint · danger-tint · on-brand` + ETA states (§9).

**Radius usage:** cards/containers `rounded-lg`(14) · buttons/inputs/chips `rounded-sm`(10) · pills/toggles `rounded-full`.

---

## 6) `tailwind.config.ts` (full file — copy as-is)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ['variant', '&:where(html[data-mode="dark"], html[data-mode="dark"] *)'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', "system-ui", "sans-serif"],
      },
      colors: {
        // shadcn canonical (channels → hsl + alpha)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: { DEFAULT: "hsl(var(--card) / <alpha-value>)", foreground: "hsl(var(--card-foreground) / <alpha-value>)" },
        popover: { DEFAULT: "hsl(var(--popover) / <alpha-value>)", foreground: "hsl(var(--popover-foreground) / <alpha-value>)" },
        primary: { DEFAULT: "hsl(var(--primary) / <alpha-value>)", foreground: "hsl(var(--primary-foreground) / <alpha-value>)" },
        secondary: { DEFAULT: "hsl(var(--secondary) / <alpha-value>)", foreground: "hsl(var(--secondary-foreground) / <alpha-value>)" },
        muted: { DEFAULT: "hsl(var(--muted) / <alpha-value>)", foreground: "hsl(var(--muted-foreground) / <alpha-value>)" },
        accent: { DEFAULT: "hsl(var(--accent) / <alpha-value>)", foreground: "hsl(var(--accent-foreground) / <alpha-value>)" },
        destructive: { DEFAULT: "hsl(var(--destructive) / <alpha-value>)", foreground: "hsl(var(--destructive-foreground) / <alpha-value>)" },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        // Flexova extensions — semantics + brand
        brand: { DEFAULT: "hsl(var(--brand) / <alpha-value>)", dark: "hsl(var(--brand-dark) / <alpha-value>)" },
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        danger:  "hsl(var(--danger) / <alpha-value>)",
        "on-brand": "hsl(var(--on-brand) / <alpha-value>)",
        // text-on-tint (full colors — no alpha modifier)
        "brand-text":   "var(--brand-text)",
        "success-text": "var(--success-text)",
        "warning-text": "var(--warning-text)",
        "danger-text":  "var(--danger-text)",
        // tints (full colors)
        "brand-tint":   "var(--brand-tint)",
        "success-tint": "var(--success-tint)",
        "warning-tint": "var(--warning-tint)",
        "danger-tint":  "var(--danger-tint)",
      },
      borderRadius: {
        lg: "var(--radius)",                          // 14
        md: "calc(var(--radius) - 2px)",              // 12
        sm: "calc(var(--radius) - 4px)",              // 10
      },
      boxShadow: { DEFAULT: "var(--shadow)", sm: "var(--shadow-sm)" },
      // base-4 spacing already in Tailwind: 1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64
      transitionTimingFunction: { brand: "cubic-bezier(.2,.8,.2,1)" },
      keyframes: {
        pulse: { "0%,100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: ".4", transform: "scale(.75)" } },
        popin: { from: { opacity: "0", transform: "translateY(-6px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "eta-pulse": "pulse 1.1s var(--ease,cubic-bezier(.2,.8,.2,1)) infinite",
        popin: "popin .18s var(--ease,cubic-bezier(.2,.8,.2,1))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

**Mandatory Tailwind rules (RTL-native — integration decision #2):**
- **Logical utilities only:** `ms-/me-`, `ps-/pe-`, `start-/end-`, `border-s/border-e`, `rounded-s/rounded-e`, `text-start/text-end`. **Forbidden:** `ml/mr/pl/pr/left/right/text-left/text-right`.
- `darkMode` binds to `html[data-mode="dark"]` (not `.dark`) — matches the Appearance system.
- Numbers: use `.num` or `tabular-nums` on every amount/table.

---

## 7) Appearance system (store + provider)

### 7.1 State (governed by a single store)
`theme` (nile/emerald/graphite) · `mode` (system/light/dark — **user priority > system**) · `nav` (vertical/horizontal) · `density` (comfortable/compact) · `lang` (ar/en) → derives `dir` (rtl/ltr). All persisted in `localStorage`, applied via `data-*` on `<html>`.

### 7.2 `src/stores/appearance.ts` (Zustand + persist)
```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "nile" | "emerald" | "graphite";          // structure ready for clay/royal/teal
type Mode = "system" | "light" | "dark";
type Nav = "vertical" | "horizontal";
type Density = "comfortable" | "compact";
type Lang = "ar" | "en";

interface AppearanceState {
  theme: Theme; mode: Mode; nav: Nav; density: Density; lang: Lang;
  collapsed: boolean;                                   // sidebar collapse (persisted too)
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
```

### 7.3 `src/providers/AppearanceProvider.tsx` (applies data-* + listens to system)
```tsx
import { useEffect } from "react";
import { useAppearance, dirOf } from "@/stores/appearance";
import i18n from "@/i18n";

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const { theme, mode, nav, density, lang, collapsed } = useAppearance();

  // mode: system default + user override (user priority)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = mode === "system" ? mq.matches : mode === "dark";
      document.documentElement.setAttribute("data-mode", dark ? "dark" : "light");
    };
    apply();
    if (mode === "system") { mq.addEventListener("change", apply); return () => mq.removeEventListener("change", apply); }
  }, [mode]);

  // theme / nav / density / collapsed / dir + lang
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
```

### 7.4 `src/providers/DirProvider.tsx` (Radix — RTL for all components)
```tsx
import { DirectionProvider } from "@radix-ui/react-direction";
import { useAppearance, dirOf } from "@/stores/appearance";
export function DirProvider({ children }: { children: React.ReactNode }) {
  const lang = useAppearance((s) => s.lang);
  return <DirectionProvider dir={dirOf(lang)}>{children}</DirectionProvider>;
}
```

> `DirectionProvider` is required so Radix dropdown/popover/menu align correctly in RTL — tested component by component (§11).

### 7.5 Provider order in `main.tsx`
```tsx
<I18nextProvider i18n={i18n}>
  <AppearanceProvider>
    <DirProvider>
      <App />
    </DirProvider>
  </AppearanceProvider>
</I18nextProvider>
```

---

## 8) i18n (react-i18next)

- **Arabic default (RTL), English mirror (LTR).** `dir` is derived from `lang` (§7) — no separate storage.
- **Keys from day one** — no hard-coded UI strings. One namespace per module: `common`, `inventory`, `sales`, … + `shell`.
- Dates: Gregorian default. Numbers/currency: western default (`ج.م` after the number in AR, thousands separator, 2 decimals when needed) via `lib/format.ts`.

```ts
// src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import arCommon from "./locales/ar/common.json";
import enCommon from "./locales/en/common.json";
import arShell from "./locales/ar/shell.json";
import enShell from "./locales/en/shell.json";

i18n.use(initReactI18next).init({
  lng: "ar", fallbackLng: "ar",
  ns: ["common", "shell"], defaultNS: "common",
  resources: {
    ar: { common: arCommon, shell: arShell },
    en: { common: enCommon, shell: enShell },
  },
  interpolation: { escapeValue: false },
});
export default i18n;
```

```ts
// src/lib/format.ts — western digits + tabular + ج.م
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const formatNumber = (n: number) => nf.format(n);
export const formatMoney = (n: number, lang: "ar" | "en" = "ar") =>
  lang === "ar" ? `${nf.format(n)} ج.م` : `EGP ${nf.format(n)}`;
export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
```

**Shell key sample (`ar/shell.json`) — Arabic UI content is real data, kept in Arabic:**
```json
{ "nav": { "dashboard":"لوحة المتابعة","inventory":"المخزون","sales":"المبيعات","purchasing":"المشتريات",
  "customers":"العملاء","accounting":"الحسابات","hr":"الموارد البشرية","reports":"التقارير",
  "permissions":"المستخدمون والصلاحيات","settings":"الإعدادات" },
  "topbar": { "search":"ابحث عن فاتورة، عميل، صنف…","eta_connected":"ETA متصل","eta_syncing":"جاري المزامنة…","eta_offline":"غير متصل" },
  "appearance": { "title":"المظهر","theme":"الثيم","mode":"الوضع","mode_system":"النظام","mode_light":"فاتح","mode_dark":"داكن",
  "nav":"القائمة","nav_vertical":"عمودية","nav_horizontal":"أفقية","density":"الكثافة","density_comfortable":"مريحة","density_compact":"مكثّفة" } }
```

**Matching `en/shell.json`:**
```json
{ "nav": { "dashboard":"Dashboard","inventory":"Inventory","sales":"Sales","purchasing":"Purchasing",
  "customers":"Customers","accounting":"Accounting","hr":"HR","reports":"Reports",
  "permissions":"Users & Permissions","settings":"Settings" },
  "topbar": { "search":"Search invoice, customer, item…","eta_connected":"ETA connected","eta_syncing":"Syncing…","eta_offline":"Offline" },
  "appearance": { "title":"Appearance","theme":"Theme","mode":"Mode","mode_system":"System","mode_light":"Light","mode_dark":"Dark",
  "nav":"Menu","nav_vertical":"Vertical","nav_horizontal":"Horizontal","density":"Density","density_comfortable":"Comfortable","density_compact":"Compact" } }
```

---

## 9) App Shell wiring (prototype → React)

Visual reference: `flexova-app-shell.html`. It decomposes into `components/shell/`; its CSS moves to utilities/tokens (§4/§6). Tables, KPIs, and pills move to `components/patterns/`.

### 9.1 Grid (CSS — kept as a custom class in globals.css)
```css
.app{ display:grid; min-height:100vh;
  grid-template-columns:var(--nav-w) 1fr; grid-template-rows:var(--topbar-h) 1fr;
  grid-template-areas:"nav top" "nav main"; transition:grid-template-columns .3s var(--ease); }
html[data-collapsed="true"] .app{ grid-template-columns:var(--nav-w-collapsed) 1fr; }
html[data-nav="horizontal"] .app{ grid-template-columns:1fr; grid-template-areas:"top" "main"; }
@media (max-width:1024px){ html[data-nav="vertical"] .app{ grid-template-columns:var(--nav-w-collapsed) 1fr; } }
@media (max-width:640px){ .app{ grid-template-columns:1fr!important; grid-template-areas:"top" "main"!important; } }
```
> `data-collapsed` is read from the store (`collapsed`) and applied on `<html>` (handled in AppearanceProvider §7.3).

### 9.2 Component tree
```
<AppShell>
 ├─ <Sidebar/>            grid-area:nav · vertical only · collapses to 72px · drawer on mobile (opens from the right in RTL)
 │   └─ NavItem[]         active = bg-brand-tint + text-brand-text + brand bar on start edge
 ├─ <Topbar/>            grid-area:top · sticky
 │   ├─ Hamburger        (mobile only) opens the drawer
 │   ├─ BrandMark        (in the sidebar for vertical; in the topbar for horizontal/mobile)
 │   ├─ HorizontalNav    (nav=horizontal only)
 │   ├─ GlobalSearch     pill · hidden on mobile
 │   ├─ <EtaBadge/>      the signature element (connected/syncing/offline)
 │   ├─ CollapseBtn · AppearanceBtn · NotificationsBtn(badge-dot)
 │   └─ <UserChip/>      avatar + name + branch/role
 ├─ <main class="main">  page content (route outlet)
 ├─ <AppearancePopover/> theme/mode/nav/density — wired to the store
 └─ <MobileDrawer scrim/>
```

### 9.3 `EtaBadge` (the signature component — Visible Trust)
Three states, fed by a real sync value later:
| state | tokens | text (i18n) |
|---|---|---|
| `connected` | `bg-success-tint · text-success-text · dot=success` | `topbar.eta_connected` |
| `syncing` | `bg-brand-tint · text-brand-text · dot=brand + animate-eta-pulse` | `topbar.eta_syncing` |
| `offline` | `bg-warning-tint · text-warning-text · dot=warning` | `topbar.eta_offline` |

### 9.4 Icons
A single consistent outline set (same style as the prototype). Use **`lucide-react`** (same style, tree-shakable). Directional icons (arrows/breadcrumb/chevron) mirror in RTL — wrap with `rtl:-scale-x-100` where needed.

---

## 10) Core component inventory

Each component ships the states: `default · hover · focus · active · disabled · loading`. Visible focus ring always, touch targets ≥ 44px on POS paths.

### 10.1 Button (`ui/button.tsx` — adjusted shadcn variants)
| variant | tokens | use |
|---|---|---|
| `primary` (default) | `bg-primary text-primary-foreground` · hover `brightness-106` | main action |
| `secondary` | `bg-card border-border text-foreground` · hover `bg-background` | secondary |
| `ghost` | `text-muted-foreground` · hover `bg-background text-foreground` | nav/light actions |
| `danger` | `bg-destructive text-destructive-foreground` | risky delete/post |
| `icon` | square · icon only | top bar / row actions |

Sizes: `sm`=h-8(32) · `md`=h-10(40, default) · `lg`=h-12(48, POS). `loading` replaces the label with a spinner and blocks repeats. `disabled` = `opacity-50 + pointer-events-none`. Radius `rounded-sm`.

### 10.2 Inputs & Forms
Text · Number · Select · Multi-select · Textarea · Search · Date · Toggle · Checkbox · Radio · File.
- Label **above** the field · helper below · error = `text-danger-text` + `border-danger`. Alignment `text-start`.
- Long forms → wizard sections. Numbers `tabular-nums`. Search/calendar icon on the logical side (`ps-`).

### 10.3 Table — `patterns/DataTable` (the ERP backbone)
sticky header · column sort · row select (checkbox) · row actions at the **logical end** of the row · pagination or infinite scroll · `compact` variant (follows `data-density`) · numbers `text-end tabular-nums` · status via `StatusPill`.
**Five mandatory states:** skeleton load · empty · error · no-results · (offline at row level: `local/syncing/synced/conflict`).

### 10.4 Card / KPI — `patterns/KpiCard`
Card: `bg-card border rounded-lg shadow-sm`. KPI: icon (in `brand-tint`) + large value (`text-2xl/3xl tabular-nums`) + label + delta (`text-success-text`/`text-danger-text`).

### 10.5 Dialog / Drawer (Radix via shadcn)
Modal for confirms/short forms (scrim). Drawer for longer forms/detail. **Sensitive actions require an explicit confirm** (`AlertDialog`). Test open direction in RTL.

### 10.6 Dropdown / Menu / Tabs / Breadcrumbs / Accordion
All Radix — correct alignment depends on `DirectionProvider`. Breadcrumbs mirror + chevron `rtl:-scale-x-100`.

### 10.7 Badge / Pill — `patterns/StatusPill`
pill = `rounded-full` + semantic tint + `currentColor` dot. Ready states: `paid`(success) · `credit`(warning) · `sent`(brand) · `rejected`(danger). + `EtaBadge` (§9.3).

### 10.8 Feedback
- **Toast** (shadcn/sonner) — instant, auto-dismiss.
- **Banner/Alert** — persistent (`OfflineBanner`: "offline — saving locally, will sync").
- **Tooltip** (Radix).

### 10.9 State patterns (reused in every module)
`Skeletons` · `EmptyState` (icon + message + "add first…" button) · `ErrorState` (plain language + cause + retry, no tech codes) · `NoResults` (distinct from empty) · `OfflineBanner`.

---

## 11) RTL checklist (run component by component)

- [ ] No `left/right` and no `ml/mr/pl/pr` in any file (lint rule).
- [ ] Dropdown/Select/Popover/Menu open and align correctly in `dir=rtl` (DirectionProvider active).
- [ ] Mobile drawer opens from the **right** in RTL.
- [ ] Directional icons (arrows/chevron/breadcrumb) mirrored.
- [ ] Numbers/Latin inside Arabic render LTR (bidi) in tables and amounts.
- [ ] Toggling ar↔en breaks no component (variable text length).
- [ ] Visible focus ring on every interactive element · touch ≥ 44px on POS.

---

## 12) Acceptance criteria (for accepting the Foundation)

1. All layout uses logical properties; the UI flips fully RTL↔LTR with no hard-coded `left/right`.
2. Adding a theme = one `data-theme` line (`--brand` + `--brand-dark`) — tints and dark mode auto-adapt.
3. shadcn components work out-of-the-box on our tokens (`bg-primary`, `bg-card`, `text-muted-foreground`, …) + opacity modifiers (`bg-primary/50`) work.
4. Mode follows the system by default; the user override persists and takes priority.
5. All color values match SPEC_00 (no visual drift from the prototype) — verified by screenshot comparison.
6. No hard-coded UI strings (all i18n keys); numbers western + tabular; currency `ج.م`.
7. Appearance (theme/mode/nav/density/lang) works from the popover, applies via `data-*`, and persists in localStorage.

---

## 13) Deliverables from this file

| file | status |
|---|---|
| `src/styles/globals.css` | §4 + §14.6 — complete |
| `tailwind.config.ts` | §6 + §14.6 — complete |
| `src/stores/appearance.ts` · `providers/*` | §7 + §14.2 — complete |
| `src/i18n/index.ts` · `lib/format.ts` + locales | §8 + §14.9 — complete + sample |
| `src/config/menu.ts` (menu registry) | §14.3 — complete |
| `components/shell/*` (AppShell/Sidebar variants/Topbar/EtaBadge/Fullscreen/UserMenu/MobileDrawer) | §9 + §14.4/§14.5 — build spec |
| `features/settings/AppearanceSettings.tsx` (design customization page) | §14.8 — build spec |
| `components/ui/*` (themed shadcn) + `components/patterns/*` | §10 — inventory + tokens |
| folder structure | §2 |

---

# 14) Design Update v1.1 (supersedes earlier sections where noted)

> All decisions below are **final and build-ready**. Where they conflict with §1–§13, §14 wins.

## 14.1 Summary of changes
1. **Menu = data-driven registry** (independent modules + sub-items + groups CORE / Sector / ADMIN + `Soon` badge for unentitled modules). Supersedes the fixed nav list in §9.2.
2. **Three layout variants** chosen by the user: `sidebar` (single-column accordion, default) · `sidebar-split` (dual-pane rail + panel) · `horizontal` (top bar + mega-menu). Supersedes `nav: vertical|horizontal` in §7.
3. **Sidebar collapse → mini + flyout** (icons only, sub-items on hover).
4. **Topbar finalized:** Collapse · Search · ETA status · Fullscreen(new) · Notifications. **dark/light + language move to the User menu.** Supersedes the Topbar list in §9.2.
5. **User menu** (from the avatar): account/profile links · language switch · dark/light toggle · logout.
6. **Font system:** two fonts per language (AR: IBM Plex Sans Arabic default + Cairo · EN: Inter default + IBM Plex Sans) + **font-size scale** (small/medium/large). Supersedes the single fixed font in §4/§6.
7. **Appearance settings page** (`/settings/appearance`): layout · color theme · logo upload · company name · font size · font per language. The old Appearance popover (§9.2) becomes a quick subset (theme + mode + layout); full control lives on the page.
8. **MatDash-inspired visual language** (level: *inspired*, not copied): softer surfaces, larger radius, soft diffuse shadows, pastel KPI cards, refined pills — applied on top of Flexova's six themes (primary still comes from the chosen theme).

## 14.2 Extended appearance store (supersedes §7.2)
```ts
type Theme   = "nile" | "emerald" | "graphite";        // ready for clay/royal/teal
type Mode    = "system" | "light" | "dark";
type Layout  = "sidebar" | "sidebar-split" | "horizontal";   // was `nav`
type Density = "comfortable" | "compact";
type Lang    = "ar" | "en";
type FontScale = "sm" | "md" | "lg";
type FontAr  = "plex-arabic" | "cairo";
type FontEn  = "inter" | "plex-sans";

interface Branding { logoUrl: string | null; companyName: string; }

interface AppearanceState {
  theme: Theme; mode: Mode; layout: Layout; density: Density; lang: Lang;
  fontScale: FontScale; fontAr: FontAr; fontEn: FontEn;
  branding: Branding; collapsed: boolean;
  setTheme; setMode; setLayout; setDensity; setLang;
  setFontScale; setFontAr; setFontEn; setBranding; toggleCollapsed;
}
// defaults: theme:"nile", mode:"system", layout:"sidebar", density:"comfortable",
//           lang:"ar", fontScale:"md", fontAr:"plex-arabic", fontEn:"inter",
//           branding:{logoUrl:null, companyName:""}, collapsed:false
// persist name: "flexova.appearance"
```
**AppearanceProvider** (extends §7.3) sets on `<html>`: `data-theme`, `data-mode`, **`data-layout`**, `data-density`, `data-collapsed`, **`data-font-scale`**, **`data-font-ar`**, **`data-font-en`**, `dir`, `lang`. (Renames `data-nav` → `data-layout`.)

## 14.3 Menu registry (`src/config/menu.ts`) (supersedes the fixed nav in §9.2)
```ts
import type { LucideIcon } from "lucide-react";
export type MenuGroup = "core" | "sector" | "admin";
export interface MenuItem {
  key: string;            // i18n key under shell.nav.*
  icon: LucideIcon;
  route: string;
  group: MenuGroup;
  order: number;
  permission?: string;    // FE_08 can() key; omit = always visible
  moduleFlag?: string;    // tenant entitlement flag; omit = core (always on)
  status?: "active" | "soon";   // "soon" → shown disabled with a "Soon" badge (upsell)
  subItems?: { key: string; route: string; permission?: string }[];  // in-module tabs
}
```
Rules: render grouped with small section headers — a single **Dashboard** item on top, then **CORE**, then the **Sector** group (header = active sector name; shown only if any sector item is entitled), then **ADMIN**. Filter each item by `moduleFlag` entitled **AND** `can(permission, scope)` (FE_08). `status:"soon"` renders disabled + `Soon` badge instead of hiding. **Each module is its own item; `subItems` are in-module tabs — never nest a module as a tab inside another.** CORE seed: inventory · sales · purchasing · accounting · customers · hr · reports. ADMIN seed: permissions · settings. Sector group: empty at launch (registering e.g. POS with `moduleFlag:"pos"` makes it appear automatically, zero shell changes).

## 14.4 Three layout variants (supersedes §9.1 grid + §9.2 tree)
All three read the **same** registry; user picks via Appearance (`data-layout`). Mobile (<640px): **all three collapse to a drawer** (opens from the right in RTL).

- **`sidebar` (single, default):** one vertical column, items with icon+label grouped by section header. A module with `subItems` is an **accordion** (chevron expands the sub-list inline). `collapsed` → **mini rail** (icons only, section headers hidden); sub-items show in a **hover flyout**. Active item = `bg-brand-tint + text-brand-text` + brand bar on the start edge.
- **`sidebar-split` (dual-pane):** narrow **icon rail** (modules) + an adjacent **panel** showing the selected module's sub-items; sub-groups in the panel are **collapsible** `<div>`s (accordion). The panel hides in `collapsed`.
- **`horizontal`:** modules in a **top bar**; clicking a module opens a **dropdown / mega-menu** with its sub-items (sub-groups shown as columns/sections, **no collapsing** — appear/disappear with the menu). No mini state.

Grid sketch (logical properties; `start/end`, never `left/right`):
```css
html[data-layout="sidebar"] .app,
html[data-layout="sidebar-split"] .app{
  display:grid; grid-template-columns:var(--nav-w) 1fr;
  grid-template-areas:"nav top" "nav main"; }
html[data-layout="sidebar-split"] .app{ --nav-w: calc(72px + 220px); } /* rail + panel */
html[data-collapsed="true"][data-layout="sidebar"] .app{ grid-template-columns:var(--nav-w-collapsed) 1fr; }
html[data-collapsed="true"][data-layout="sidebar-split"] .app{ grid-template-columns:72px 1fr; } /* panel hidden */
html[data-layout="horizontal"] .app{ grid-template-columns:1fr; grid-template-areas:"top" "main"; }
@media (max-width:640px){ .app{ grid-template-columns:1fr!important; grid-template-areas:"top" "main"!important; } }
```

## 14.5 Topbar + User menu (supersedes Topbar list in §9.2)
**Topbar fixed icons** (logical order start→end, RTL-correct, lucide outline, i18n aria-labels):
`CollapseBtn · GlobalSearch · EtaBadge(§9.3) · FullscreenBtn · NotificationsBtn(badge dot)` → then **UserMenu** (avatar).
- **FullscreenBtn:** Fullscreen API (`requestFullscreen`/`exitFullscreen`); icon swaps `Maximize ↔ Minimize` on `document.fullscreenElement`; respects `prefers-reduced-motion`.
- **dark/light and language are NOT standalone Topbar icons** — they live in the User menu.

**UserMenu** (`DropdownMenu` from the avatar): header (avatar + name + plan badge) · profile/account links · **Language** (ar/en inline) · **Dark mode** (toggle inline) · link to **Appearance settings** (§14.8) · **Logout**. RTL-aligned via DirectionProvider.

## 14.6 Font system (supersedes the single font in §4/§6)
**globals.css additions:**
```css
:root{ --font-ar:"IBM Plex Sans Arabic"; --font-en:"Inter"; --font-base:14px; }
html[data-font-ar="cairo"]      { --font-ar:"Cairo"; }
html[data-font-en="plex-sans"]  { --font-en:"IBM Plex Sans"; }
html[lang="ar"]{ --font-active: var(--font-ar); }
html[lang="en"]{ --font-active: var(--font-en); }
html[data-font-scale="sm"]{ --font-base:13px; }
html[data-font-scale="md"]{ --font-base:14px; }
html[data-font-scale="lg"]{ --font-base:16px; }
body{ font-family: var(--font-active), system-ui, sans-serif; font-size:var(--font-base); }
```
**tailwind.config.ts:** change `fontFamily.sans` to `["var(--font-active)","system-ui","sans-serif"]`.
**Loading:** load the four families (IBM Plex Sans Arabic, Cairo, Inter, IBM Plex Sans) via `@fontsource` or Google Fonts; Arabic families must include Arabic subsets. Keep weights lean (400/500/600/700) for performance.

## 14.7 MatDash-inspired visual language (level: inspired)
Apply on top of the six themes — **primary stays from the active theme**, not MatDash purple. Concrete token tweaks (override §4 values):
- **Radius:** `--radius: 16px` (cards softer; controls `rounded-md`≈12, pills `rounded-full`).
- **Shadows (soft, diffuse):** `--shadow: 0 2px 4px rgba(15,23,42,.04), 0 12px 32px -12px rgba(15,23,42,.12);`
- **Surfaces:** keep the bluish off-white bg (`--fx-bg`) with white cards (already in §4) — the soft contrast is the look.
- **KPI cards — pastel fills (new pattern variant):** `KpiCard` gains a `tone` prop (`brand|success|warning|danger|info`) rendering a **filled pastel** card (`bg-*-tint` with `text-*-text`), per MatDash's colored stat cards. Default `tone="brand"`. Ensure text/number contrast on the tint (use `*-text`).
- **Pills:** small, `rounded-full`, pastel bg + same-family dark text + optional leading dot (already StatusPill §10.7 — confirm the softer look).

## 14.8 Appearance settings page (`/settings/appearance`) (new; extends §9.2 popover)
A full page under ADMIN → Settings. Sections:
- **Layout** — pick `sidebar` / `sidebar-split` / `horizontal` (visual cards).
- **Color theme** — the six theme swatches (3 enabled at launch).
- **Mode** — system / light / dark.
- **Font size** — small / medium / large.
- **Fonts** — Arabic font (Plex Arabic / Cairo) + English font (Inter / Plex Sans), each with a live preview.
- **Branding** — logo upload (shown in shell + print) + company name.
All wired to the appearance store (§14.2), applied live via `data-*`, persisted. The **Topbar/User-menu popover** keeps a quick subset (theme + mode + layout); deep control is on this page.
**i18n ns:** `settings`. **Permission:** visible to all; branding/company may be gated by `admin.branch.manage` per tenant policy.

## 14.9 New i18n keys (add to `shell.json` / `settings.json`)
```json
// ar/shell.json additions
{ "topbar": { "fullscreen":"ملء الشاشة","exit_fullscreen":"خروج من ملء الشاشة","notifications":"الإشعارات" },
  "user": { "account":"الحساب","profile":"الملف الشخصي","language":"اللغة","dark_mode":"الوضع الداكن",
            "appearance":"تخصيص التصميم","logout":"تسجيل الخروج" },
  "nav_groups": { "core":"الأساسي","admin":"الإدارة" }, "soon":"قريباً" }
// ar/settings.json
{ "appearance": { "title":"تخصيص التصميم","layout":"التخطيط",
  "layout_sidebar":"قائمة جانبية","layout_split":"جانبية مزدوجة","layout_horizontal":"أفقية",
  "theme":"الثيم","mode":"الوضع","font_size":"حجم الخط","font_sm":"صغير","font_md":"متوسط","font_lg":"كبير",
  "font_ar":"خط العربية","font_en":"خط الإنجليزية","branding":"الهوية","logo":"الشعار","company_name":"اسم الشركة" } }
```
(EN mirror: Fullscreen/Exit fullscreen/Notifications · Account/Profile/Language/Dark mode/Appearance/Logout · Core/Admin · Soon · Appearance/Layout/Sidebar/Split sidebar/Horizontal/Theme/Mode/Font size/Small/Medium/Large/Arabic font/English font/Branding/Logo/Company name.)

## 14.10 Acceptance additions (extend §12)
8. Menu renders from the registry; a `moduleFlag`-off or no-permission item is hidden; a `status:"soon"` item shows disabled with a Soon badge; modules are independent (sub-items never nest another module).
9. All three layouts (`sidebar` / `sidebar-split` / `horizontal`) work, switchable from Appearance, persisted; mobile falls back to a right-opening drawer for all three.
10. `sidebar` collapses to a mini rail with hover flyouts; state persists.
11. Topbar shows Collapse · Search · ETA · Fullscreen · Notifications; Fullscreen toggles real fullscreen + swaps icon; dark/light + language are in the User menu only.
12. Font size (sm/md/lg) and per-language font selection apply live and persist; AR uses Plex Arabic/Cairo, EN uses Inter/Plex Sans.
13. Appearance settings page applies layout/theme/mode/fonts/branding live and persists; logo + company name appear in the shell.
14. Visual language matches the MatDash-inspired direction (softer radius/shadows, pastel KPI cards) **while** primary follows the active theme.

**Next:** `Flexova_FE_01_Inventory.md` + its fixtures (page by page, order per the kickoff).

*End of FE_00 Foundation — version 1.1*
