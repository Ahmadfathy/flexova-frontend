# Flexova — FE_13 Wholesale & Distribution (build-ready)

> **Phase 5 — Sector pattern (Brief 13).** Frontend spec. Page by page: fields, states, interactions, permissions, responsive, AR+EN, with fixtures.
> Version: 1.0 — July 2026
> **Source of truth (do not redefine):** `UIUX_13_Wholesale.md` · `Flexova_Design_Foundations.md` (3.0) · `Flexova_FE_00_Foundation` (tokens/components/shell/i18n) · `Flexova_FE_01_Inventory` (item, UoM, price lists, transfer, adjustment) · `Flexova_FE_02_Sales_ETA` (invoice, ETA statuses, e-receipt) · `Flexova_FE_04_Accounting` (treasury, AR, auto-posting) · `Flexova_FE_05_CRM` (customer, credit limit) · `Flexova_FE_06_HR_Payroll` (commission engine) · `FE_09/FE_09a Retail-POS` (**PosLayout**, shift, tender modal, product grid, e-receipt print).
> **Golden rules (carried):** (1) Payment status and ETA status stay independent. (2) **flag-don't-block** — a missing `eta_code` never stops the rep. (3) Stock movements come from documents, never from direct balance edits. (4) `PosLayout` and tokens are **not touched** — `/van/*` mounts additively.

---

## 0) Scope

**In v1:** price tiers · sales orders · delivery notes (picking) · credit reservations & credit control · routes & visits · van load/return (in-transit transfer) · van shift + settlement · collections with invoice allocation · rep commission on collection (HR engine).
**Out (deferred — see UIUX §10):** import/export & landed cost · GPS tracking · native mobile app · hard allocation · compound promotions · cross-customer van returns · multi-warehouse per order.

Data via `lib/mock/client.ts` reading `whl.fixtures.json` (+ cross-reads `inventory`, `sales`, `crm`, `accounting`, `hr` fixtures).
Feature flag: `sector.wholesale`. Depends on hard core (inventory · sales+ETA · accounting). CRM/HR consumers are **flag-aware** (see §13).

---

## 1) Routes & IA

### 1.1 Back-office (standard shell, under `nav.sales` + new `nav.wholesale`)
```
/wholesale                       → redirect → /wholesale/orders
/wholesale/orders                → Sales orders list                [§4]
/wholesale/orders/new            → Sales order editor               [§5]
/wholesale/orders/:id            → Sales order view/editor          [§5]
/wholesale/orders/:id/pick       → Delivery note (picking) editor   [§6]
/wholesale/deliveries            → Delivery notes list              [§6]
/wholesale/deliveries/:id        → Delivery note view               [§6]
/wholesale/routes                → Routes list + editor             [§7]
/wholesale/routes/:id            → Route editor (drag-order)        [§7]
/wholesale/reps                  → Rep monitoring board             [§8]
/wholesale/reps/:id              → Rep day detail                   [§8]
/wholesale/credit                → Credit control hub               [§9]
/wholesale/van-loads             → Van loads / returns list         [§10]
/wholesale/van-loads/:id         → Van load doc (confirm receipt)   [§10]
/pricing/lists/:id               → Price list + tiers editor        [§11]  (extends FE_01)
```
**Secondary tabs** under `PageHeader`: Orders · Deliveries · Routes · Reps · Credit control · Van loads.

### 1.2 Van (PosLayout, route-scoped — tablet-first)
```
/van                             → redirect → /van/today
/van/shift/open                  → Open rep shift (van + float)     [§2]
/van/today                       → Day plan (visits)                [§2]
/van/visit/:visitId              → Visit / sell screen              [§3]
/van/customer/:id/collect        → Collection screen                [§3.4]
/van/shift/close                 → Close shift + settlement         [§3.5]
```
`PosLayout` is reused as-is (top bar: logo · live clock · tooltips · Dashboard pill · Exit) with **one additive slot**: `syncIndicator`. No layout fork.

**i18n namespaces:** `wholesale` (back-office) · `van` (field). AR default, EN mirror.

---

