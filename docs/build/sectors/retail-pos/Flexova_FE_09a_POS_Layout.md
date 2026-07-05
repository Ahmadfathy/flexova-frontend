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

## 2) What it keeps vs drops
**Keeps (a slim POS top bar only):** terminal + branch label · **shift indicator** (open/closed + cashier) · **online/offline** · **sandbox** badge · **Fullscreen** (reuses FE_00 §14.5 button) · **language toggle** (ar/en) · **Exit POS**.
**Drops:** module navigation, global search-everything, notifications tray, breadcrumbs, page headers — none belong on a cashier screen.
> Decision (adjustable): **slim top bar**, not fully chromeless — a cashier must always see shift + connection + exit. If you later want zero chrome, it's a one-line toggle.

## 3) Region map — **3 zones** (RTL-native; `start` = right)

> Decision (approved, GotPOS-informed): a **standalone icon category rail** (adopted), a **product-card grid** (image optional + fallback), and a **ticket panel** whose footer is **one big Pay + Hold + Customer** — everything else (print 80mm, share, return, resend ETA) lives in the ticket **kebab**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  POS TOP BAR (slim, ~52px)                                                 │
│  [terminal · branch]   [ shift ● · cashier · online/offline · sandbox? ]   │
│                                          [⛶ fullscreen · ع/EN · Exit]      │
├──────┬─────────────────────────────────────────────┬──────────────────────┤
│ RAIL │  PRODUCT GRID  (fluid)                        │  TICKET PANEL (end)  │
│ ~64  │  [ search .................. | 🔫 barcode ]   │  ~360–420px, fixed   │
│ icon │  ┌─────┐ ┌─────┐ ┌─────┐  (image optional,    │  ticket no ·  ⋮ kebab │
│ cats │  │ img │ │ img │ │ IMG │   fallback letter)   │  customer · ★points  │
│ (all,│  │name │ │name │ │name │                      │  ┌──────────────────┐│
│ groc,│  │sku ＋│ │sku ✓│ │sku ＋│  ✓ = in cart        │  │ line · qty/wt · ₤ ││
│ bev, │  └─────┘ └─────┘ └─────┘                      │  │ …                ││
│ meat,│  … grid (variants ▾, ⚖ weight, ⚑ no-code)     │  └──────────────────┘│
│ cloth)│                                              │  subtotal / tax      │
│      │                                               │  GRAND TOTAL (bold)  │
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
- `PosTopBar.tsx` — slim bar (terminal/branch · `ShiftIndicator` · `ConnectionIndicator` · sandbox badge · `FullscreenBtn` reused · lang toggle · `ExitPosBtn`).
- `PosCategoryRail.tsx` — vertical icon+label category rail (active state); collapses to horizontal chips on small screens.
- `ShiftIndicator.tsx` — open/closed dot + cashier name (click → X-read / close, gated).
- `ConnectionIndicator.tsx` — online/offline + queue count (drives the persistent offline state).
- `ExitPosBtn.tsx` — confirm if an open ticket exists (`ConfirmDialog`), else return to prior back-office route.
> The POS **screens** are FE_09 — this layout frames them via `<Outlet/>`. FE_09 owns: `ProductCard` (image optional + letter/icon fallback; badges: `✓ in-cart` / `▾ variants` / `⚖ weight` / `⚑ no eta_code`), the `TicketPanel` (kebab = print 80mm · share · return · resend ETA; customer chip with loyalty points; footer = **Pay (large)** + **Hold** + **Customer**), and all overlays (variant picker, weight, tender).

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
Entering `PosLayout` requires `pos.access`. Top-bar actions gate individually: shift open/close (`pos.shift.*`), drawer no-sale (`pos.drawer.open`). Exit is always available.

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

## 10) Acceptance criteria
1. `/pos/*` renders inside `PosLayout` (no back-office nav/topbar/breadcrumbs); everything else still renders inside `AppShell` unchanged.
2. **No token or existing shell layout is modified;** only new files under `components/shell/pos/` + one additive router branch.
3. Slim POS top bar shows terminal/branch, shift, online/offline (+queue), sandbox (when applicable), fullscreen, language toggle, and Exit.
4. Theme/dark-light/language/dir are inherited live from the appearance store (switching them reflects in POS with no extra wiring).
5. **Exit POS** confirms when a ticket is open, then returns to the prior back-office route.
6. Shift gate: without an open shift, only the Open-Shift screen shows; selling is locked.
7. Responsive: two-pane on landscape; cart → bottom sheet on small screens; touch targets ≥44px; full RTL via logical properties.
8. POS still appears as a Sector nav item in the back-office (`moduleFlag:"pos"`); activating it enters `PosLayout`.

*End of FE_09a — Dedicated POS Layout — version 1.0*
