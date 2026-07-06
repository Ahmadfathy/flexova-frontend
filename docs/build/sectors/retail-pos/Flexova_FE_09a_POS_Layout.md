# Flexova — FE_09a — Dedicated POS Layout (`PosLayout`) — build-ready

> **Approved shell addition (Jul 2026).** A dedicated, focused, touch-first layout for the cashier. Route-scoped: all `/pos/*` render in `PosLayout` **instead of** `AppShell`.
> Version: 1.0 — July 2026
> **Source of truth (do not redefine):** `Flexova_FE_00_Foundation` (tokens/appearance/shell/i18n/Fullscreen) · `Flexova_FE_09_Retail_POS` (POS screens mounted inside this layout).
> **Golden constraint:** this is **additive**. It **reuses** every token, theme, dark/light mode, font, `dir/lang`, `StatusPill`/`EtaBadge`, Button/Dialog/Drawer from FE_00. It **does not** modify any token, the three back-office layouts (`sidebar`/`sidebar-split`/`horizontal`), `AppShell`, `Sidebar`, or `Topbar`. New files only.

---

## 1) Why a dedicated layout (not a `data-layout` variant)
The three appearance layouts are **back-office** frames (nav + topbar + content) the user picks in Settings. POS is a different **mode**: full-screen, minimal chrome, large touch targets, no module nav to distract a cashier mid-transaction. So `PosLayout` is **route-driven**, not user-selectable:
- `/pos/*` → `PosLayout`. Everything else → `AppShell`.
- POS still appears in the back-office nav as a **Sector item** (`moduleFlag:"pos"`, FE_00 §14.3). Activating it navigates to `/pos`, which **leaves** `AppShell` and mounts `PosLayout`. **Exit POS** returns to the previous back-office route.

**Entry points (both directions):**
- **Back-office → POS:** the Sector nav item (same tab) **plus** an **`Open POS ↗` quick-launch button in the back-office `Topbar`** that opens `/pos` in a **new tab**, gated by `pos.access`. *This is an **approved additive** change to the FE_00 `Topbar` — a new button only, no other Topbar edits.*
- **POS → Back-office:** `Exit POS` (same tab) **and** `Open Dashboard ↗` (new tab, gated by back-office access) — see §2.

## 2) What it keeps vs drops
**Keeps (a slim POS top bar only):**
- **start:** **Flexova logo block** — occupies **the same column width as the category rail below it (~64px), vertically aligned** to the rail (clean grid alignment) · then **live date + running clock** (updates each second) · terminal + branch label.
- **center/inline:** **shift indicator** (open/closed + cashier) · **online/offline** (+ queue) · **sandbox** badge.
- **end (order matters):** **`Open Dashboard ↗`** — a **green pill with icon** (reference/OTPOS style: `● Dashboard`), placed **before** the journal icon · **Journal** icon · **Terminal settings** icon · **language** toggle · **Fullscreen** toggle · **`Exit POS`** (same tab; **light danger background** `bg-danger` + `text-danger`).
**Drops:** module navigation, global search-everything, notifications tray, breadcrumbs, page headers — none belong on a cashier screen.


## 3) Region map — **3 zones** (RTL-native; `start` = right)

> Decision (approved, GotPOS-informed): a **standalone icon category rail** (adopted), a **product-card grid** (image optional + fallback), and a **ticket panel** whose footer is **one big Pay + Hold + Customer** — everything else (print 80mm, share, return, resend ETA) lives in the ticket **kebab**.