## 2) Van — Day plan (`/van/today`)

### 2.1 Top bar (PosLayout slots)
| Slot | Content |
|---|---|
| left | route name + date, rep name |
| center | live clock |
| right | **`SyncIndicator`** · Dashboard pill · Exit |

**`SyncIndicator`** (new component, `components/van/SyncIndicator.tsx`):
| state | tone | label AR | label EN |
|---|---|---|---|
| `online` | success (subtle dot) | متصل | Online |
| `offline` | neutral (**not danger**) | بلا اتصال · N معلّقة | Offline · N pending |
| `syncing` | brand + spinner | جارٍ المزامنة… | Syncing… |
| `error` | danger | فشل المزامنة — إعادة المحاولة | Sync failed — retry |
> Offline is a **normal operating state**, styled neutral. Only a failed retry is danger.

### 2.2 Summary strip (`StatCard` ×4, horizontal scroll on narrow)
`زيارات 7/14` · `مبيعات اليوم 18,430 ج.م` · `تحصيلات اليوم 9,200 ج.م` · `بضاعة بالسيارة 42,100 ج.م`

### 2.3 Visit list
Ordered by `sequence`. Card fields:
`customer name_ar` · address · **`عليه` (AR balance)** + **`المتاح` (available credit)** with semantic tone (success / warning ≥80% used / danger over limit) · `StatusPill` for visit status · last-visit date.

| Visit status | key | pill tone |
|---|---|---|
| مجدولة | `scheduled` | neutral |
| تمّت — بيع | `sold` | success |
| تمّت — بلا طلب | `no_order` | warning |
| مقفول | `closed` | neutral |
| متأجّلة | `deferred` | warning |

**Card actions:** `ابدأ الزيارة` (primary) · call/WhatsApp (icon) · `تأجيل` → reason `Select` (required).
**Sticky footer:** `عميل خارج الخطة` (opens customer picker → creates ad-hoc visit) · `إقفال الوردية`.

### 2.4 States
- **loading** → 6 skeleton cards.
- **empty** → "مفيش زيارات النهاردة" + CTA `عميل خارج الخطة`.
- **no shift** → full-screen gate → `/van/shift/open`.
- **offline** → banner-free; only `SyncIndicator` changes. Never blocks.
- **forbidden** → `van.shift.*` missing → standard 403 panel.

### 2.5 Open shift (`/van/shift/open`)
Fields: `السيارة/المخزن ✱` (Select, filtered `warehouse.type === 'van'` and assigned to current user) · `عهدة نقدية افتتاحية ✱` (number) · `الخزينة` (auto from branch) · note.
On submit → **prefetch bundle** into IndexedDB: day visits · van stock · items · price lists + tiers · customer balances/limits · payment methods. Progress modal with per-step check marks. Failure → retry, never partial silent state.

---

## 3) Van — Visit / sell (`/van/visit/:visitId`)

### 3.1 Layout (tablet landscape, RTL logical)
- **Inline-start pane (≈62%)**: product grid — reuse FE_09 `ProductGrid` with `densityLevels 4→12`, `source: vanStock`.
  - Item tile shows: image · name_ar · **van qty** · price for **current selected unit**.
  - qty ≤ 0 → tile `disabled` + muted "غير متاح بالسيارة" (still visible, not hidden).
- **Inline-end pane (≈38%)**: cart.

### 3.2 Cart
**Header:** customer name + type badge · **`CreditBar`** (new): available / used / limit, live-updating as the cart total changes; tone flips warning→danger on breach.
**Line row:** item · qty stepper · **unit `Select`** (base/carton/pallet) · price + **`TierPill`** (`جملة ≥ 3 كراتين`) · line discount (permission `pricing.line.discount`) · line total.
- Changing qty or unit **re-evaluates the tier live**; if the tier changes, the price cell flashes `--motion-highlight` once and the pill updates.
- **`TierHintBanner`** (upsell): when qty is within 25% of the next tier → "زوّد 4 قطع توصل لسعر 42 ج.م" + `طبّق` button that bumps the qty.
**Footer totals:** subtotal · discount · tax · grand total (`tabular-nums`, `ج.م` after the number).

