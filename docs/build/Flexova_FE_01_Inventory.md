# Flexova — FE_01 Inventory (build-ready)

> **Phase 4 — Core module 1.** Inventory & Items frontend spec. Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — June 2026
> **Source of truth (do not redefine):** `Flexova_SPEC_EN_01_Inventory` + `Flexova_UIUX_01_Inventory` (entities, flows, decisions) · `Flexova_FE_00_Foundation` (tokens, components, shell, i18n, appearance) · `Flexova_SPEC_EN_00_DesignSystem`.
> **Golden rule (carried from SPEC §1):** balances change only via documented **movements**; no direct edit of a balance number. The UI never exposes an editable balance field.

---

## 0) Module scope (recap, not redefinition)

**In v1:** items, categories (tree), UoM + conversions, price lists, barcodes, warehouses, computed balances, item ledger, stocktake (freeze/live), transfers (immediate), adjustments (reason required), opening balances, reorder levels, bulk import/export, barcode printing.
**Out (sector extension points, only show when a capability flag is on):** variants/matrix, batch/expiry, sold-by-weight, serial tracking, quantity-break tiers.

Data fetching goes through the **mock layer** (`lib/mock/client.ts`) reading `inventory.fixtures.json`; the same call signatures map 1:1 to the future API. Every list screen supports server-side search/filter/pagination semantics in the mock (artificial latency + state simulation).

---

## 1) Routes & IA

The module mounts under the shell nav item `nav.inventory`. Secondary navigation inside the module = **Tabs** (horizontal, mirror in RTL) at the top of the module area, below `PageHeader`.

```
/inventory                       → redirect → /inventory/items
/inventory/items                 → Items list                        [§3]
/inventory/items/new             → Item create (tabbed form)         [§4]
/inventory/items/:id             → Item detail/edit (tabbed form)    [§4]  (Ledger = tab 6)
/inventory/categories            → Categories tree                   [§6]
/inventory/price-lists           → Price lists                       [§7]
/inventory/price-lists/:id       → Price list editor (per-item)      [§7]
/inventory/warehouses            → Warehouses                        [§8]
/inventory/stocktakes            → Stocktakes list                   [§9]
/inventory/stocktakes/new        → Stocktake create (warehouse+mode) [§9]
/inventory/stocktakes/:id        → Stocktake editor (counting)       [§9]
/inventory/transfers             → Transfers list                    [§10]
/inventory/transfers/new         → Transfer editor                   [§10]
/inventory/transfers/:id         → Transfer view                     [§10]
/inventory/adjustments           → Adjustments list                  [§11]
/inventory/adjustments/new       → Adjustment editor                 [§11]
/inventory/adjustments/:id       → Adjustment view                   [§11]
/inventory/low-stock             → Low-stock view                    [§12]
```

**Secondary tabs (in this order):** Items · Categories · Price lists · Warehouses · Stocktakes · Transfers · Adjustments · Low stock.
**Modals/drawers (global to module):** Quick-add item (modal, §5) · Warehouse form (modal, §8) · Category form (modal, §6) · Bulk import (full-height drawer wizard, §13) · Print barcode (modal, §14) · Ledger quick-view (drawer, §4.6) · Confirm dialogs (`AlertDialog`) for suspend/delete/approve/post.

**i18n namespace:** `inventory`. All strings below are keys; AR is default, EN mirror. The AR/EN tables in each section are the source for `ar/inventory.json` and `en/inventory.json`.

---

## 2) Entities (display model — from SPEC §2; here only the UI shape)

Field-level validation rules used across forms:

| Entity | Field | Control | Required | Validation |
|---|---|---|---|---|
| Item | name_ar | text | ✱ | non-empty, ≤120 |
| Item | name_en | text | | ≤120 |
| Item | code (SKU) | text + auto-gen | ✱ | unique per tenant (mock checks fixtures), ≤40, no spaces |
| Item | item_type | select | ✱ | one of stocked/service/non_stock |
| Item | category_id | tree-select | | must exist |
| Item | base_uom_id | select | ✱ | must exist |
| Item | barcodes | tag input | | each ≤32; dedupe; auto-gen toggle |
| Item | image | file | | image/*, ≤2MB, 1 image |
| Item | sale_price | number | | ≥0, 2 decimals (default list) |
| Item | tax_type_id | select | | from ETA tax types |
| Item | eta_code | text | ✱ if ETA on | warn (not block) if empty; ≤50 |
| Item | reorder_level | number | | ≥0 integer |
| Item | max_level | number | | ≥ reorder_level |
| Item | status | toggle | | active/suspended |
| UoM line | name, factor, barcode?, unit_price? | inline row | factor ✱ | factor >0; base factor=1 locked |
| Warehouse | name | text | ✱ | non-empty |
| Warehouse | code, branch_id, type, status, is_default | mixed | | type ∈ sale/storage/damaged |
| Category | name, parent_id | text + tree-select | name ✱ | max depth 3 (block deeper) |
| Stocktake | warehouse_id, date, mode | mixed | all ✱ | mode ∈ freeze/live, chosen at creation, locked after |
| Stocktake line | actual_qty | number | | ≥0; diff = actual − book (computed) |
| Transfer | from_wh, to_wh, lines | mixed | ✱ | from ≠ to; qty ≤ available at source (warn on over) |
| Adjustment | warehouse_id, lines(±), reason | mixed | reason ✱ | reason ∈ damage/spoilage/count_diff/gift_sample/entry_fix |
| Price list | name, currency, status | mixed | name ✱ | currency=EGP v1 |

`computed`/read-only in UI: balance (per item×warehouse), avg_cost, last_purchase_price, running balance in ledger, stock value. Never rendered as editable inputs.

---

## 3) Screen — Items list (`/inventory/items`) — primary screen

### 3.1 Purpose
Browse/search/filter all items; entry point to create, import, export, print barcodes, and per-row actions. Default landing of the module.

### 3.2 Layout
Shell `main` area. `PageHeader` (title + actions) → secondary Tabs → toolbar (search + filters) → `DataTable` (`patterns/DataTable`). 12-col content; table full width.

### 3.3 Components
**PageHeader**
- Title: `inventory.items.title`. Subtitle: count summary `inventory.items.count` (e.g. "١٬٢٤٠ صنف").
- Actions (logical end): `Button primary` `+ inventory.items.new` · `Button secondary` `inventory.actions.import` · `Button secondary` `inventory.actions.export` · `Button secondary icon` `inventory.actions.print_barcode`.

**Toolbar**
- `SearchInput` (debounced 300ms) placeholder `inventory.items.search_ph` — matches code/name_ar/name_en/barcode.
- Filters (in a `Popover` "Filters" button on mobile; inline on desktop): Category (tree-select) · Warehouse (select) · Item type (select) · Status (select: all/active/suspended/incomplete) · Low-stock (toggle) · Price range (min/max number).
- Active filters render as removable `chips` under the toolbar; "Clear all" ghost button.
- Density toggle is global (Appearance); table honors `data-density`.

**DataTable columns** (logical order, start→end):
| col | content | align | sort | notes |
|---|---|---|---|---|
| select | checkbox | — | — | bulk |
| thumb | image or placeholder | start | — | lazy, 36px, `rounded-sm` |
| code | SKU | start | ✓ | `.num` |
| name | name_ar (name_en muted below in EN UI) | start | ✓ | bidi-safe |
| category | category path | start | ✓ | muted |
| unit | base UoM | start | — | |
| balance | total available (sum across allowed warehouses) | end | ✓ | `.num`; `—` for service |
| sale_price | default list price | end | ✓ | `formatMoney` |
| status | `StatusPill` | start | — | active(success)/suspended(neutral)/incomplete(warning)/low-stock(warning) |
| actions | row menu | end | — | `DropdownMenu` |

- Row click → item detail. Row actions menu: `edit` · `ledger` (opens drawer §4.6) · `duplicate` · `suspend/activate` · `print_barcode`. Destructive `delete` only if no movements (else disabled + tooltip `inventory.items.cant_delete`).
- **Bulk bar** (appears on selection, sticky bottom of table): activate/suspend · change category · print barcode · export selected · delete (confirm). Shows selected count.
- Pagination: infinite scroll (virtualized) default; page-size note in footer. Server-side semantics via mock.

### 3.4 Five states
- **Loading:** 8 skeleton rows (thumb circle + 4 bars). No spinner.
- **Empty (no items at all):** centered `EmptyState` — icon (box), `inventory.items.empty_title`, `inventory.items.empty_sub`, two buttons: `+ new item` (primary) + `import from Excel` (secondary).
- **Error:** `ErrorState` — plain text `inventory.errors.load`, cause line, `retry` button. No codes.
- **No results (search/filter):** `NoResults` — `inventory.items.no_results` (echoes query) + "clear filters" link. Visually distinct from empty.
- **Offline:** persistent `OfflineBanner` above table: `inventory.offline.banner`. Table reads from local cache; rows added via quick-add show a sync chip (`local`/`syncing`/`synced`/`conflict`) in the status cell.

### 3.5 Interactions & transitions
Search debounce 300ms; filter apply instant; sort toggles asc/desc/none; bulk bar slides up 150ms; row hover `bg-background`. Reduced-motion respected.

### 3.6 Responsive
- **Desktop >1024:** full table, inline filters.
- **Tablet 640–1024:** hide category+unit columns (kept in row detail expand); filters → "Filters" popover.
- **Mobile <640:** table → **card list** (thumb + name + code + balance + price + status pill + actions menu); search full-width; actions collapse into a single "+" FAB-style primary + overflow menu; bulk via long-press/checkbox toggle.

### 3.7 Permissions (`inventory.item.*` + warehouse scope)
- No `view` → module hidden from nav entirely.
- No `create` → hide `+ new item`, quick-add, import.
- No `edit` → row edit disabled (tooltip), detail opens read-only.
- No `suspend` → hide suspend/activate.
- No `delete` → hide delete (bulk + row).
- No `export` → hide export. No `import` → hide import.
- Balance column sums **only warehouses the user is scoped to**; out-of-scope warehouses excluded silently.

### 3.8 AR / EN strings
| key | AR | EN |
|---|---|---|
| inventory.items.title | الأصناف | Items |
| inventory.items.count | {{n}} صنف | {{n}} items |
| inventory.items.new | صنف جديد | New item |
| inventory.items.search_ph | ابحث بالكود أو الاسم أو الباركود… | Search by code, name, or barcode… |
| inventory.items.empty_title | لسه مفيش أصناف | No items yet |
| inventory.items.empty_sub | ابدأ بإضافة أول صنف أو استورد قائمتك من Excel | Add your first item or import your list from Excel |
| inventory.items.no_results | مفيش نتائج لـ "{{q}}" | No results for "{{q}}" |
| inventory.items.cant_delete | لا يمكن الحذف — للصنف حركات مسجّلة | Can't delete — item has recorded movements |
| inventory.actions.import | استيراد | Import |
| inventory.actions.export | تصدير | Export |
| inventory.actions.print_barcode | طباعة باركود | Print barcode |
| inventory.status.active | نشط | Active |
| inventory.status.suspended | موقوف | Suspended |
| inventory.status.incomplete | غير مكتمل | Incomplete |
| inventory.status.low_stock | قارب النفاد | Low stock |
| inventory.offline.banner | غير متصل — تُحفظ التغييرات محلياً وتُزامن عند عودة الاتصال | Offline — changes saved locally, will sync when back online |

### 3.9 Component mapping
DataTable→`patterns/DataTable`; PageHeader→`patterns/PageHeader`; StatusPill→`patterns/StatusPill`; filters→shadcn `Popover`+`Select`+`Input`; bulk bar→custom on `Card`; row menu→shadcn `DropdownMenu`.

### 3.10 Acceptance
- Search matches code/name/barcode; empty vs no-results are distinct components.
- Balance respects warehouse scope; service items show `—`.
- All 5 states reachable in mock (via `?mock=loading|empty|error|offline`).
- No hard-coded strings; numbers `tabular-nums`; fully RTL.

---

## 4) Screen — Item card (create/edit) (`/inventory/items/new` · `/:id`)

### 4.1 Purpose
Create or edit an item via a **tabbed** form (radical simplicity — not one long page). Required basics first, rest progressive.

### 4.2 Layout
`PageHeader` with breadcrumb (Items / New | name). Tabs (vertical on desktop ≥1024 as a left/`start` rail; horizontal on smaller). Sticky footer with actions. Content max-width 720px per tab for form legibility.

### 4.3 Tabs & fields
**Tab 1 — Basic** (`inventory.item.tab_basic`): name_ar ✱, name_en, code ✱ (with "auto" button that fills a generated SKU; editable), item_type ✱ (segmented: stocked/service/non_stock), category (tree-select + "new category" inline), base_uom ✱ (select + "manage units" link → Tab 4), barcodes (tag input + "auto-generate" toggle), image (dropzone, preview, remove), status (toggle active/suspended).
> If item_type = service → Stock tab disabled (no balance), excluded from stocktake; show hint `inventory.item.service_hint`.

**Tab 2 — Pricing & Tax** (`inventory.item.tab_pricing`): default-list sale_price (number, currency suffix), last purchase price (read-only, `—` until first purchase), tax_type (select), **eta_code** (text + helper `inventory.item.eta_hint`). If ETA enabled tenant-wide and eta_code empty → inline warning + on save a persistent banner (see 4.5). Price-list table: each active price list with this item's price (editable inline); link "manage price lists" → §7.

**Tab 3 — Stock** (`inventory.item.tab_stock`, hidden for service): track-balance (implicit for stocked), reorder_level, max_level, and **Opening balances** repeater: per warehouse → qty + unit cost (creates an `opening` movement on save, never an editable balance). Shows computed current balance per warehouse (read-only) when editing.

**Tab 4 — Units** (`inventory.item.tab_units`): UoM table — base unit row locked (factor 1), add extra units (name, factor vs base, optional barcode, optional unit sale price). Live helper: "1 {extra} = {factor} {base}".

**Tab 5 — Sector attributes** (`inventory.item.tab_sector`, conditional): only if a sector capability flag is on (variants/batch/weight/serial). v1 Core shows a disabled placeholder explaining it activates with the sector module. No fields built here.

**Tab 6 — Ledger** (`inventory.item.tab_ledger`, edit mode only): embeds the item ledger (§4.6 content) filtered to this item.

### 4.4 Footer actions
`save` (primary) · `save_and_new` (secondary) · `cancel` (ghost). Loading state on save blocks repeat. Validation errors jump to the first offending tab and mark the tab with a danger dot.

### 4.5 Five states
- **Loading (edit):** skeleton form (label bars + field boxes).
- **Empty:** n/a (create form is the "empty").
- **Error (load/save):** inline `ErrorState` for load; save error → toast `inventory.errors.save` + keep form data.
- **No results:** n/a.
- **Offline:** save allowed → stored local, item flagged `local`; banner `inventory.offline.banner`; eta_code warning still applies.
- **ETA-not-ready (module-specific 6th flag):** non-blocking banner `inventory.item.eta_not_ready` shown on item with ETA on + empty eta_code.

### 4.6 Ledger drawer / tab
Timeline `DataTable`: date · type pill (in/out/transfer/adjustment/opening/stocktake) · source doc (link) · warehouse · qty(±, signed + semantic color) · running balance · cost · user. Header strip: per-warehouse current balance, avg cost, stock value. Filters: date range, warehouse, type. Opened as drawer from list row action, or as Tab 6 in detail.

### 4.7 Responsive
Desktop: tab rail on `start`. Tablet/mobile: tabs become a horizontal scroller; footer actions stick to bottom; opening-balances repeater stacks.

### 4.8 Permissions
No `edit` → form read-only, footer hidden, "edit" gated. Opening balances require `inventory.item.opening` (often admin-only); if absent, hide Tab 3 opening section (reorder still editable with `edit`). eta_code editable only with `edit`.

### 4.9 AR / EN strings
| key | AR | EN |
|---|---|---|
| inventory.item.tab_basic | الأساسي | Basic |
| inventory.item.tab_pricing | التسعير والضريبة | Pricing & Tax |
| inventory.item.tab_stock | المخزون | Stock |
| inventory.item.tab_units | الوحدات | Units |
| inventory.item.tab_sector | خصائص قطاعية | Sector attributes |
| inventory.item.tab_ledger | الحركة | Ledger |
| inventory.item.service_hint | الخدمات لا رصيد لها وتُستثنى من الجرد | Services have no balance and are excluded from stocktake |
| inventory.item.eta_hint | كود EGS/GS1 مطلوب لإصدار فاتورة إلكترونية صحيحة | EGS/GS1 code is required to issue a valid e-invoice |
| inventory.item.eta_not_ready | هذا الصنف غير جاهز للفوترة الإلكترونية — أضف كود EGS/GS1 | This item isn't ready for e-invoicing — add an EGS/GS1 code |
| inventory.actions.save | حفظ | Save |
| inventory.actions.save_and_new | حفظ وإضافة آخر | Save & add another |
| inventory.actions.cancel | إلغاء | Cancel |
| inventory.errors.save | تعذّر الحفظ — حاول مرة أخرى | Couldn't save — please try again |

### 4.10 Acceptance
- Service items lose the Stock tab and stocktake eligibility.
- code auto-gen produces a unique SKU; manual edit validated for uniqueness.
- Opening balance entry creates an `opening` movement (visible in ledger), never a direct balance edit.
- Item savable without eta_code (ETA on) but flagged not-issuable.
- Validation routes focus to first error tab with a danger marker.

---

## 5) Modal — Quick-add item

Invoked during invoice/POS (defined here, reused by Sales/POS). `Dialog` (modal, scrim).
**Fields:** name_ar ✱ · sale_price · base_uom (default to tenant default) · code (auto, read-only with "edit" reveal). **Actions:** `add` (primary) → returns the new item to caller + flags it **incomplete** in the items list; `cancel`.
**States:** loading (save) · error (toast) · offline (saved local, flagged). **Permissions:** requires `inventory.item.create`. **AR/EN:** `inventory.quickadd.title`="إضافة سريعة"/"Quick add", `inventory.quickadd.hint`="تقدر تكمّل باقي البيانات لاحقاً"/"You can complete the rest later".
**Acceptance:** created item is usable immediately in the caller and appears flagged incomplete.

---

## 6) Screen — Categories (`/inventory/categories`)

**Purpose:** manage the category tree (≤3 levels). **Layout:** two-pane — tree on `start`, selected-node detail/form on `end` (stacks on mobile).
**Components:** tree view (expand/collapse, drag to reparent optional v1.1), `+ category` button → `Dialog` (name, parent select). Each node row: name, item-count badge, row menu (edit/add-child/delete). Delete blocked if the node or descendants hold items → message + suggest reassign.
**States:** loading (skeleton tree) · empty ("no categories" + add) · error · offline banner.
**Permissions:** `inventory.category.manage` for create/edit/delete; view with `inventory.item.view`.
**AR/EN:** `inventory.categories.title`="التصنيفات"/"Categories", `inventory.categories.depth_block`="الحد الأقصى ٣ مستويات"/"Max 3 levels", `inventory.categories.cant_delete`="لا يمكن الحذف — التصنيف يحتوي أصنافاً"/"Can't delete — category contains items".
**Acceptance:** depth >3 blocked; delete with items blocked.

---

## 7) Screen — Price lists (`/inventory/price-lists`, `/:id`)

**Purpose:** manage multiple price lists (default retail always exists) and per-item prices.
**List view:** table — name · currency (EGP) · #items priced · status · default-badge · actions. `+ price list` (name, currency, status).
**Editor (`/:id`):** searchable item table with an editable `price` column for this list; bulk "apply % markup/discount from default"; save. Default list cannot be deleted or deactivated.
**States:** all 5 (offline: edits stored local). **Permissions:** `inventory.pricelist.manage`.
**AR/EN:** `inventory.pricelists.title`="قوائم الأسعار"/"Price lists", `inventory.pricelists.default`="افتراضية"/"Default", `inventory.pricelists.markup`="تطبيق نسبة على القائمة الافتراضية"/"Apply % to default list".
**Acceptance:** each customer/group maps to a default list (consumed by Sales); per-line override happens in the invoice, not here; default list is protected.

---

## 8) Screen — Warehouses (`/inventory/warehouses`)

**Purpose:** manage warehouses/branches. **Layout:** table + `Dialog` form.
**Table columns:** name · code · branch · type pill (sale/storage/damaged) · status · default-badge · stock-value (read-only) · actions.
**Form (modal):** name ✱, code, branch (select), type (select), status (toggle), is_default (toggle — single default per branch enforced).
**Rules:** cannot delete a warehouse holding stock → block + suggest "transfer stock first" (deep-link to Transfer with from=this).
**States:** all 5. **Permissions:** `inventory.warehouse.manage`.
**AR/EN:** `inventory.warehouses.title`="المخازن"/"Warehouses", `inventory.warehouses.types.sale|storage|damaged`="بيع|تخزين|تالف"/"Sale|Storage|Damaged", `inventory.warehouses.cant_delete`="لا يمكن الحذف — المخزن به رصيد"/"Can't delete — warehouse holds stock".
**Acceptance:** delete blocked when stock>0; one default per branch.

---

## 9) Screen — Stocktake (`/inventory/stocktakes`, `/new`, `/:id`)

**Purpose:** count actual quantities, review differences, approve → auto-generate an adjustment.

**List:** table — number · warehouse · date · mode pill (freeze/live) · status pill (draft/counting/approved) · #items · net diff · actions (open/print/delete-if-draft).

**Create (`/new`):** choose warehouse ✱, date ✱, **mode ✱** (freeze/live — radio with explanation; **locked after creation**), scope (full / by category / by item set). On create → status `draft`.

**Editor (`/:id`):** header strip (warehouse, mode, status, started_at). Lines table: item · book_qty (computed, read-only) · actual_qty (number input, fast keyboard + barcode scan focus) · diff (computed, colored: shortage=danger, surplus=success, zero=muted). **Barcode entry bar** at top: scan → focus/increment that item's actual_qty. Summary bar (sticky bottom): #counted/#total, net diff qty, net diff value. Actions: `save draft`, `mark counting`, `approve` (primary, `AlertDialog` confirm → creates adjustment = net diff, status→approved, locks).
- **Freeze mode:** show banner that warehouse is locked vs sales/movements during count.
- **Live mode:** book_qty is a snapshot taken at start; show note that sales continued and reconciliation is vs snapshot.

**States:** loading (skeleton lines) · empty (no stocktakes → create CTA) · error · offline (counts stored local, sync chips per line) · in `freeze`, attempts to sell elsewhere are blocked by Sales (cross-module).
**Permissions:** `inventory.stocktake.create` (create/count), `inventory.stocktake.approve` (approve — often supervisor). Without approve → approve button hidden/disabled with tooltip.
**AR/EN:** `inventory.stocktake.title`="الجرد"/"Stocktake", `inventory.stocktake.mode_freeze`="مُجمَّد"/"Freeze", `inventory.stocktake.mode_live`="مفتوح"/"Live", `inventory.stocktake.mode_freeze_hint`="يُقفَل المخزن ضد البيع أثناء العد"/"Warehouse is locked against sales during the count", `inventory.stocktake.mode_live_hint`="البيع مستمر؛ المقارنة مقابل لقطة بداية العد"/"Sales continue; compared against a start-of-count snapshot", `inventory.stocktake.book`="دفتري"/"Book", `inventory.stocktake.actual`="فعلي"/"Actual", `inventory.stocktake.diff`="الفرق"/"Diff", `inventory.stocktake.approve_confirm`="الاعتماد سيُنشئ تسوية بالفروقات ولا يمكن التراجع. متابعة؟"/"Approving creates an adjustment for the differences and can't be undone. Continue?".
**Acceptance:** mode chosen at creation and locked; approval creates an adjustment equal to net diff; service items excluded from lines.

---

## 10) Screen — Transfers (`/inventory/transfers`, `/new`, `/:id`)

**Purpose:** immediate stock transfer between warehouses (v1).
**List:** number · from → to (arrow mirrors RTL) · date · #items · status (posted) · actions.
**Editor (`/new`):** from_wh ✱, to_wh ✱ (≠ from), date, note, lines (item + qty in base/selected unit). Per-line available-at-source shown; over-available → warning (allow with confirm or block per tenant rule — v1 warn). `post transfer` (primary, confirm) → creates `out` at source + `in` at destination movements; immediate.
**States:** all 5; offline → stored local with sync chip. **Permissions:** `inventory.transfer.create`; both warehouses must be in user scope.
**AR/EN:** `inventory.transfer.title`="التحويلات"/"Transfers", `inventory.transfer.from`="من مخزن"/"From", `inventory.transfer.to`="إلى مخزن"/"To", `inventory.transfer.over_avail`="الكمية أكبر من المتاح في المصدر"/"Quantity exceeds source availability".
**Acceptance:** from≠to enforced; posting writes paired movements; appears in both items' ledgers.

---

## 11) Screen — Adjustments (`/inventory/adjustments`, `/new`, `/:id`)

**Purpose:** correct balances via a documented adjustment with a **required reason**.
**List:** number · warehouse · date · reason pill · #items · net diff value · actions.
**Editor (`/new`):** warehouse ✱, date, **reason ✱** (select: damage/spoilage/count_diff/gift_sample/entry_fix), note, lines (item + signed qty ±). `post` (primary, `AlertDialog` confirm) → creates `adjustment` movements.
**States:** all 5. **Permissions:** `inventory.adjustment.create` (+ often `inventory.adjustment.post` for posting). Reason cannot be empty.
**AR/EN:** `inventory.adjustment.title`="التسويات"/"Adjustments", `inventory.adjustment.reason`="السبب"/"Reason", reasons: "هالك|تالف|فرق جرد|هدية/عيّنة|تصحيح إدخال" / "Damage|Spoilage|Count diff|Gift/Sample|Entry fix", `inventory.adjustment.post_confirm`="ترحيل التسوية سيغيّر الأرصدة. متابعة؟"/"Posting will change balances. Continue?".
**Acceptance:** reason required; posting writes adjustment movements; negative qty rendered with sign + semantic color, never position-only.

---

## 12) Screen — Low stock (`/inventory/low-stock`)

**Purpose:** items at/below reorder level; hand off to Purchasing.
**Layout:** filtered items table (code · name · warehouse · balance · reorder_level · shortfall · suggested order qty). Multi-select → `create purchase order` (primary) hands selection to Purchasing (cross-module stub in v1: navigates to `/purchasing/orders/new?from=lowstock&ids=…`).
**States:** loading · empty ("no low-stock items" — positive empty) · error · offline. **Permissions:** `inventory.item.view`; the PO button requires `purchasing.order.create` (hidden otherwise).
**AR/EN:** `inventory.lowstock.title`="قاربت النفاد"/"Low stock", `inventory.lowstock.shortfall`="العجز"/"Shortfall", `inventory.lowstock.create_po`="إنشاء أمر شراء"/"Create purchase order", `inventory.lowstock.empty`="مفيش أصناف قاربت النفاد"/"No low-stock items".
**Acceptance:** lists only items ≤ reorder level within scope; selection deep-links to a new PO.

---

## 13) Drawer wizard — Bulk import

**Purpose:** onboard items from Excel (critical). Full-height `Drawer` with steps.
**Steps:** (1) **Download template** + upload (drag/drop .xlsx/.csv). (2) **Map columns** (auto-match by header; manual remap). (3) **Validate & preview** — table of parsed rows split into *valid* and *error* (each error row shows a per-row reason; inline fix or skip). Summary: X valid / Y errors. (4) **Confirm import** → progress. (5) **Result report** — imported/failed counts + downloadable error report.
**States:** parsing (progress), validation error rows, network error (retry), offline (queue import, run on reconnect — note this clearly).
**Permissions:** `inventory.import`.
**AR/EN:** `inventory.import.title`="استيراد من Excel"/"Import from Excel", `inventory.import.download_tpl`="تنزيل القالب"/"Download template", `inventory.import.valid`="صفوف سليمة"/"Valid rows", `inventory.import.errors`="صفوف بها أخطاء"/"Rows with errors", `inventory.import.row_error`="السبب: {{reason}}"/"Reason: {{reason}}".
**Acceptance:** invalid rows rejected individually with a clear per-row reason; valid rows import even when others fail.

---

## 14) Modal — Print barcode

`Dialog`: select items (current selection or search), label template (select), copies per item (number), preview. `print` → generates printable sheet (single or bulk). **Permissions:** tied to `inventory.item.view`. **AR/EN:** `inventory.barcode.title`="طباعة باركود"/"Print barcode", `inventory.barcode.copies`="عدد النسخ"/"Copies", `inventory.barcode.template`="القالب"/"Template".

---

## 15) Module-wide RTL, numbers, offline (from FE_00 + SPEC §5/§7)

- Logical properties only; action column at the **logical end**; transfer arrow mirrors in RTL.
- Western digits + `tabular-nums` for all qty/prices; currency `ج.م` after the number; signed/negative qty uses sign + semantic color, not position.
- Item names may mix Arabic/Latin/digits → bidi tested in table, ledger, and forms.
- Offline: read from local cache; quick-add + (future POS) movements stored local with `local/syncing/synced/conflict`. **Conflicts:** balances replay as movements (no overwrite); real conflicts (e.g. concurrent manual adjustment) surfaced for user resolution — never silently resolved.

## 16) Performance (SPEC §7)
Virtualized item/ledger tables; server-side search/filter/pagination in the mock signature; lazy thumbnails; balances fetched on demand (not all warehouses at once); no heavy animation in large tables.

---

## 17) Coverage matrix (completeness check)

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Item | list, card(6 tabs), quick-add, ledger | ✓ | ✓ | item.* + scope | ✓ |
| Category | tree | ✓ | ✓ | category.manage | ✓ |
| UoM | item tab 4 | ✓ (form) | ✓ | item.edit | ✓ |
| Price list | list, editor | ✓ | ✓ | pricelist.manage | ✓ |
| Warehouse | list, modal | ✓ | ✓ | warehouse.manage | ✓ |
| Balance | computed (list/ledger) | read-only | ✓ | scope | ✓ |
| Ledger | drawer + tab | ✓ | ✓ | item.view | ✓ |
| Stocktake | list, create, editor | ✓ | ✓ | stocktake.create/approve | ✓ |
| Transfer | list, editor, view | ✓ | ✓ | transfer.create + scope | ✓ |
| Adjustment | list, editor, view | ✓ | ✓ | adjustment.create/post | ✓ |
| Low stock | view | ✓ | ✓ | item.view (+ po.create) | ✓ |
| Bulk import | drawer wizard | ✓ | ✓ | import | ✓ |
| Barcode | modal | n/a | ✓ | item.view | ✓ |

## 18) Module acceptance criteria
1. No balance mutates except via a movement record (opening/in/out/transfer/adjustment/stocktake).
2. Service items have no balance and are excluded from stocktake.
3. Invoice line price defaults from the customer's price list (set here), overridable per line in Sales.
4. Item without eta_code (ETA on) saves but is flagged not-issuable.
5. Bulk import rejects invalid rows individually with a clear per-row reason.
6. Stocktake approval creates an adjustment equal to the net difference; mode locked at creation.
7. Every data screen implements all 5 states incl. offline; everything RTL with logical properties; all strings via i18n keys.

**Fixtures:** `Flexova_FE_01_Inventory.fixtures.json` (Egyptian context — items, categories, units, price lists, warehouses, balances, ledger, stocktakes, transfers, adjustments, tax types).

*End of FE_01 Inventory — version 1.0*