```
┌──────┬───────────────────────────────────────────────────────────────────┐
│◆Flex │  POS TOP BAR (slim, ~52px)   🗓 Mon 6 Jul · ⏱ 14:03 · terminal·branch│
│ logo │   [ shift ● · cashier · online/offline · sandbox? ]                 │
│(rail │     [ ●Dashboard↗(green) · 🧾journal▾ · ⚙terminal▾ · ع/EN▾ · ⛶ · Exit]│
│width)├───────────────────────────────────────────┬───────────────────────┤
├──────┤  [ 🔍 search .......... 🔫 ] [ ▦ density 4–12 ]│  TICKET PANEL (end)  │
│ RAIL │  ┌─────┐ ┌─────┐ ┌─────┐  (image optional,    │  ticket no ·  ⋮ kebab │
│ ~64  │  │ img │ │ img │ │ IMG │   fallback letter)   │  customer · ★points  │
│ icon │  │name │ │name │ │name │                      │  ┌──────────────────┐│
│ cats │  │sku ＋│ │sku ✓│ │sku ＋│  ✓ = in cart        │  │ line · qty/wt · ₤ ││
│ (all,│  └─────┘ └─────┘ └─────┘                      │  │ …                ││
│ groc,│  … grid (variants ▾, ⚖ weight, ⚑ no-code)     │  └──────────────────┘│
│ bev, │                                               │  GRAND TOTAL (bold)  │
│ meat,│                                               │  [    PAY (large)   ]│
│ cloth)│                                              │  [ Hold ] [ Customer ]│
└──────┴───────────────────────────────────────────────┴───────────────────┘
```
Logo block is column-aligned to the rail width (~64px). Popovers (journal/terminal/language) share one `PosPopover` style; Fullscreen is a toggle. `Exit` uses light-danger bg.
```
```
Small screens: rail → horizontal chips above the grid; ticket panel → bottom sheet (peek = total + Pay).
```


## 4) Components (new, under `components/shell/pos/`)
- `PosLayout.tsx` — the frame: top bar + **3-zone** body (rail · grid · ticket); owns fullscreen/exit; reads appearance store for `theme/mode/lang/dir`. The **logo block and the rail share one column** so the logo is width-aligned to the rail (~64px).

> The POS **screens** are FE_09 — this layout frames them via `<Outlet/>`. FE_09 owns: `ProductCard` (**stable internal layout** — see FE_09 §4.3), the **search row + density control (4–12)**, the `TicketPanel` (kebab; customer chip w/ loyalty; footer = **Pay** + **Hold** + **Customer**), the **back-to-register control on Journal/Settings when routed**, and all overlays.

## 5) Routing shape (for Claude Code)
```
// App.tsx (additive branch — do not alter the AppShell branch)
<Routes>
  <Route path="/pos/*" element={<PosLayout/>}>
     … FE_09 routes (register, parked, return, shift/*, journal, settings)
  </Route>
  <Route path="/*" element={<AppShell/>}>
     … FE_01..08 routes (unchanged)
  </Route>
</Routes>
```
**Shift gate:** inside `PosLayout`, if no open shift → render the FE_09 Open-Shift screen only; selling routes are locked until a float is entered.

## 6) Inherited behavior (reuse, not rebuild)
- **Theme / dark-light / font / density:** fully inherited from the appearance store via the existing `data-*` on `<html>`. A cashier can run nile + dark + Arabic; PosLayout adds nothing here.
- **RTL:** logical utilities only (`ms-/me-/ps-/pe-`, `start/end`); grid on `start`, cart on `end`; western digits + `tabular-nums`; barcode/UUID LTR within RTL.
- **Fullscreen:** reuses FE_00 §14.5 Fullscreen API button; PosLayout may **auto-suggest** fullscreen on first enter (respects `prefers-reduced-motion`, dismissible).
- **Offline-first:** `ConnectionIndicator` shows offline + queue; all FE_09 selling/print/drawer work offline (FE_09 §3/§14).

## 7) Responsive
- **Terminal / tablet landscape (primary):** two panes side by side (grid fluid, cart fixed).
- **Small tablet portrait / phone:** grid full-width; **cart becomes a bottom sheet** (peek shows total + Pay; expand shows lines); Pay pinned. Top bar condenses (icons only).
- Touch targets ≥ 44px throughout (FE_00 token).

## 8) Permissions
Entering `PosLayout` requires `pos.access`. Top-bar actions gate individually: shift open/close (`pos.shift.*`), drawer no-sale (`pos.drawer.open`), journal (`pos.journal.view`), terminal settings (`pos.terminal.settings`). **`Open Dashboard ↗`** shows only with back-office access; **`Open POS ↗`** (back-office Topbar) shows only with `pos.access`. Exit is always available.

## 9) i18n (add to `pos` namespace; a few to `shell`)
| key | AR | EN |
|---|---|---|
| pos.layout.exit | خروج من نقطة البيع | Exit POS |
| pos.layout.exit_confirm | فيه تذكرة مفتوحة. تخرج وتسيبها معلّقة؟ | A ticket is open. Exit and park it? |
| pos.layout.online | متصل | Online |
| pos.layout.offline | غير متصل | Offline |
| pos.layout.queue | في الطابور: {{n}} | Queued: {{n}} |
| pos.layout.shift_open | وردية مفتوحة | Shift open |
| pos.layout.shift_closed | لا توجد وردية | No shift |
| pos.layout.fullscreen | ملء الشاشة | Fullscreen |
| pos.layout.open_dashboard | فتح لوحة التحكم ↗ | Open Dashboard ↗ |
| pos.layout.open_pos | فتح نقطة البيع ↗ | Open POS ↗ |
| pos.layout.journal | اليومية | Journal |
| pos.layout.terminal | إعدادات الطرفية | Terminal settings |
| pos.layout.language | اللغة | Language |
| pos.layout.back_to_register | الرجوع لشاشة البيع | Back to register |

## 10) Acceptance criteria
1. `/pos/*` renders inside `PosLayout` (no back-office nav/topbar/breadcrumbs); everything else still renders inside `AppShell` unchanged.
2. **No token or existing shell layout is modified;** only new files under `components/shell/pos/` + one additive router branch.
3. Slim POS top bar shows **Flexova logo (aligned to the rail width) + live date + running clock**, terminal/branch, shift, online/offline (+queue), sandbox, a **green `Dashboard ↗` pill placed before the journal icon**, **Journal/Terminal/Language icons with a unified tooltip (label only)**, a **Fullscreen toggle**, and **`Exit POS` with a light-danger background**.
4. Theme/dark-light/language/dir are inherited live from the appearance store (switching them reflects in POS with no extra wiring).
5. **Exit POS** confirms when a ticket is open, then returns to the prior back-office route.
6. Shift gate: without an open shift, only the Open-Shift screen shows; selling is locked.
7. Responsive: two-pane on landscape; cart → bottom sheet on small screens; touch targets ≥44px; full RTL via logical properties.
8. POS still appears as a Sector nav item in the back-office (`moduleFlag:"pos"`); activating it enters `PosLayout`.
9. **Journal & Terminal settings are screens (routes)** opened from their top-bar icons; each shows a **back-to-register** control. Journal/Terminal/Language icons carry a **unified tooltip (label only)**.
10. **Clock is live** (updates each second); date localized, western digits.
11. **`Exit POS` (same tab)** and **`Open Dashboard ↗` (new tab, gated)** are two distinct actions; and a back-office `Topbar` **`Open POS ↗`** button (new tab, gated `pos.access`) is added **additively** (no other Topbar edits).

*End of FE_09a — Dedicated POS Layout — version 1.0*