### 3.3 Actions & guards
`تحصيل` · `مرتجع` · `بلا طلب (بسبب)` · **`تسوية الدفع`** (primary → reuse FE_09 tender modal: cash / credit / mixed).

**Credit guard** on credit or mixed-credit tender, by `customer.credit_policy`:
| policy | behaviour |
|---|---|
| `warn` | inline `Alert` warning, proceed allowed |
| `block` | tender's credit option disabled + reason text; cash still allowed |
| `override` | `AlertDialog` requiring permission `sales.credit.override`; on confirm → writes `audit` entry with user, amount, excess |

**ETA:** unchanged from FE_02. Item without `eta_code` → **flag-don't-block**: yellow inline chip on the line, sale completes, doc flagged `needs_eta_fix`, appears in the ETA hub.
**Output:** direct invoice (`channel` auto-detected by TRN) → e-receipt view + 80mm print + queued ETA submission.

### 3.4 Collection (`/van/customer/:id/collect`)
Fields: `المبلغ ✱` · `طريقة الدفع ✱` · note.
**Allocation table:** invoice no · date · total · outstanding · **allocated (input)**. Default = oldest-first auto-fill; user editable; running "غير مخصَّص" counter must reach 0 (or be explicitly left as on-account with a confirm).
Submit → receipt (print/e-receipt) → cash into shift treasury → feeds commission basis.

### 3.5 Close shift (`/van/shift/close`)
Three stacked `Card`s:
1. **البضاعة:** table per item — `محمّل · مباع · مرتجع · المتوقّع · العدّ الفعلي (input) · الفرق ±`. Any non-zero variance → **reason `Select` required** (from inventory adjustment reasons).
2. **الكاش:** float + cash sales + collections = expected · `المسلَّم (input)` · variance.
3. **الترحيل:** remaining lines → van return document (in-transit) to parent warehouse, pending warehouse confirmation.

**Hard guard:** if `pendingSyncCount > 0` → close button disabled + `Alert` "في عمليات لسه ماتزامنتش" + `مزامنة الآن`.
On close → **Z report** (goods + cash + estimated commission) → print + `/van/today` locked state.

---

## 4) Sales orders list (`/wholesale/orders`)

`DataTable` (TanStack, server-side paging/filtering, virtualized ≥ 200 rows).
Columns: `#` · customer · date · delivery date · total · **`FulfillmentBar`** (progress: picked/ordered %) · order `StatusPill` · rep · row actions.

| Order status | key | tone |
|---|---|---|
| مسودة | `draft` | neutral |
| معتمد | `approved` | brand |
| قيد التجهيز | `picking` | warning |
| مُسلَّم جزئياً | `partial` | warning |
| مُسلَّم بالكامل | `delivered` | success |
| مفوتر | `invoiced` | success |
| ملغي | `cancelled` | neutral |

**Filters:** status · customer · rep · route · date range · **`متجاوز ائتمان` (toggle)**.
**Bulk:** export Excel (respects active filters).
**Row actions:** view · `تجهيز` (if approved/partial) · `فوترة` (if delivered lines exist) · cancel (`AlertDialog`, permission-gated, blocked once any delivery exists).

---

## 5) Sales order editor (`/wholesale/orders/new|:id`)

**Header block:** `العميل ✱` (combobox with quick-add) · `المخزن ✱` · `التاريخ ✱` · `تاريخ التسليم` · `المندوب` · `المسار` · price list (auto from customer, read-only unless `pricing.tier.manage`).
Selecting a customer → loads price list, credit snapshot, and renders **`CreditBar`** in the header.

**Lines table:** item (search/barcode) · qty · unit · price (auto from tier; override needs `pricing.line.override`, shows a strike-through of the auto price) · discount · tax · total.

**Side panel — `TierPanel`:** for the focused line, lists all available tiers for that item in the customer's price list, highlighting the active one, with the upsell delta ("زوّد 4 → 42 ج.م/قطعة، توفير 380 ج.م").

