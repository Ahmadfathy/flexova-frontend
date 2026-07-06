# Flexova — FE_09 Retail / POS (build-ready)

> **Phase 5 — Sector 1 (first operational archetype on top of the Core).** Retail/POS frontend spec: a touch-first, **offline-first** cashier built on top of Sales+ETA. Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — July 2026
> **Source of truth (do not redefine):** `Flexova_UIUX_09_Retail_POS` (this module's UI/UX) · `Flexova_FE_00_Foundation` (tokens/components/shell/i18n/appearance) · `Flexova_FE_02_Sales_ETA` (**reused: e-receipt/e-invoice model, signing, submission queue, legal window, StatusPill/EtaBadge, 80mm print**) · `Flexova_FE_01_Inventory` (item: price/tax/eta_code/units/**variants**) · `Flexova_FE_05_CRM` (walk-in customer, credit limit/soft-block, loyalty) · `Flexova_FE_04_Accounting` (auto-posting, treasury reconciliation).
> **Golden rule (carried):** **Cashier is offline-first and fast; finance is a single source of truth.** A ticket lives locally on the terminal and closes in one tap, but it **generates a real Sales document + e-receipt** that goes through the exact signing/sync/legal-window logic defined in FE_02. **An ETA-accepted receipt is never edited — correct via return/credit note.**
> **Precision note:** exact ETA figures (B2C window 24–72h, field counts, status enum) follow the current ETA SDK + Jun-2026 regulatory state; treat as configurable, confirm at build.

---

## 0) Module scope (recap)

**In v1:** POS cashier screen (product grid + cart + tender), Register/Terminal, **Shift/Session** (open float → sell → paid-in/out → close with X/Z report + treasury reconciliation), **mixed/split tender**, e-receipt (B2C) + e-invoice (B2B) issue via FE_02 logic, **offline-first sync**, **Variants/Matrix** (clothing size×color), **sold-by-weight** (butchery/fresh), park/retrieve, POS return (**cash or store credit — customer's choice**), void line/ticket, permission-gated discount, **loyalty earn + redeem** at tender.
**Out (extension points defined, not built):** batches/expiry (pharmacy), gold daily-price/making-charge, fuel liters/shift-meters, KDS/tables/delivery (F&B), full loyalty rules engine (POS consumes CRM rules).

Consumes Inventory items (price/tax/eta_code/variants/weight) + CRM customers (walk-in/credit/loyalty) via `lib/mock/client.ts` reading `pos.fixtures.json` (which cross-references `inventory`, `sales`, `crm` fixtures). Ticket close reuses FE_02's document-generation + submission path.

---

## 1) POS model (the spine — drives the whole UI)

| Aspect | Behavior |
|---|---|
| **Ticket** | Independent lightweight entity, lives **locally** on the terminal. Closing it **generates** a Sales document (e-receipt B2C / e-invoice B2B) via FE_02. |
| **Offline-first** | Sell + print + drawer + return all work with **zero network**. Submission enters the ETA queue; syncs on reconnect. Never blocks the cashier. |
| **Channel** | B2C/e-receipt by default (walk-in). Linking a customer with a valid TRN → B2B/e-invoice (FE_02 auto-detection + override). |
| **Numbering** | **Per-terminal** local sequence (avoids offline collision), extends FE_02's per-branch numbering. |
| **Flag, don't block** | Unlike the Sales editor, POS **never blocks the sale**. An item missing `eta_code`/`tax_type` still sells and prints; the generated doc is **flagged** and held from submission until fixed (surfaced in journal/ETA hub). Fast checkout wins; compliance is reconciled after. |
| **Shift-gated** | No selling without an open shift. Terminal is locked to "open shift" until a float is entered. |

---

## 2) Routes & IA

POS runs in a **dedicated focused layout — `PosLayout`** (spec: `Flexova_FE_09a_POS_Layout`), **route-scoped**: all `/pos/*` render in `PosLayout` instead of `AppShell`. It keeps a **slim POS top bar** (terminal/branch · shift · online/offline · sandbox · Fullscreen · language · Exit POS) and drops module nav/search/notifications. POS still appears in the back-office nav as a **Sector item** (`moduleFlag:"pos"`, FE_00 §14.3); activating it enters `PosLayout`. `PosLayout` is **additive** — new files under `components/shell/pos/` + one router branch; it **reuses** all tokens/theme/dark-light/font/`dir` and touches **no** existing token or back-office layout.
> Mounts under `nav.pos` (gated by `pos.access`).

```
/pos                       → shift gate → /pos/register (or /pos/shift/open)
/pos/register              → Cashier screen (grid + cart + tender)     [§4]
/pos/parked                → Parked tickets (drawer/overlay)           [§7]
/pos/return                → POS return (search original)              [§8]
/pos/shift/open            → Open shift (modal/gate)                   [§9]
/pos/shift/close           → Close shift + Z-report                    [§10]
/pos/journal               → Terminal journal (tickets of shift/day)   [§11]
/pos/settings              → Terminal settings (hardware/defaults)     [§12]
```

**Overlays/modals:** Variant picker (§5) · Weight entry (§6) · Tender modal (mixed + store-credit + loyalty, §4.5) · Customer quick-pick/quick-add (reuses FE_05) · Discount (line/ticket, gated) · Paid-in/out (§9.3) · No-sale drawer confirm (gated) · Print preview (80mm default, reuses FE_02 §12).
**i18n namespace:** `pos`. AR default, EN mirror — strings tabled per section.

---

## 3) State systems (reused + POS-specific) — never merged

**A) Payment status (`StatusPill`, reused):** `paid`(success) · `partial`/`credit`(warning) · `returned`(neutral).

**B) ETA/sync status (`StatusPill`/`EtaBadge`, reused from FE_02):** `local`(neutral, not yet submitted) · `queued`(warning) · `clearing`(brand, B2B) · `valid`(success) · `rejected`(danger, plain-Arabic reason + fix&resend).

