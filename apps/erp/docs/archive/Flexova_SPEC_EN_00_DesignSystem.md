# Flexova — Design System Spec (EN, build-ready)

> Layer 1. Source of truth for tokens/components used by Core + all archetypes.
> Build target: web-first, RTL-native (Arabic primary, English mirror). v1.

## 1. Principles (constraints, not slogans)
1. **Arabic-first / RTL-native** — design RTL as origin; use **logical properties** only (`margin-inline`, `padding-inline`, `inset-inline`, `border-inline-start`). Directional icons mirror in RTL.
2. **Radical simplicity** — one screen = one clear task; hide advanced behind "more". Non-technical users.
3. **Visible trust** — financial + ETA states always explicit; sensitive actions require confirm.
4. **Resilient (offline-first)** — offline is a first-class state, especially POS.
5. **Performance over decoration** — CSS over heavy images; limited, purposeful motion.

## 2. Color tokens
Only `--brand` + `--brand-dark` change per theme. Neutrals + semantics fixed. Tints derived via `color-mix` (adapt to mode automatically).

```css
:root{
  /* neutrals — light */
  --bg:#F4F6FA; --surface:#FFFFFF; --tint-base:#FFFFFF;
  --ink:#0F172A; --muted:#64748B; --line:#E6EAF1;
  /* semantic (fixed across themes) */
  --success:#16A34A; --warning:#D97706; --danger:#DC2626;
  --success-text:#16A34A; --warning-text:#B45309; --danger-text:#DC2626;
  /* theme (default nile) */
  --brand:#1D4FD7; --brand-dark:#1A45BE; --on-brand:#FFFFFF;
  --brand-text:var(--brand-dark);
  /* derived */
  --brand-tint:   color-mix(in srgb, var(--brand) 12%, var(--tint-base));
  --success-tint: color-mix(in srgb, var(--success) 14%, var(--tint-base));
  --warning-tint: color-mix(in srgb, var(--warning) 14%, var(--tint-base));
  --danger-tint:  color-mix(in srgb, var(--danger) 14%, var(--tint-base));
  /* shape */
  --radius:14px; --radius-sm:10px; --radius-pill:999px;
  --shadow:0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.18);
  --shadow-sm:0 1px 2px rgba(15,23,42,.06);
}
html[data-mode="dark"]{
  --bg:#0E141E; --surface:#171F2A; --tint-base:#1E2733;
  --ink:#E7ECF3; --muted:#93A1B5; --line:#29333F;
  --success-text:color-mix(in srgb, white 36%, var(--success));
  --warning-text:color-mix(in srgb, white 40%, var(--warning));
  --danger-text: color-mix(in srgb, white 38%, var(--danger));
  --brand-text:  color-mix(in srgb, white 38%, var(--brand));
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 28px -12px rgba(0,0,0,.6);
  --shadow-sm:0 1px 2px rgba(0,0,0,.35);
}
```
**Themes (brand / brand-dark):** nile `#1D4FD7`/`#1A45BE` · emerald `#059669`/`#047857` · clay `#D6531E`/`#B8420F` · royal `#6D28D9`/`#5B21B6` · teal `#0D9488`/`#0B7A70` · graphite `#475569`/`#334155`. Launch 3 (nile, emerald, graphite); structure ready for 6.

## 3. Mode + theme activation
- Mode follows `prefers-color-scheme` by default; manual user override persists. Priority: **user override > system**.
- Theme: tenant default (admin), optional per-user override. Applied via `data-mode` on `<html>` + JS-set brand vars.

## 4. Typography
- Font: **IBM Plex Sans Arabic** (AR+Latin). Weights 400/500/600/700 only. Fallback `system-ui, sans-serif`.
- Scale (role / px / weight / line-height): Display 28/700/1.2 · H1 22/700/1.25 · H2 18/700/1.3 · H3 15/700/1.35 · Body 14/400-500/1.5 · Small 13/400-500/1.45 · Caption 12/600/1.4 · Micro 11/600/1.4.
- Numbers: **Western digits default** for money (config for Arabic-Indic later). Use `font-variant-numeric: tabular-nums` in tables/amounts. Currency `ج.م` after number, thousands separator, 2 decimals when needed.
- bidi: Latin/numbers inside Arabic render LTR within RTL — always test.