**Footer:** totals + **credit projection**: "الائتمان بعد الاعتماد: 12,400 من 50,000".

**Buttons:** `حفظ مسودة` · **`اعتماد`** · `إلغاء`.
On approve:
- create **credit reservation** = order total;
- soft stock reservation (informational badge on inventory, never blocks other docs);
- if credit insufficient → apply `credit_policy` (warn / block / override dialog + audit).

**Validation (zod):** ≥1 line · qty > 0 · delivery date ≥ order date · single warehouse per order · tier coverage (if the qty falls in a tier gap → error naming the item).

---

## 6) Delivery note / picking (`/wholesale/orders/:id/pick`)

Lines: item · **ordered · already delivered · remaining · picked (input)** · live van/warehouse stock check per row (danger tone if picked > available).
Header: warehouse (locked to order) · date · receiver name · note.
Buttons: `حفظ مسودة` · **`تسليم`** (creates the stock issue movement) · then `فوترة` (single or multi-note invoice — checkbox selection on `/wholesale/deliveries`).
Partial pick → order returns to `partial`, a second note can be created later.
**Guard:** picking is blocked while the order is `draft` or `cancelled`.

---

## 7) Routes (`/wholesale/routes`)

List: name · rep · visit days (chips) · customer count · status.
Editor: `الاسم ✱` · `المندوب ✱` · `أيام الزيارة` (day chips, multi) · branch ·
**drag-and-drop customer list** (`sequence`) with a search-to-add combobox, remove per row, and a "عدد العملاء" counter.
Action: `توليد خطة اليوم` → creates `visits` for the matching weekday (idempotent; warns if a plan already exists).

---

## 8) Rep monitoring (`/wholesale/reps`)

Board of rep cards: name · van · **shift status** (`مفتوحة` / `مقفولة` / `فيها فروقات`) · visits done/total · sales · collections · **last sync time**.
Click → `/wholesale/reps/:id`: timeline of the day (visits, docs, collections), settlement summary, variance approval action (permission `van.variance.approve`, **SoD:** the approver must not be the settling user — enforced client-side with a clear message and server-side authoritative).

---

## 9) Credit control hub (`/wholesale/credit`)

Tabs:
1. **المتجاوزون** — customer · limit · AR · reservations · excess · policy · actions.
2. **أعمار الديون** — pills `جاري · 1–30 · 31–60 · 60+` per customer, read-only from Accounting.
3. **الحجوزات المفتوحة** — customer · order · amount · age; action `تحرير` only for cancelled orders.

Actions: `تجميد البيع` (customer flag) · `تعديل الحد` (permission `crm.credit.limit.manage` + audit) · `تكليف تحصيل` → creates a CRM follow-up assigned to the rep.

---

## 10) Van loads / returns (`/wholesale/van-loads`)

List: doc no · type (`تحميل` / `ترحيل`) · rep · van · date · status (`مُرسل` / `مستلَم` / `نزاع`).
Detail: lines with `مُرسل · مستلَم (input on the receiving side) · فرق`.
Confirm receipt (permission `van.load.confirm`) → completes the in-transit transfer.
Any variance → doc goes to **`نزاع` (dispute)** and **cannot be approved** until the warehouse keeper resolves it (adjust sent qty or accept variance with a reason → adjustment document).

---

## 11) Price tiers editor (`/pricing/lists/:id` — extends FE_01 §price lists)

Item row → expandable `تفاصيل الشرائح` sub-table:
`من كمية ✱ · إلى كمية (فارغ = ∞) · النوع (سعر / خصم %) ✱ · القيمة ✱ · الوحدة المرجعية ✱`
**Validation (live, inline):**
- overlap → "الشريحة دي متداخلة مع الشريحة السابقة (3–5)";
- gap → "في فجوة بين 5 و 8 — الكميات دي هتاخد سعر القائمة";
- first tier must start at 1 (warn otherwise).
**Bulk action:** `نسخ الشرائح إلى…` → item multi-select (same category default).

---

## 12) Components to build