**C) Ticket lifecycle:** `open` · `parked` · `paid`(closed) · `voided`.

**D) Shift status:** `open` · `closed`. Close variance: `balanced`(success) · `short`(danger) · `over`(warning).

Journal shows **payment pill + sync pill separately** (a ticket can be `paid` cash + `queued`/`rejected` at once). **Five states** per data screen (loading/empty/error/no-results/**offline**) per FE_00 §7 — **offline is first-class**, exercisable via `?mock=offline`.

---

## 4) Screen — Cashier (`/pos/register`) — the central touch screen

### 4.1 Purpose
Ring up a sale in the fewest taps; scanner + keyboard fully drive it; works entirely offline.

### 4.2 Layout
Rendered inside **`PosLayout`** (FE_09a) as **3 zones**, RTL-native: **category rail** (start, icon+label, from `PosLayout`) · **product-card grid** (fluid, middle) · **ticket panel** (end, fixed ~360–420px). Shift/connection/sandbox/fullscreen live in the `PosLayout` top bar.

### 4.3 Components
**Category rail:** provided by `PosLayout` (`PosCategoryRail`) — vertical icon+label list, active state; small screens → horizontal chips above the grid.
**Search row:** `SearchInput` (start, fluid) with **strengthened contrast** — a visible border (`border-strong` on rest, brand on focus), a clear leading search icon, and a **distinct barcode/scanner button** (bordered, filled-icon, not a faint glyph) so both read clearly. On the **opposite end of the same row: a density control (`GridDensity` 4→12 columns)** — a quick stepper/segmented control the cashier adjusts live; the choice is **persisted per-terminal** (settings), so every screen size can be dialed in.
**Product grid:** responsive grid whose column count is driven by the **density control (4–12)**, not fixed breakpoints — this fixes the card breakage on smaller screens. `ProductCard` tiles have a **stable internal layout** (fixed image/fallback area on top; name; SKU/hint; a bottom row that always aligns **price · action**) so the `＋`/**`✓` in-cart** (with qty) and price never misalign as columns change. Fallback = category icon or first letter (perf/offline: no image dependency). Badges: **`▾ variants`** (opens picker §5), **`⚖ weight`** (opens weight entry §6), **`⚑ no eta_code`** (flag-don't-block: still sells). **Always-on barcode capture** (scanner/keyboard wedge → resolves straight to a `sku`/weighted line). OOS still tappable (config).
**Ticket panel:** header = `ticket no` + **kebab** (`print 80mm` · `share` · `return` · `resend ETA`); **customer chip** (name + type + **loyalty points/value** if enabled + available credit if credit); line list (name/variant · qty **or** weight · price · line total) with tap-to-edit qty/weight, delete, **line discount** (gated) and ticket-level discount; totals (subtotal · discounts · tax by type · rounding · **grand total bold**).
**Footer (simplified — GotPOS-informed):** one **`Pay` (primary, large)** + two secondary: **`Hold`** (park) · **`Customer`**. `discount`/`drawer`/`return` reachable via cart line actions + kebab; no crowded 4-button bar.

### 4.4 Fast-sale flow
Scan/tap items → cart updates live → `pay` → Tender modal → confirm → **print 80mm e-receipt + QR** → drawer opens → cart resets. Target: sub-second scan-to-line, no jank.

### 4.5 Tender modal (mixed / store-credit / loyalty)
Large method buttons: `cash` · `card` · `wallet` · `fawry` · `credit` (shows customer **available credit**, soft-block over limit via `crm.credit.override`) · **`store_credit`** (if customer/voucher balance) · **`loyalty`** (redeem points → shows balance + value). Enter an amount per method; **remaining/change** updates live; **mixed** allowed (multiple tenders on one ticket); change computed on cash only. Confirm closes the ticket and generates the document.

### 4.6 Five states
Loading (grid skeleton) · empty (no products / category empty) · error (catalog load fail + retry) · no-results (search echoes query) · **offline** (persistent banner; sale/print/drawer work; generated docs show `local`→`queued`; B2C nearing-window docs flagged for the journal/hub).

### 4.7 Responsive
Optimized for tablet/terminal landscape. Desktop: grid + side cart. Small tablet/phone: cart becomes a bottom sheet; grid full-width; Pay pinned. Touch targets ≥ FE_00 minimum.

### 4.8 Permissions (`pos.*`)
`pos.access` (enter POS) · `pos.sell` (ring up) · `pos.discount.override` (over-limit discount) · `pos.void` · `pos.drawer.open` (no-sale) · scope by branch/terminal. No `pos.access` → module hidden.

### 4.9 AR / EN
| key | AR | EN |
|---|---|---|
| pos.title | نقطة البيع | Point of Sale |
| pos.pay | دفع | Pay |
| pos.park | تعليق | Park |
| pos.return | مرتجع | Return |
| pos.customer | عميل | Customer |
| pos.discount | خصم | Discount |
| pos.drawer | فتح الدرج | Open drawer |
| pos.exit | خروج | Exit |
| pos.change_due | الباقي | Change due |
| pos.remaining | المتبقّي | Remaining |
| pos.walk_in | عميل نقدي | Walk-in |
| pos.tender.store_credit | رصيد متجر | Store credit |
| pos.tender.loyalty | نقاط ولاء | Loyalty points |
| pos.offline | غير متصل — البيع يعمل ويتزامن لاحقاً | Offline — selling works, syncs later |
| pos.search_placeholder | ابحث بالاسم أو الباركود… | Search by name or barcode… |
| pos.scanner | مسح باركود | Scan barcode |
| pos.density | كثافة العرض | Grid density |
| pos.density_cols | {{n}} أعمدة | {{n}} columns |

---

## 5) Overlay — Variant picker

Opens over the grid when tapping a model. **Matrix size×color** as a tappable grid; available vs out-of-stock (zero balance → disabled). Tap adds the specific `sku` to the cart. Direct barcode of a variant bypasses the picker.
**Permissions:** inherits `pos.sell`. **AR/EN:** `pos.variant.pick`="اختر المقاس واللون"/"Pick size & color", `pos.variant.oos`="غير متوفر"/"Out of stock".
**Acceptance:** model resolves to one `sku`; OOS variants disabled; barcode skips the picker.

---

## 6) Overlay — Weight entry (sold-by-weight)

For `sold_by:"weight"` items: read connected scale (if configured) **or** large manual weight field **or** a weighted barcode (EAN-13 embedded weight/price). Displays `weight × price_per_kg = line_total`. Unit = kg (ETA unit code).
**AR/EN:** `pos.weight.title`="الوزن"/"Weight", `pos.weight.per_kg`="سعر الكيلو"/"Price / kg".
**Acceptance:** weighted line computes from weight × price/kg; scale/manual/barcode all produce the same line shape.

---

## 7) Screen — Parked tickets (`/pos/parked`)

List of parked tickets (no · time · items · total · customer). **Retrieve** loads it back into the cart as the active ticket. Multiple parked in parallel. **AR/EN:** `pos.parked.title`="التذاكر المعلّقة"/"Parked tickets", `pos.parked.retrieve`="استرجاع"/"Retrieve".
**Acceptance:** park keeps the ticket `open`; retrieve restores exact lines/customer; parallel parks supported.

---

## 8) Screen — POS return (`/pos/return`)

Search the **original receipt** (number/QR/barcode) → show its lines → select returned lines/qty + **reason** → refund. Refund method: **as original** when a receipt exists. **Return without original receipt** (gated): cashier chooses **cash or store credit — customer's choice, both supported**; store credit is credited to a linked customer or **printed as a bearer voucher** for walk-in. Generates an **inbound stock movement** + **credit note + linked ETA note** (reuses FE_02 §7).
**Permissions:** `pos.return`; no-original path requires `pos.return.noreceipt`.
**AR/EN:** `pos.return.search`="ابحث بالإيصال الأصلي"/"Search original receipt", `pos.return.reason`="سبب المرتجع"/"Return reason", `pos.return.method`="طريقة الردّ"/"Refund method", `pos.return.store_credit`="رصيد متجر"/"Store credit", `pos.return.cash`="كاش"/"Cash".
**Acceptance:** linked return refunds as original + creates credit note; no-original return offers cash **or** store credit (customer's choice); inbound movement created.

---

## 9) Screen — Open shift (`/pos/shift/open`) + drawer ops

### 9.1 Open shift (gate)
Modal on entering POS without an open shift: **opening float** + confirm → shift `open`, selling unlocked.
### 9.2 X-report (read)
Mid-shift read (no close): running totals per tender, sales/returns counts, cash expected. Printable.
### 9.3 Paid-in / Paid-out
Add/remove cash from the drawer with reason + amount (petty cash). Appears in reconciliation. Gated `pos.paidinout`.
**AR/EN:** `pos.shift.open`="فتح وردية"/"Open shift", `pos.shift.float`="عهدة البداية"/"Opening float", `pos.shift.xreport`="قراءة الوردية"/"Shift read (X)", `pos.paidin`="إيداع"/"Paid in", `pos.paidout`="سحب"/"Paid out".
**Permissions:** `pos.shift.open`. **Acceptance:** no sale before a shift is open; float recorded; paid-in/out reflected in totals.

---

## 10) Screen — Close shift + Z-report (`/pos/shift/close`)

Count cash (optionally per tender) → system shows **expected vs counted + variance** (balanced/short/over, colored) → confirm → **Z-report** (sales, returns, paid-in/out, tax, per-tender breakdown, treasury settlement) printable → terminal locks until a new shift. Close **auto-posts** the treasury reconciliation entry (FE_04).
**Permissions:** `pos.shift.close`.
**AR/EN:** `pos.shift.close`="إغلاق الوردية"/"Close shift", `pos.shift.expected`="المتوقّع"/"Expected", `pos.shift.counted`="المعدود"/"Counted", `pos.shift.variance`="الفرق"/"Variance", `pos.shift.zreport`="تقرير الوردية (Z)"/"Shift report (Z)".
**Acceptance:** variance computed (expected−counted); Z-report renders all sections; close posts one balanced treasury entry; terminal locks after close.

---

## 11) Screen — Terminal journal (`/pos/journal` · **also a top-bar popover**)

**Primary surface = a popover** anchored on the top-bar `journal` icon (FE_09a) — opens in-place over the cashier, dismiss to return. When reached as a **route** (`/pos/journal`, e.g. deep link), the screen renders a clear **"back to register" control** (`pos.layout.back_to_register`) at the top so the cashier is never stranded.
Content: tickets of the current shift/day with **payment pill + sync pill** (independent), search/filter by status. **Resend** rejected/queued (reuses `sales.eta.resend`); tap a ticket → its issued receipt view (FE_02 §6, 80mm). Inherits the ETA hub (FE_02 §10) for cross-branch compliance view.
**Permissions:** `pos.journal.view`.
**AR/EN:** `pos.journal.title`="يومية الطرفية"/"Terminal journal", `pos.journal.resend`="إعادة إرسال"/"Resend", `pos.layout.back_to_register`="الرجوع لشاشة البيع"/"Back to register".
**Acceptance:** opens as a popover from the top bar; when routed, a back-to-register control is present; payment and sync statuses shown separately; rejected shows plain-Arabic reason; resend works; ticket opens its 80mm receipt.

---

## 12) Screen — Terminal settings (`/pos/settings` · **also a top-bar popover**)

**Primary surface = a popover** anchored on the top-bar `terminal` icon (FE_09a) — opens in-place over the cashier, dismiss to return. When reached as a **route**, the screen renders a clear **"back to register" control** at the top.
Bind hardware (**80mm printer / cash drawer / barcode scanner / scale**) with **test print** and **test drawer**; default warehouse + price list; local numbering behavior; ETA device activation/access-token (base in FE_02 §11). 
**Permissions:** `pos.terminal.settings` (admin/manager).
> **MVP decision (approved):** all hardware (80mm printer / cash drawer / barcode scanner / scale) runs behind a **mock bridge interface** — no real device I/O yet. Test print/drawer/scan/weigh are simulated so every flow is exercisable; real device integration lands with the **Backend/native layer** (module's last stage).
**AR/EN:** `pos.settings.title`="إعدادات الطرفية"/"Terminal settings", `pos.settings.printer`="الطابعة"/"Printer", `pos.settings.drawer`="الدرج"/"Cash drawer", `pos.settings.scanner`="السكانر"/"Scanner", `pos.settings.scale`="الميزان"/"Scale", `pos.settings.test_print`="اختبار طباعة"/"Test print".
**Acceptance:** opens as a popover from the top bar; when routed, a back-to-register control is present; hardware bindings persist; test print/drawer fire; defaults apply to new tickets.

---

## 13) Print (reused) — 80mm thermal receipt

Reuses FE_02 §12 **locked bilingual template**, **80mm** size default for POS (A4 available). Mandatory fields locked (seller TRN, buyer TRN if B2B, EGS/GS1 lines, tax breakdown, totals, UUID, QR); limited per-tenant customization (logo/trade name/theme/footer). Offline: prints immediately with `local`/`queued` marker; QR/UUID fill on sync.
**Acceptance:** 80mm renders with mandatory fields; prints offline; UUID/QR reconcile on sync.

---

## 14) Module-wide RTL, offline, performance
- RTL-native grid/tender/cart; western digits + `tabular-nums`; `ج.م` after the number; barcode/UUID/codes LTR within RTL (bidi tested); 80mm receipt bilingual.
- **Offline (first-class):** local catalog/prices/tickets cache; async submission queue non-blocking; per-doc `local/queued/valid/rejected`; **B2C window countdown** warns before expiry; per-terminal numbering prevents sync collisions; conflicts surfaced, never silent.
- **Performance:** sub-second scan-to-line; live cart with no jank; large grid virtualized; drawer/print latency-tolerant.

---

## 15) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| POS ticket | cashier, journal, (issued receipt via FE_02) | ✓ | ✓ | pos.sell/void | ✓ |
| Register/Terminal | settings | ✓ | ✓ | pos.terminal.settings | ✓ |
| Shift | open, close/Z, X-read, paid-in/out | ✓ | ✓ | pos.shift.open/close | ✓ |
| Tender (mixed) | tender modal | ✓ | ✓ | pos.sell (+credit/discount override) | ✓ |
| Variant/SKU | variant picker | ✓ | ✓ | pos.sell | ✓ |
| Weighed item | weight entry | ✓ | ✓ | pos.sell | ✓ |
| Store credit | tender + return | ✓ | ✓ | pos.return.noreceipt | ✓ |
| Loyalty (earn+redeem) | tender | ✓ | ✓ | pos.sell | ✓ |
| POS return | return screen | ✓ | ✓ | pos.return(.noreceipt) | ✓ |

## 16) Module acceptance criteria
1. No selling without an open shift; opening float recorded; terminal locks after close.
2. Ticket is offline-first: sale + 80mm print + drawer work with zero network; document syncs later (`local`→`queued`→`valid`), B2C nearing-window flagged with countdown.
3. Closing a ticket generates a real Sales document/e-receipt via FE_02 logic (never a separate finance source); accepted receipts corrected only via return/credit note.
4. Mixed/split tender supported (multiple methods on one ticket); change computed on cash only.
5. Variants resolve to one SKU (OOS disabled); weighed items compute weight × price/kg.
6. POS return: linked refunds as original + credit note; **no-original return offers cash or store credit at the customer's choice**, both supported; inbound movement created.
7. Loyalty earns on close and **redeems at tender** as discount/partial payment when the program is enabled.
8. Shift close computes variance (expected−counted) and posts one balanced treasury entry; Z-report renders fully offline.
9. Payment status and sync/ETA status stored/displayed independently; per-terminal numbering; everything RTL via i18n keys; flag-don't-block (missing eta_code sells + flags, never blocks the sale).

**Fixtures:** `src/lib/mock/fixtures/pos.fixtures.json` (delivered as `Flexova_FE_09_Retail_POS_fixtures.json`; place it at the standard mock path with the short name `pos.fixtures.json`). Egyptian context — terminals in 2 branches; an open shift + a closed shift with variance; tickets across payment×sync combos incl. mixed tender, variant line, weighed line, loyalty redeem, store-credit tender, queued-nearing-window, rejected-with-plain-reason, parked, voided; a clothing model with size×color SKUs; a sold-by-weight item; store-credit vouchers; a customer with loyalty points). Cross-references `inventory`, `sales`, `crm` fixtures (shared IDs: `cu_*`, `it_*`, `br_main`, `br_nasr`, `wh_*`, `pm_*`, `pl_*`, `tr_*`, `tax_t1`).

*End of FE_09 Retail / POS — version 1.0*
