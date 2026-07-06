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
- **start:** **Flexova logo** · **live date + clock** (running, updates each second) · terminal + branch label.
- **center/inline:** **shift indicator** (open/closed + cashier) · **online/offline** (+ queue) · **sandbox** badge.
- **end:** **Journal** (popover) · **Terminal settings** (popover) · **Fullscreen** (reuses FE_00 §14.5) · **language toggle** (ar/en) · **`Exit POS`** (same tab → back-office) · **`Open Dashboard ↗`** (new tab, permission-gated).
**Drops:** module navigation, global search-everything, notifications tray, breadcrumbs, page headers — none belong on a cashier screen.
> Notes: **Journal & Terminal settings open as popovers** anchored on their top-bar icons (not routes/drawers) — fast, in-place, dismiss to return to the cashier. **`Exit POS` and `Open Dashboard ↗` are two separate actions** — Exit closes POS in the same tab (shared devices); Open Dashboard launches the back-office in a **new tab** (a manager who wants both open), shown only if the user has back-office access.

## 3) Region map — **3 zones** (RTL-native; `start` = right)

> Decision (approved, GotPOS-informed): a **standalone icon category rail** (adopted), a **product-card grid** (image optional + fallback), and a **ticket panel** whose footer is **one big Pay + Hold + Customer** — everything else (print 80mm, share, return, resend ETA) lives in the ticket **kebab**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  POS TOP BAR (slim, ~52px)                                                 │
│  [◆Flexova · 🗓 Mon 6 Jul 2026 · ⏱ 12:36 · terminal · branch]              │
│   [ shift ● · cashier · online/offline · sandbox? ]                        │
│        [ 🧾 journal▾ · ⚙ terminal▾ · ⛶ fullscreen · ع/EN · Exit · Dashboard↗ ]│
├──────┬─────────────────────────────────────────────┬──────────────────────┤
│ RAIL │  [ 🔍 search .......... 🔫 ] [ ▦ density 4–12 ]│  TICKET PANEL (end)  │
│ ~64  │  ┌─────┐ ┌─────┐ ┌─────┐  (image optional,    │  ticket no ·  ⋮ kebab │
│ icon │  │ img │ │ img │ │ IMG │   fallback letter)   │  customer · ★points  │
│ cats │  │name │ │name │ │name │                      │  ┌──────────────────┐│
│ (all,│  │sku ＋│ │sku ✓│ │sku ＋│  ✓ = in cart        │  │ line · qty/wt · ₤ ││
│ groc,│  └─────┘ └─────┘ └─────┘                      │  │ …                ││
│ bev, │  … grid (variants ▾, ⚖ weight, ⚑ no-code)     │  └──────────────────┘│
│ meat,│                                               │  subtotal / tax      │
│ cloth)│                                              │  GRAND TOTAL (bold)  │
│      │                                               │  ┌──────────────────┐│
│      │                                               │  │    PAY (large)   ││
│      │                                               │  └──────────────────┘│
│      │                                               │  [ Hold ] [ Customer ]│
└──────┴─────────────────────────────────────────────┴──────────────────────┘
```
Small screens: rail → horizontal chips above the grid; ticket panel → bottom sheet (peek = total + Pay).
```


## 4) Components (new, under `components/shell/pos/`)
- `PosLayout.tsx` — the frame: top bar + **3-zone** body (rail · grid · ticket); owns fullscreen/exit; reads appearance store for `theme/mode/lang/dir`.
- `PosTopBar.tsx` — slim bar (start: `PosBrandClock` · terminal/branch; inline: `ShiftIndicator` · `ConnectionIndicator` · sandbox badge; end: `JournalPopoverBtn` · `TerminalPopoverBtn` · `FullscreenBtn` reused · lang toggle · `ExitPosBtn` · `OpenDashboardBtn`).
- `PosBrandClock.tsx` — **Flexova logo + live date + running clock** (updates each second; `Intl` locale-aware, western digits, respects `prefers-reduced-motion` by still ticking but no animation).
- `JournalPopoverBtn.tsx` / `TerminalPopoverBtn.tsx` — open the **Journal** and **Terminal-settings** surfaces as **popovers** anchored on their icons (FE_09 §11/§12 content mounts inside), dismiss to return to the cashier. (If deep-linked as a route, those screens still render with a **back-to-register** control — FE_09.)
- `OpenDashboardBtn.tsx` — opens the back-office (`/`) in a **new tab** (`target="_blank"`); rendered only if the user has back-office access (`app.backoffice.access` / equivalent). Distinct from `ExitPosBtn`.
- `PosCategoryRail.tsx` — vertical icon+label category rail (active state); collapses to horizontal chips on small screens.
- `ShiftIndicator.tsx` — open/closed dot + cashier name (click → X-read / close, gated).
- `ConnectionIndicator.tsx` — online/offline + queue count (drives the persistent offline state).
- `ExitPosBtn.tsx` — confirm if an open ticket exists (`ConfirmDialog`), else return to prior back-office route **in the same tab**.
> The POS **screens** are FE_09 — this layout frames them via `<Outlet/>`. FE_09 owns: `ProductCard` (image optional + letter/icon fallback; badges: `✓ in-cart` / `▾ variants` / `⚖ weight` / `⚑ no eta_code`), the **search row + density control (4–12)**, the `TicketPanel` (kebab = print 80mm · share · return · resend ETA; customer chip with loyalty points; footer = **Pay (large)** + **Hold** + **Customer**), the **back-to-register control on Journal/Settings when routed**, and all overlays (variant picker, weight, tender).

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
| pos.layout.back_to_register | الرجوع لشاشة البيع | Back to register |

## 10) Acceptance criteria
1. `/pos/*` renders inside `PosLayout` (no back-office nav/topbar/breadcrumbs); everything else still renders inside `AppShell` unchanged.
2. **No token or existing shell layout is modified;** only new files under `components/shell/pos/` + one additive router branch.
3. Slim POS top bar shows **Flexova logo + live date + running clock**, terminal/branch, shift, online/offline (+queue), sandbox (when applicable), **journal & terminal popovers**, fullscreen, language toggle, **Exit POS**, and **Open Dashboard ↗**.
4. Theme/dark-light/language/dir are inherited live from the appearance store (switching them reflects in POS with no extra wiring).
5. **Exit POS** confirms when a ticket is open, then returns to the prior back-office route.
6. Shift gate: without an open shift, only the Open-Shift screen shows; selling is locked.
7. Responsive: two-pane on landscape; cart → bottom sheet on small screens; touch targets ≥44px; full RTL via logical properties.
8. POS still appears as a Sector nav item in the back-office (`moduleFlag:"pos"`); activating it enters `PosLayout`.
9. **Journal & Terminal settings open as popovers** from their top-bar icons; if reached as routes, they show a **back-to-register** control (FE_09).
10. **Clock is live** (updates each second); date localized, western digits.
11. **`Exit POS` (same tab)** and **`Open Dashboard ↗` (new tab, gated)** are two distinct actions; and a back-office `Topbar` **`Open POS ↗`** button (new tab, gated `pos.access`) is added **additively** (no other Topbar edits).

*End of FE_09a — Dedicated POS Layout — version 1.0*