| Component | Path | Notes |
|---|---|---|
| `SyncIndicator` | `components/van/SyncIndicator.tsx` | 4 states, pending counter, retry |
| `CreditBar` | `components/wholesale/CreditBar.tsx` | limit/used/available, live, 3 tones |
| `TierPill` | `components/wholesale/TierPill.tsx` | active tier label |
| `TierPanel` | `components/wholesale/TierPanel.tsx` | side panel, upsell delta |
| `TierHintBanner` | `components/wholesale/TierHintBanner.tsx` | in-cart upsell + apply |
| `FulfillmentBar` | `components/wholesale/FulfillmentBar.tsx` | picked/ordered progress |
| `AllocationTable` | `components/wholesale/AllocationTable.tsx` | collection → invoices |
| `RouteBuilder` | `components/wholesale/RouteBuilder.tsx` | dnd-kit ordered list |
| `SettlementCard` | `components/van/SettlementCard.tsx` | expected/actual/variance + reason |
| `VisitCard` | `components/van/VisitCard.tsx` | day-plan row |

**Reused unchanged:** `PosLayout` · `ProductGrid` · `TenderModal` · `ShiftBar` · `ReceiptPreview` (80mm) · `StatusPill` · `DataTable` · `PageHeader` · `StatCard` · `EmptyState` · `Skeleton`.

---

## 13) Feature-flag awareness

| Flag off | Behaviour |
|---|---|
| `crm` | credit limit/policy read from simplified fields on the customer record; `تكليف تحصيل` hidden; aging tab hidden |
| `hr` | commission blocks hidden from Z report and rep detail; settlement unaffected |
| `reports.advanced` | rep board keeps its inline aggregates; export-only extras hidden |
| `sector.wholesale` off | routes/orders hidden; **safe-disable guard**: blocked while open orders or unclosed rep shifts exist |

---

## 14) Permissions

`sales.order.view|create|edit|approve|cancel|export` · `sales.delivery.view|create|deliver` · `sales.credit.override` · `pricing.tier.manage` · `pricing.line.override` · `van.shift.open|close` · `van.load.confirm` · `van.shift.settle` · `van.variance.approve` · `route.manage` · `crm.credit.limit.manage`
Scopes: all branches / branch / **rep / own records**. Default-deny. Every override and limit change → append-only audit entry.

---

## 15) Offline & sync (van only)

- **Storage:** IndexedDB (`idb-keyval`), stores: `bundle`, `queue`, `meta`.
- **Queue:** append-only ops (`sale`, `collection`, `visit_update`, `return`) with client-generated UUID + per-terminal numbering (reused from FE_09).
- **Conflict policy:** stock is authoritative on the van (rep owns it) → server accepts; price/credit snapshots are taken at bundle load and re-validated server-side on sync; a rejected op surfaces in a **`عمليات مرفوضة`** drawer with a plain-Arabic reason and a fix action.
- Shift close is the only hard sync gate.

---

## 16) Performance

- Orders/customers lists virtualized + server-side filtering.
- Van product grid renders from the local bundle only — **zero network calls during a sale**.
- Tier evaluation is a pure client function `resolvePrice(item, qty, unit, customer)` — memoized, O(tiers).
- Images: thumbnails, lazy, cached in the bundle at shift open.
- No heavy animation in tables or the grid.

---

## 17) Fixtures

`src/lib/mock/fixtures/whl.fixtures.json` — see companion file. Covers: 2 routes · 14 visits across all 5 statuses · 2 vans with stock · 1 open shift + 1 closed shift with variances · price tiers incl. a deliberate **gap** and a deliberate **overlap** (validation demo) · customers across all 3 credit policies incl. one over limit · orders in every status incl. partial delivery · a load with a dispute · collections with partial allocation · one item missing `eta_code` (flag-don't-block demo).

---

## 18) Definition of done (summary)

Every screen implements the five states · AR/EN mirrored strings · RTL logical properties only · permissions enforced on render **and** action · offline path verified with the network disabled · no token/shell edits · fixtures drive 100% of the UI (no hardcoded data).

---

*End of document — FE_13 Wholesale & Distribution, v1.0*
