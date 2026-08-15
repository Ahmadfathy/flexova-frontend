# Flexova — FE_10 F&B (build-ready)

> **Phase 5 — Sector 2 (F&B), narrow core v1.** Frontend spec for the daily operational surfaces: **Floor plan (visual) · Order (dine-in/takeaway/delivery) · Modifiers · Firing/Courses · KDS**. Built on top of Retail/POS (FE_09). Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — July 2026
> **Source of truth (do not redefine):** `Flexova_UIUX_10_FnB` (this module's UI/UX) · **`Flexova_FE_09_Retail_POS` + `Flexova_FE_09a_POS_Layout` — reused wholesale: `PosLayout` (top bar/rail/clock/tooltips/exit/dashboard), shift, tender modal (mixed/store-credit/loyalty), e-receipt/ETA + 80mm print, offline-first, journal, per-terminal numbering** · `Flexova_FE_00_Foundation` (tokens/components/i18n/appearance) · `Flexova_FE_01_Inventory` (item + **BOM**) · `Flexova_FE_02_Sales_ETA` (document/sign/sync) · `Flexova_FE_05_CRM` (walk-in/loyalty) · `Flexova_FE_04_Accounting` (auto-posting).
> **Narrow-core scope (v1):** Floor plan (visual) · Order screen · Modifiers · Firing/Courses · KDS · Bill/Split · Settle (reuses POS tender). **Deferred to next wave:** the **Menu & Recipe editor** (admin setup) — menu items, modifier groups, and recipes/BOM arrive as **seed data in fixtures**.
> **Golden rule (carried):** **The Check lives long on the table; kitchen and finance are synced but independent.** Items fire to the kitchen at **Fire** (not at settle); the Sales document/e-receipt is generated at **Settle** via the FE_09/FE_02 path. ETA-accepted receipts are corrected via return/credit note only.

---

## 0) Module scope (recap)
**In v1 (narrow core):** visual Floor plan (sections/tables, drag-drop editor, status), Order (dine-in/takeaway/delivery) with Modifiers + Courses + Fire, KDS (stations/KOT), Bill/Split, Settle via POS tender, **BOM depletion feature-flag-aware** (`fnb.recipe`), delivery **channel modeled** (no aggregator API yet).
**Out (v1):** Menu/Modifier/Recipe **editor** (seed via fixtures), reservations, QR self-order, advanced bar costing, aggregator API integration.
Reuses `PosLayout` + shift + tender + e-receipt/ETA + offline + journal from FE_09. Data via `lib/mock/client.ts` reading `fnb.fixtures.json` (cross-references `inventory`, `sales`, `crm`, and **`pos`** fixtures: `pm_*`, `cu_*`, `it_*`, `br_*`, `wh_*`, terminals/shifts).

---

## 1) F&B model (the spine)

| Aspect | Behavior |
|---|---|
| **Check/Order** | Independent **long-lived** entity bound to a table/type; opened, added to in stages; **generates a Sales document/e-receipt at Settle** (extends POS ticket→document). |
| **Fire vs Settle** | Items route to the kitchen at **Fire** (KOT → KDS station); the financial document is generated at **Settle**. Two independent timelines. |
| **Order types** | `dine-in` (table-bound) · `takeaway` (no table) · `delivery` (channel + address). |
| **BOM (flag-aware)** | If `fnb.recipe` on **and** a recipe exists → selling the dish **depletes raw ingredients** (inventory movements on components). Else → dish sold as a direct item. Never blocks. |
| **Reuse** | Shift, tender (mixed/store-credit/loyalty), e-receipt/ETA, offline queue, 80mm print, per-terminal numbering — all from FE_09; **not redefined**. |
| **Flag-don't-block** | Missing `eta_code` on a menu item still sells/prints; document flagged, held from submission (as POS). |

---

## 2) Routes & IA
F&B runs inside **`PosLayout`** (FE_09a) — same top bar (logo/clock/shift/connection/dashboard/journal/terminal/language/fullscreen/exit). Registered as a **Sector module** (`moduleFlag:"fnb"`, `nav.fnb`, permission `fnb.access`).

```
/fnb                       → shift gate → /fnb/floor (or /fnb/shift/open, reuses POS shift)
/fnb/floor                 → Floor plan (visual)                 [§4]
/fnb/order/:checkId        → Order screen (menu + check + fire)  [§5]
/fnb/kds                   → Kitchen Display (stations)          [§7]
/fnb/kds/:stationId        → single-station KDS view
/fnb/bill/:checkId         → Bill / Split                        [§8]
(settle → reuses POS tender modal; journal/settings/shift → reuse FE_09)
```
**Overlays/modals:** Modifiers (§6) · Guests count · Table transfer/merge · Course manager · Void (reason, gated) · Customer quick-pick (FE_05) · Settle = POS tender modal (FE_09 §4.5). **i18n namespace:** `fnb`. AR default + EN.

---

## 3) State systems (reused + F&B-specific)
**A) Order status:** `open · fired · served · billed · settled`(success) · `void`(neutral).
**B) Line status:** `held · fired · preparing · ready · served`(success) · `void`.
**C) Table status:** `available`(neutral) · `occupied`(brand) · `reserved`(warning) · `dirty`(muted).
**D) Payment + ETA (reused from FE_09, independent):** payment `paid/partial` · sync `local/queued/valid/rejected`.
**E) Delivery status:** `received · preparing · out · delivered`.
**Five states** per data screen (loading/empty/error/no_results/**offline**) — offline first-class (order+kitchen work offline; sync later; e-receipt respects legal window). Flag-don't-block as POS.

---

## 4) Screen — Floor plan (`/fnb/floor`) — visual
**Purpose:** see the room, open/enter a table's order.
**Layout:** section tabs (صالة/تراس/VIP) + a **visual canvas** of tables placed by `x,y`, each showing number/seats and a **status color** (available/occupied/reserved/dirty). Occupied tables show order total + timer.
**Interactions:** tap available → **guests count → open Check** → `/fnb/order/:checkId`; tap occupied → enter its order; **transfer/merge/move** tables (gated). 
**Editor mode (`fnb.floor.edit`):** drag-drop table position, set seats/shape, add/remove tables/sections. Persists layout.
**Five states:** loading (canvas skeleton), empty (no tables → prompt to add in editor), error+retry, no-results (section empty), offline (works; changes queue).
**Responsive:** canvas pans/zooms on tablet; small screens → sectioned list fallback with the same statuses.
**Permissions:** `fnb.floor.view`; editor `fnb.floor.edit`. **AR/EN:** `fnb.floor.title`="مخطط الصالة"/"Floor plan", statuses, `fnb.table.open`="فتح طاولة"/"Open table", `fnb.guests`="عدد الضيوف"/"Guests".
**Acceptance:** tables render by coordinates with status colors; open/enter works; editor drag-drop persists; RTL canvas.

## 5) Screen — Order (`/fnb/order/:checkId`) — reuses POS core
**Purpose:** build and fire a check.
**Layout (in `PosLayout`):** **menu grid** (reuses FE_09 `ProductCard` + category rail + search/scanner + density) · **Course tabs** (starters/mains/dessert) · **Check panel** (lines with modifiers + per-line status + course) · footer: **`Fire`** (send selected course/all to kitchen) + **`Bill`** (→ §8). Header: order type, table (if dine-in), guests, waiter, customer chip.
**Interactions:** tap item → **Modifiers overlay (§6)** if it has modifier groups, else adds directly; assign line to a course; **Fire** sets lines `preparing` and emits KOT to the station; line status updates live (ready→served). Void line/order gated (reason). BOM depletion happens on fire/settle per flag.
**Five states:** empty check, loading menu, error, no-results (search), offline (fire queues; kitchen sync later).
**Responsive:** landscape menu+check; small → check as bottom sheet.
**Permissions:** `fnb.order.create`, `fnb.order.fire`, `fnb.order.void`, discount `fnb.discount.override` (soft-block).
**AR/EN:** `fnb.fire`="إرسال للمطبخ"/"Fire", `fnb.bill`="الحساب"/"Bill", `fnb.course`="الطبق"/"Course", `fnb.order_type.*` (dine-in/takeaway/delivery).
**Acceptance:** items add with modifiers + course; Fire emits KOT to the right station and flips line status; reuses POS product card/search/density; BOM depletes when `fnb.recipe` on.

## 6) Overlay — Modifiers
Modifier groups per item: **single/multi**, **required/optional**; price deltas shown (±); confirm adds the line with its modifiers and adjusted price. Required groups block confirm until chosen.
**AR/EN:** `fnb.modifiers.title`="الإضافات"/"Modifiers", `fnb.modifiers.required`="مطلوب"/"Required".
**Acceptance:** required single/multi enforced; price deltas reflected in the line; modifiers print on the KOT.

## 7) Screen — KDS (`/fnb/kds` · `/fnb/kds/:stationId`)
**Purpose:** kitchen sees and bumps orders.
**Layout:** per **station** (grill/drinks/dessert), a column of **KOT tickets**: table/order ref, course, items + modifiers, **per-item timer**, status (`new/preparing/ready`). Actions: **bump** (ready → notifies floor), **recall**, reprint KOT. High-contrast, glanceable (kitchen environment), large text.
**Five states:** no tickets (calm empty), loading, error, offline (queued tickets visible; bump syncs later).
**Responsive:** station columns scroll; single-station view for a mounted kitchen screen.
**Permissions:** `fnb.kds.view`, `fnb.kds.bump`.
**AR/EN:** `fnb.kds.title`="شاشة المطبخ"/"Kitchen display", `fnb.kds.bump`="جاهز"/"Ready", `fnb.kds.recall`="استرجاع"/"Recall".
**Acceptance:** fired items appear at the correct station; timers run; bump flips line to `ready` and notifies the floor; recall works; offline-tolerant.

## 8) Screen — Bill / Split (`/fnb/bill/:checkId`) → Settle via POS
**Purpose:** present the bill, split, and settle.
**Layout:** check lines + totals incl. **service charge** + **tips** (optional) + tax; **Split** control: **equally / by item / by seat** → one or several payment groups. **Settle** opens the **POS tender modal (FE_09 §4.5)** — mixed/store-credit/loyalty — generating the Sales document/e-receipt (FE_02). On settle: order `settled`, table → `dirty` (then `available`).
**Five states:** standard; offline settle queues the document.
**Permissions:** `fnb.bill.view`, `fnb.settle`; service/discount gated.
**AR/EN:** `fnb.service_charge`="رسوم خدمة"/"Service charge", `fnb.tips`="بقشيش"/"Tips", `fnb.split`="تقسيم الحساب"/"Split bill", `fnb.split.equally|by_item|by_seat`.
**Acceptance:** split modes produce correct groups/receipts; settle reuses POS tender + generates the document; table frees after settle; service/tips reflected in totals and posting.

## 9) Reused from POS (not rebuilt)
`PosLayout` (top bar/rail/clock/tooltips/dashboard/exit) · **shift** (open/close/Z + treasury) · **tender modal** (mixed/store-credit/loyalty + change) · **e-receipt/e-invoice + 80mm print + ETA queue/window/resend** · **journal** (payment/sync pills) · **terminal settings** (hardware mock bridge — + KOT printer) · per-terminal numbering · **flag-don't-block** · five-states · RTL/i18n/appearance.

## 10) Module-wide RTL, offline, performance
- RTL-native floor canvas / menu / modifiers / KDS; western digits + `tabular-nums`; `ج.م` after amounts; barcode/UUID LTR-in-RTL.
- **Offline-first:** order + fire + KDS work offline; non-blocking sync; e-receipt respects the legal window (FE_09).
- **Performance:** fast menu (virtualized grid + instant modifiers), light **real-time** order↔kitchen status, floor canvas smooth pan/zoom.

## 11) Coverage matrix
| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Check/Order | order, bill | ✓ | ✓ | fnb.order.* | ✓ |
| Table/Section/Floor | floor (+editor) | ✓ | ✓ | fnb.floor.view/edit | ✓ |
| Menu item + modifiers | order, modifiers | ✓ | ✓ | fnb.order.create | ✓ |
| Course/Firing | order | ✓ | ✓ | fnb.order.fire | ✓ |
| KDS/KOT/Station | kds | ✓ | ✓ | fnb.kds.view/bump | ✓ |
| Delivery channel | order (type) | ✓ | ✓ | fnb.order.create | ✓ |
| Settle (reused) | bill → POS tender | ✓ | ✓ | fnb.settle | ✓ |

## 12) Module acceptance criteria
1. Check is long-lived and table/type-bound; generates a Sales document/e-receipt **only at Settle** (reuses FE_09/FE_02) — never a separate finance source.
2. **Fire** routes items to the correct KDS station (KOT) and flips line status; **Settle** generates the document — two independent timelines.
3. Floor plan is **visual** (tables by coordinates + status colors) with a drag-drop **editor** that persists.
4. Modifiers enforce required single/multi and reflect price deltas; modifiers print on the KOT.
5. Order types dine-in/takeaway/delivery supported; **delivery channel modeled** (no aggregator API).
6. **BOM depletion is feature-flag-aware** (`fnb.recipe`): recipe dishes deplete raw; simple dishes don't; never blocks.
7. Bill supports **split (equally/by item/by seat)** + **service charge** + **tips**; Settle reuses the POS tender modal.
8. Shift/tender/e-receipt/ETA/journal/offline/per-terminal numbering are **reused from FE_09**, not reimplemented.
9. Payment vs sync status independent; flag-don't-block; five states; full RTL via i18n keys.

**Fixtures:** `src/lib/mock/fixtures/fnb.fixtures.json` (delivered as `Flexova_FE_10_FnB_fixtures.json`; place at the standard mock path as `fnb.fixtures.json`). Egyptian context — sections + tables with coordinates/status; an open dine-in check (fired, mixed line statuses) + a takeaway + a delivery check; menu items with **modifier groups** (single required + multi optional) and **seed recipes/BOM** (one flag-on dish depleting raw, one simple dish); courses; KOT tickets across stations (new/preparing/ready); service-charge + tips example; reuses `pos`/`inventory`/`crm` shared IDs (`pm_*`, `cu_*`, `it_*`, `br_*`, `wh_*`, terminals/shifts).

*End of FE_10 F&B (narrow core) — version 1.0*