## 5. Spacing / grid
- Spacing scale (base-4, px): 4,8,12,16,20,24,32,40,48,64. Default breathing = 16.
- Radii: container 14 / control 10 / pill 999.
- Grid: 12-col, gutter 16. Breakpoints: mobile <640 (sidebar→drawer), tablet 640–1024 (collapsed icon sidebar), desktop >1024.
- Density: default comfortable; **compact** mode for dense data (ERP tables, POS).

## 6. Layout / App Shell
- Top bar: logo, global search, ETA/sync status, mode toggle, notifications, user/branch.
- Nav (tenant choice): **Vertical** 240px (collapsible to 72px icons) OR **Horizontal** top bar.
- Main: page title + actions + content.
- Mobile: drawer nav (opens from right in RTL); primary actions to bottom bar where needed (POS).
- E-commerce UI is out of this system but shares tokens.

## 7. Components (each ships states: default·hover·focus·active·disabled·loading)
- **Buttons:** Primary(brand), Secondary(neutral border), Ghost, Danger, Icon-only. Sizes sm32/md40(default)/lg48(POS/touch). Visible focus ring always. Loading replaces label + blocks repeat.
- **Inputs/Forms:** Text, Number, Select, Multi-select, Textarea, Search, Date, Toggle, Checkbox, Radio, File. Label above field; helper text; error = red text under + red border. RTL alignment. Long forms → wizard sections.
- **Tables (ERP backbone):** sticky header, column sort, row select, row actions (logical end), pagination or infinite scroll, **compact** variant, right-aligned tabular numbers, status via pills. States: skeleton load, empty, error, no-results.
- **Cards/KPIs:** border + light shadow + large radius; KPI = icon + big value + label + delta (green/red).
- **Modals/Drawers:** modal for confirms/short forms (with scrim); drawer for longer/detail. Sensitive actions require explicit confirm.
- **Secondary nav:** Tabs, Breadcrumbs (mirror RTL), Dropdowns, Accordion.
- **Badges/Pills/Status:** pills for paid/credit/sent/rejected via semantic tints; ETA badge in top bar (connected/offline/syncing).
- **Feedback:** Toast (auto-dismiss), Alert/Banner (persistent e.g. offline), Tooltip.
- Contextual components (time counter, KDS, POS grid) built in sector layer.

## 8. States (every data screen)
1. Loading → skeletons (not empty spinner). 2. Empty → friendly + icon + action ("add first item"). 3. Error → plain-language + cause + retry; no tech codes. 4. No search results → distinct from empty. 5. **Offline (priority)** → persistent indicator; "saving locally, will sync"; per-item: `local / syncing / synced / conflict`; POS fully offline then syncs.

## 9. Iconography / motion
- Icons: single consistent set, outline, uniform weight; directional icons mirror in RTL.
- Motion: purposeful, limited. Durations 150ms (micro), 300–350ms (layout/theme). Easing `cubic-bezier(.2,.8,.2,1)`. Respect `prefers-reduced-motion`.

## 10. Accessibility
- Contrast WCAG AA (body 4.5:1); dark mode tuned to meet it.
- Visible focus ring on every interactive element (keyboard + POS).
- Touch targets ≥ 44×44px (cashier screens).
- Full keyboard operability (fast data entry).
- Correct Arabic `aria` labels; logical RTL reading order.

## 11. i18n
- Arabic default (RTL), English mirror (LTR) via logical properties.
- Dates: Gregorian default, Hijri optional later.
- Currency/numbers configurable per tenant.
- i18n keys from day one — no hard-coded UI strings.
- Components must not break on text-length changes (AR↔EN).

## Acceptance criteria
- All layout uses logical properties; UI flips fully in RTL/LTR with no hard-coded left/right.
- Adding a theme = define only brand + brand-dark; tints/dark auto-adapt.
- Every interactive element has a visible focus state and ≥44px touch target.
- Every data view implements all 5 states incl. offline.
- No hard-coded user-facing strings (all via i18n keys).
