# Flexova — Inventory Deep-Dive · Frontend Spec (EN, build-ready)

> Cumulative frontend spec for the Inventory **deep-dive** features. One file per module, appended per feature.
> **Source of truth (do not redefine):** `Flexova_FE_01_Inventory` (v1 build) · `Flexova_FE_00_Foundation` (tokens/components/shell/i18n/appearance) · `Flexova_SPEC_EN_00_DesignSystem`.
> **Carried golden rule:** balances change only via documented **movements**; no editable balance field. In deep-dive the balance carrier becomes the **variant** (see DD-1 D5).
> Version: DD-1 — August 2026.

---

## Repo integration map (real paths — verified against branch `chore/fe21-phase-a-monorepo`)
**pnpm + Turborepo monorepo.** Work only inside **`apps/erp`** (`@flexova/erp`). Do NOT touch `apps/storefront` or `packages/shared` (design tokens live in `packages/shared/src/tokens/tokens.css` — off-limits). Integrate here:
- **Fixtures:** `apps/erp/src/lib/mock/fixtures/Inventory.fixtures.json` (single file, capital I). Merge `Inventory.fixtures.variants.json` into it.
- **Mock client:** `apps/erp/src/lib/mock/client.ts` (add attribute/variant methods).
- **i18n:** `apps/erp/src/i18n/locales/ar/inventory.json` + `.../en/inventory.json` (AR default, EN mirror).
- **Feature module:** `apps/erp/src/features/inventory/` → `items/` (`ItemsListPage.tsx`, `QuickAddModal.tsx`, `useItems.ts`, `types.ts`), `categories/`, `price-lists/`, etc. Layout `InventoryLayout.tsx`.
- **Routes:** `apps/erp/src/App.tsx` (inventory routes are children of `/inventory`; currently only `items` exists as a page — NO `items/:id` route yet).
- **Nav/tabs:** `apps/erp/src/config/menu.ts` → the `inventory` entry's `children[]` (each `SubItem` = `{key, route}`; `SubItem` has **no** flag field yet — add optional `flag?: string` to gate the Attributes tab).
- **Feature flags:** `apps/erp/src/lib/flags.ts` → add `"inventory.variants"` to the `FlagKey` union + `FLAGS` record (unregistered flags default to enabled, so it MUST be registered to be gateable). Use `isFlagEnabled("inventory.variants")`.
- **Permissions:** `apps/erp/src/lib/permissions.ts` + `useCan()`.
- **Patterns:** `apps/erp/src/components/patterns/` (`ModalShell`, `DrawerShell`, …), `apps/erp/src/components/ui/` (shadcn).

> **⚠ Reality correction (supersedes §3's "tabbed item card" wording):** v1 has **no multi-tab item detail page**. Items are created via **`QuickAddModal`** (a `ModalShell`) and listed in `ItemsListPage`. There is no `/inventory/items/:id`. Therefore the Variants build must **introduce an Item editor surface** — recommended: a full **Item Editor** at a new route `/inventory/items/:id` (or a `DrawerShell`) that hosts the Basic fields + the **Variants section (attribute picker + Matrix grid)**. Where §3 below says "Tab N", read it as "section of the new Item Editor". `QuickAddModal` stays the fast-create path (add the has_variants toggle there to route into the editor for matrix setup).

---

## Feature DD-1 — Variants / Matrix

### 0) Decisions locked (from chat, do not reopen)
| # | Decision |
|---|---|
| D1 | Model = **parent product template + generated variant SKUs**. Parent has **no balance**; each variant is an independent SKU. |
| D2 | **Global attribute library** (reusable: Size, Color…), each attribute typed `list` / `color` / `number`. |
| D3 | Matrix generation = **auto cartesian** of selected attribute-values + manual exclusion of missing combos. |
| D4 | Inheritance + selective **override**: variant inherits parent (name base, category, description, shared images, tax_type) and may override price, barcode, own image, reorder_level, eta_code. |
| D5 | **Variant × warehouse = balance carrier** (carried rule). Parent shows a **rollup** only. Each variant has its own ledger. |
| D6 | **eta_code at variant level** (inherits a base from parent); warn (not block) if missing — same as v1. |
| D7 | Each variant is a **row in every price list**; tool "apply parent price to all"; per-line override kept. |
| D8 | simple→variant migration = **deferred**; data model reserves the hook (variant_of nullable). |
| D9 | Feature flag = **tenant module flag** enables capability + **per-item toggle** "product has variants". Simple items unaffected. |
| D10 | Practical cap = **3 attributes/product** (soft warning above). |

### 1) Routes & IA (additions to FE_01 §1)
```
/inventory/attributes                → Attribute library (list)            [§4]
/inventory/attributes/:id            → Attribute editor (values)           [§4]  (modal or side pane)
/inventory/items/new?type=variant    → Item create in variant mode         [§3]
/inventory/items/:id                 → Item detail; if product → Variants tab + Matrix [§3]
/inventory/items/:id/variants/:vid   → Variant quick-edit (drawer)         [§3.6]
```
- New secondary tab in the module tab bar, inserted after **Categories**: **Attributes** (visible only when the Variants capability flag is on; otherwise hidden entirely).
- No standalone "variants list" screen — variants live under their parent product and inside the main Items list (see §2).

### 2) Items list changes (`/inventory/items`) — extends FE_01 §3
- **Row model becomes hybrid:** a row is either a **simple item** or a **product parent**. Variant SKUs are **not** top-level rows by default.
- Product-parent row:
  - `thumb` = parent shared image · `name` = parent name · `code` = parent code (e.g. `TSH-500`) with a **"N variants"** `Badge`.
  - `balance` column = **rollup** (Σ available across all variants, scope-respected) with `.num`; tooltip "إجمالي كل المقاسات/الألوان".
  - `sale_price` column = **range** `من ٨٥ إلى ٩٥ ج.م` when variant prices differ, single value when equal.
  - `status` pill = parent status; if **any** variant is low-stock → additional `low-stock` pill on the parent.
  - Row **expander** (chevron at logical start): expands inline to show variant sub-rows (variant name = attribute combo e.g. "أحمر · M", per-variant code/balance/price/status). Virtualized; lazy per parent.
- **Filter additions:** `Attribute` multi-select (e.g. Color=أحمر) → matches products that have a variant with that value; a `has_variants` toggle in the Item-type filter (values: all / simple / product).
- **Search:** now also matches variant code and variant barcode → a hit on a variant scrolls to and expands its parent, highlighting the variant sub-row.
- **Bulk actions** on a product parent apply to all its variants (suspend/activate/change category/print barcode/export); deletion still blocked if **any** variant has movements.
- **Export** of a product yields one row per variant (flattened) so Excel stays SKU-level.

### 3) Item card — variant mode (extends FE_01 §4)
When `item_type = stocked` **and** the "product has variants" toggle is on (Basic tab), the form switches to **product mode**:

**Tab 1 — Basic:** adds a toggle `inventory.item.has_variants` (only rendered when the capability flag is on). Turning it on:
- Reveals the **Variants** tab (Tab 7) and disables the single `barcodes` field on Basic (barcodes move to variant level).
- `base_uom`, `category`, `tax_type`, `name_ar/en` (as name base), `image`(s) stay on the parent and are **inherited**.

**Tab 2 — Pricing & Tax (product mode):** the single `sale_price` is replaced by a note "الأسعار تُدار على مستوى المتغيّرات" + a shortcut "اذهب لتبويب المتغيّرات". `tax_type` and the base `eta_code` remain on the parent (inherited default).

**Tab 3 — Stock (product mode):** reorder/max and **opening balances** are entered **per variant** inside the Matrix grid (§3.4), not here. This tab shows a read-only rollup and a link to the Variants tab.

**Tab 7 — Variants (NEW, product mode only):** two stacked sections:
1. **Attribute picker:** choose 1–3 attributes from the library (`MultiSelect` sourced from `/attributes`) + per attribute pick the applicable values (chips). "+ new value" inline (writes back to the library, confirm). Soft warning `inventory.variants.too_many_attrs` when >3.
2. **Matrix grid** — see §3.4.

**Tab 6 — Ledger:** in product mode, a **variant selector** filters the ledger to a chosen variant (or "all" = merged, read-only). Header rollup shows per-variant then total.

#### 3.4 Matrix grid (the core new component)
- **Generation:** on attribute/value change, auto-build the cartesian product. Grid rows = combinations. Two attributes → one row per (v1×v2); three → flattened rows with grouping headers by the first attribute.
- **Columns per combination row:** `include` (checkbox, default on) · `combo` (read-only, e.g. "أحمر · L") · `variant_code` (auto-gen `PARENT-RED-L`, editable, unique-checked) · `barcode` (tag/auto) · `sale_price` (default = parent suggestion, editable) · `reorder_level` · per-warehouse `opening_qty` + `opening_cost` (repeater columns, collapsible) · `status`.
- **Bulk row above grid:** "set price for all", "generate all barcodes", "apply reorder to all", "select/deselect all".
- **Exclusion:** unchecking `include` drops that combo (no SKU created). Excluded combos remembered; re-checking re-adds.
- **Edit mode (existing product):** grid pre-fills existing variants; adding a new attribute value expands the grid with new (empty, includable) rows; **removing** a value whose variant has movements is **blocked** (tooltip `inventory.variants.cant_remove_value`) — offer "suspend variant" instead.
- **Validation:** every included row needs a unique code; opening entries create `opening` movements per variant on save (never editable balances); at least one included variant required to save a product.
- **Perf:** grid virtualized when combos > 40; barcode auto-gen batched.

#### 3.5 States (Matrix / product mode)
- **Loading (edit):** skeleton grid (header + 6 skeleton rows).
- **Empty:** product with attributes chosen but no values yet → inline hint "اختر قيم المتغيّرات عشان نولّد المصفوفة".
- **Error:** save error → toast `inventory.errors.save`, keep grid state.
- **Offline:** variant creation stored local; each new variant row shows a sync chip; opening movements queued.
- **Combinatorial guard:** if projected combos > 200 → block generate with `inventory.variants.combo_explosion` (suggest fewer values / split product).

#### 3.6 Variant quick-edit drawer (`/items/:id/variants/:vid`)
Opened from a variant sub-row action or matrix row "edit". `Drawer` fields: variant image (override), barcode(s), price per price-list, reorder_level, eta_code (override), status. Shows inherited-from-parent values as muted placeholders with an "override" affordance. Save writes only overrides.

### 4) Attribute library screen (`/inventory/attributes`)
- **List:** table — name_ar · name_en · type pill (`list`/`color`/`number`) · #values · #products using it · actions. `+ attribute`.
- **Editor (modal or `/:id`):** name_ar ✱, name_en, type (segmented). For `list`/`color`: values repeater (value name_ar/en; for `color` also a swatch hex/`ColorPicker`). For `number`: unit label + min/max/step (used later by sold-by-weight; here informational).
- **Delete/edit guards:** an attribute or value **in use** by any product's variants cannot be deleted (block + count + "used by N products"); renaming a value is allowed and propagates to variant display names.
- **States:** loading/empty("لسه مفيش متغيّرات" + create)/error/offline. **Permissions:** `inventory.attribute.manage` (create/edit/delete); view with `inventory.item.view`.

### 5) Permissions (additions to FE_01 §3.7 / §4.8)
| Permission | Gates |
|---|---|
| `inventory.attribute.manage` | Attributes tab + create/edit/delete attributes & values |
| `inventory.item.variants` | "has_variants" toggle, Variants tab, matrix generate/edit |
| `inventory.item.opening` (existing) | per-variant opening balances in the matrix |
- No `inventory.item.variants` → the toggle is hidden; existing products render read-only with a locked note. Attributes tab hidden without `attribute.manage` **and** no products using variants.
- Variant balance rollups still respect **warehouse scope** (out-of-scope warehouses excluded from the rollup silently, as v1).

### 6) i18n keys (namespace `inventory`, AR default + EN mirror)
| key | AR | EN |
|---|---|---|
| inventory.tabs.attributes | المتغيّرات (المكتبة) | Attributes |
| inventory.item.has_variants | هذا المنتج له متغيّرات (مقاسات/ألوان) | This product has variants (sizes/colors) |
| inventory.item.tab_variants | المتغيّرات | Variants |
| inventory.variants.attr_picker | اختر خصائص المتغيّرات | Choose variant attributes |
| inventory.variants.matrix_title | مصفوفة المتغيّرات | Variant matrix |
| inventory.variants.combo | التركيبة | Combination |
| inventory.variants.include | إدراج | Include |
| inventory.variants.set_price_all | تحديد سعر للكل | Set price for all |
| inventory.variants.gen_barcodes | توليد باركود للكل | Generate all barcodes |
| inventory.variants.count | {{n}} متغيّر | {{n}} variants |
| inventory.variants.price_range | من {{min}} إلى {{max}} ج.م | {{min}}–{{max}} EGP |
| inventory.variants.too_many_attrs | يُفضّل ٣ خصائص كحدّ أقصى للمنتج الواحد | Up to 3 attributes per product is recommended |
| inventory.variants.combo_explosion | عدد التركيبات كبير جداً — قلّل القيم أو قسّم المنتج | Too many combinations — reduce values or split the product |
| inventory.variants.cant_remove_value | لا يمكن حذف قيمة لها متغيّر بحركات — أوقفه بدلاً من ذلك | Can't remove a value whose variant has movements — suspend it instead |
| inventory.variants.rollup_hint | الرصيد إجمالي كل المتغيّرات | Balance is the total across all variants |
| inventory.variants.inherited | موروث من المنتج الأساسي | Inherited from the base product |
| inventory.attribute.name | اسم الخاصية | Attribute name |
| inventory.attribute.type_list | قائمة | List |
| inventory.attribute.type_color | لون | Color |
| inventory.attribute.type_number | رقم | Number |
| inventory.attribute.in_use | مستخدمة في {{n}} منتج | Used by {{n}} products |
| inventory.attribute.cant_delete | لا يمكن الحذف — الخاصية مستخدمة | Can't delete — attribute is in use |

### 7) Responsive
- Items list: product parents keep the expander; on mobile card-list a product card shows "N متغيّر" and taps to a variants sheet.
- Matrix grid: desktop full grid; tablet hides opening-balance columns behind a per-row "opening" expander; mobile renders combos as stacked cards (combo header + fields), one card per SKU.

### 8) Acceptance criteria (DD-1)
1. Turning on "has_variants" hides the parent barcode + single price and reveals the Variants tab; simple items are unchanged.
2. Attribute library is global; a value in use cannot be deleted; renaming propagates to variant display names.
3. Matrix auto-generates the cartesian of selected values; excluded combos create no SKU.
4. Each included variant is an independent SKU with its own code, barcode(s), price per list, and **its own balance & ledger**; the parent shows a scope-respecting rollup and never an editable balance.
5. Opening balances entered in the matrix create `opening` movements per variant (visible in that variant's ledger), never a direct balance edit.
6. Variant without eta_code (ETA on) saves but shows an **"ETA missing" warning badge** in Inventory (on the variant row in the matrix, on the parent row in the Items list when any variant is missing, and in the variant quick-edit drawer). The badge is **warning-only, never a save-block**; the actual issue-time block stays in Sales/POS. The same badge is applied to **simple items** missing eta_code (removes the variant/simple inconsistency). A parent header counter may show "N of M variants missing ETA".
7. Removing an attribute value with a movement-bearing variant is blocked; suspend is offered instead.
8. Items-list search matches variant code/barcode and expands the parent to the hit; export flattens to one row per variant.
9. `combo_explosion` guard blocks >200 projected combinations; `too_many_attrs` warns above 3 attributes.
10. All new screens implement the 5 states incl. offline; fully RTL with logical properties; every string via an i18n key.

**Fixtures:** merge `inventory.fixtures.variants.json` into `inventory.fixtures.json` (adds `attributes`, `attribute_values`, product-parent items with `variants[]`, per-variant balances/prices/barcodes, and variant-level ledger rows).

*End of DD-1 (Variants) — appended to Inventory deep-dive frontend spec.*

---

## DD-2 — Batch / Expiry

Builds on DD-1 (variants as balance carrier, Item Editor at `/inventory/items/:id`, warning-badge convention). **No new design tokens.**

### 0. Scope & flag

- Feature flag: **`inventory.batch_expiry`** — registered in `apps/erp/src/lib/flags.ts` (toggle-able; not silent-default).
- All batch UI is **feature-flag-aware**: when the flag is off, or when an item has `tracks_batch=false`, every screen behaves exactly as DD-1 (no batch fields, no batch selection, receipts/opening work without batch).
- **Golden rule preserved:** balance is always `Σ stock_movement.qty`, now per **(variant × warehouse × batch)**. No editable balance field anywhere in the UI.

### 1. Entities surfaced to the user

| Entity | User-facing meaning | Key fields shown |
|---|---|---|
| `stock_batch` | تشغيلة / Lot | lot_number, expiry_date (nullable), mfg_date, supplier_ref, effective status, per-warehouse qty |
| item toggles | tracking config on the item | `tracks_batch`, `requires_expiry`, `near_expiry_days` |
| movement | now carries `batch_id` | existing ledger + batch column |

**Effective status (computed, never stored beyond active/hold):**
`hold` → `depleted` (balance 0) → `expired` (expiry < today) → `near_expiry` (expiry ≤ today + effectiveNearExpiryDays) → `active`.
`effectiveNearExpiryDays = coalesce(item.near_expiry_days, settings.global_near_expiry_days)` (same coalesce pattern as DD-1's `effectiveEtaCode`).

### 2. Screens & fields

#### 2.1 Item Editor → Batch/Expiry section
Route: existing `/inventory/items/:id` (DD-1 Item Editor), inside the Stock tab. Shown only when `flags.inventory.batch_expiry` is on.

Fields: `tracks_batch` toggle · `requires_expiry` toggle (shown only when tracked, default ON; off = lot-only for devices/consumables) · `near_expiry_days` optional per-item override (empty = inherit `settings.global_near_expiry_days`).

#### 2.2 Item Editor → Batches tab
List: lot · expiry · mfg · supplier ref · per-warehouse balance chips · status badge (reuses the DD-1 warning-badge convention — `Flag` icon + tint classes; expired uses the existing danger tint, never a new token) · row actions (Hold/Release, Quarantine, Trace), permission-gated. Depleted rows collapse behind a "show depleted" toggle. Empty state when no batches yet.

#### 2.3 Stock-in / Receipt modal
When `tracks_batch=on`, each receipt line adds `lot_number` (required), `expiry_date` (required iff `requires_expiry`), `mfg_date`, `supplier_ref`, `cost`, `qty`, `warehouse`. **Merge preview:** a `(variant + lot + expiry)` match shows an inline merge notice and resulting new balance — no new batch row, a receipt movement is appended. Flag off / item not tracked → line renders exactly as DD-1.

Reality note (implemented): v1/DD-1 Inventory has no receipt concept at all (GRN lives in unbuilt Purchasing) and no separate opening-per-batch grid — one Receipt modal covers both: item with zero balance so far ⇒ `opening` movement; later stock-ins ⇒ `receipt`. Same golden-rule outcome as a two-screen design, less new surface.

#### 2.4 Opening balances (per batch)
Folded into the Receipt modal per the note above — each submission emits an `opening` or `receipt` movement with `batch_id`, never a direct balance edit. Non-tracked items keep the DD-1 single-row behavior.

#### 2.5 Issue / Transfer / Adjustment
Shows the batch-selection engine's auto-selected batch(es) (FEFO for expiry-tracked, FIFO for lot-only) read-only, qty split per batch. **Manual pick** button (permission `inventory.batch.manual_pick`) opens the Batch picker modal.

#### 2.6 Batch picker modal (manual override)
Sortable list of a carrier's batches with balance in the selected warehouse and status badge. Expired/hold batches are disabled unless the user also holds `inventory.batch.issue_override`, in which case picking one requires an explicit reason (audit-logged with the resulting movement). Per-batch allocation input; total must equal the qty needed.

#### 2.7 Expiry alerts (Low-stock page)
A flag-gated "Expiring soon / Expired" section on `/inventory/low-stock`, grouped by item, with lot/expiry/status/per-warehouse qty and a link back to the item's Batches tab.

#### 2.8 Items list — rollup badges
Parent/item row shows a batch-warning badge (compact `Flag` chip, same sizing as `EtaMissingFlag`) when **any** of its batches is `near_expiry` or `expired` (same "parent learns from any variant" rule as DD-1). Stacks with, never replaces, the ETA-missing badge.

#### 2.9 Quarantine & write-off
**Quarantine** on an expired batch → transfer movement (source warehouse → `wh_damaged`, reason `expired`); batch stays traceable. **Write-off** on a batch sitting in `wh_damaged` → adjustment-out (reason `expired`). Both permission-gated (`inventory.batch.quarantine`) and audit-logged (toast confirmation in this mock build).

#### 2.10 Traceability view
Batch → chronological movement timeline (receipt/opening → transfers → issues → quarantine → write-off), each with source_ref, warehouse, qty, user. Read-only drawer, reachable from the Batches tab, the picker, and the expiry-alerts section.

### 3. i18n keys
Namespace `batch.*` in `i18n/locales/{ar,en}/inventory.json`: `tracks_batch`, `requires_expiry`, `near_expiry_days`, `lot_number`, `expiry_date`, `mfg_date`, `supplier_ref`, `status.{active|near_expiry|expired|hold|depleted}`, `near_expiry_hint`, `expired_hint`, `hold_hint`, `merge_notice`, `empty`, `manual_pick`, `issue_override_confirm`, `quarantine`, `write_off`, `trace`, `expiring_section_title`, plus the receipt/issue/picker flow strings (`receipt_*`, `issue_*`, `picker_*`, `override_reason_*`, `hold_*`, `quarantined`, `written_off`, `show_depleted`). `item_editor.tab_batch` added alongside the existing tab labels. A `ledger.*` block (column headers + one label per movement type, including the new `receipt`/`issue`/`transfer_in`/`transfer_out`) was added at the same time — it covers the DD-1 ledger table too, which had shipped without i18n entries for those columns.

### 4. Permissions
`inventory.batch.manual_pick` (see & use the manual picker) · `inventory.batch.issue_override` (issue an expired/hold batch, with reason) · `inventory.batch.hold` (set/release hold) · `inventory.batch.quarantine` (quarantine + write-off). Used ad hoc via `useCan()` (still the always-true mock stub — DD-1's `inventory.item.variants` precedent, not registered in the FE_08 admin catalog).

### 5. Acceptance criteria (DD-2)
1. Flag off → zero batch UI anywhere; DD-1 screens unchanged.
2. `tracks_batch=on, requires_expiry=on` → receipt line blocks save without `expiry_date`.
3. `requires_expiry=off` (lot-only) → receipt saves without expiry; issue uses FIFO by receipt date.
4. Receiving `(variant+lot+expiry)` that already exists → no new batch row; balance accumulates; merge notice shown.
5. Issue on an expiry-tracked item auto-selects the nearest-expiry **active** batch; expired & hold batches are never auto-picked.
6. Manual pick hidden without `inventory.batch.manual_pick`; picking expired/hold requires `issue_override` + reason, both audit-logged.
7. Status badges render for all five derived states using existing tokens only; parent rollup lights up from any batch; stacks with the ETA-missing badge.
8. `near_expiry` window respects item override then global (coalesce); the milk item (override 7 days) and paracetamol (global 30 days) both classify per the fixtures.
9. Quarantine moves qty to `wh_damaged` (balance reconciles); write-off zeroes it; the batch remains in trace.
10. Every screen's displayed balance equals `Σ stock_movement.qty` for its (variant×warehouse×batch) — no field edits.

**Fixtures:** merged `Inventory.fixtures.batch.json` into `Inventory.fixtures.json` (adds 4 self-contained demo items — pharma/food/device — their `stock_batch` rows, batch-tagged `ledger` movements, and `settings.global_near_expiry_days`). `StockBatch` always carries an explicit `item_id`; `variant_id` is set only when the batch belongs to a real DD-1 product-variant, else `null`. The balance carrier is `coalesce(variant_id, item_id)` — resolved by one `balanceCarrier()` function in `items/batches.ts`, used for both the merge key and the selection engine's key, never `variant_id` unconditionally. No separate "default variant" entity was invented on the frontend for simple items (the backend's `item_variant.variant_of` defaulting to `item_id` covers that at the data layer).

**Disclosed, non-blocking simplifications:** batch tracking is only wired for simple (non-`is_product_parent`) items — no fixture combines a DD-1 product-parent with DD-2 batches, so the per-variant selector mentioned in §2.2 isn't built; the Issue/Adjustment flows are self-contained inside Inventory (no Sales/POS integration exists yet to drive them from); Quarantine/Write-off/Hold confirmations are local mock toasts, not a real audit-log table.

*End of DD-2 (Batch/Expiry) — appended to Inventory deep-dive frontend spec.*

---

# DD-3: FIFO / FEFO Costing (Frontend Spec)

Builds on DD-1 (variants = balance carrier) and DD-2 (batch/expiry, `selectBatchesForIssue`, movement carries `batch_id`, cost on the movement). **No new design tokens.**

## 0. Scope & flag

- Costing is part of the **Hard Core** — it is **not** behind a module flag. Valuation/COGS must always exist. What *is* configurable is the **method per item** (see §1).
- Batch costing rides on **`inventory.batch_expiry`** (DD-2): when batches are on, batch-tracked items cost by the specific batch that was issued; when off, items cost by FIFO or Weighted Average.
- **Golden rule preserved:** cost is derived from `stock_movement.cost` + qty (Pin A). No stored/editable "current cost" field is the source of truth. `item.avg_cost` is a **cache/display** value maintained from movements, never hand-edited.
- **Boundary:** DD-3 **computes** COGS + valuation deltas and surfaces them in Inventory UI. It **does not post** to the ledger — posting `Dr COGS / Cr Inventory` is Accounting's job (module #3). DD-3 emits an event/contract at that seam.

## 1. Entities & config surfaced to the user

| Entity / field | User-facing meaning | Where |
|---|---|---|
| `settings.default_costing_method` | tenant-wide default: **FIFO** or **Weighted Average** | Inventory Settings |
| `item.costing_method` | per-item override; empty = inherit tenant default | Item Editor |
| effective method (computed) | `coalesce(item.costing_method, settings.default_costing_method)`; **forced `specific` when the item is batch-tracked** | shown as a read-only chip |
| `item.avg_cost` | current unit cost (maintained from movements) | Item cost card, lists |
| cost layers (derived) | the receipts still holding stock, oldest→newest, each with remaining qty + unit cost | Item cost card |
| COGS on a sale line | cost of goods sold for that issue | Sales/POS doc (margin) |

**Effective method resolution (read-time, never stored beyond the two fields above):**
```
if item.tracks_batch  -> 'specific'      (batch actual cost — method field ignored & shown disabled)
else                  -> coalesce(item.costing_method, settings.default_costing_method)  // 'fifo' | 'average'
```
Same coalesce/inheritance pattern as DD-2's `effectiveNearExpiryDays`. **LIFO is not offered** (disallowed under IAS 2 / Egyptian accounting).

## 2. Screens & fields

### 2.1 Inventory Settings → **Costing** (new field, new page — `/inventory/settings`)
- Radio **`default_costing_method`**: `FIFO` (default) · `Weighted Average`.
- Changing the tenant default affects only items with no per-item override and is **prospective** (does not retro-rewrite historical COGS). Confirm dialog.

### 2.2 Item Editor → **Costing** (extends DD-1 Item Editor, `/inventory/items/:id`, Pricing tab)
- Select **`costing_method`**: `— (inherit) · FIFO · Weighted Average`. Placeholder shows the inherited tenant default as a ghost value (same pattern as `near_expiry_days`).
- When `tracks_batch=on`: the select is **disabled** and shows a read-only chip ("تكلفة فعلية للتشغيلة") — because batch items cost by the exact batch issued.

### 2.3 Item Editor → **Cost card** (new panel, permission `inventory.cost.view`)
Read-only valuation view for the item — current unit cost + effective method chip, cost-layer stack (FIFO/batch: Receipt ref/date/unit cost/qty remaining/layer value, oldest at top, depleted layers behind a toggle) or, for average items, a running-average timeline; total valuation per warehouse. Entirely hidden without `inventory.cost.view`.

### 2.4 Issue / Sale — **COGS surfacing** (read-only, permission-gated)
- On any issue, the system computes COGS by consuming layers in effective-method order and writes it to the issue movement's `cost`.
- Where `inventory.cost.view` is granted, the issue flow shows a small **margin** readout: `unit price − unit COGS` (amount + %).
- **Batch items:** the batch already chosen by DD-2's `selectBatchesForIssue` drives the cost.

### 2.5 Returns
- **Sales return:** re-enters stock as a **receipt** whose unit cost = the **COGS recorded on the original sale movement**.
- **Purchase return:** an **issue** consuming that supplier's layer; COGS of the return = that layer's cost.

### 2.6 Stock adjustments / stocktake — cost handling
- **Shortage** → adjustment-out valued at effective-method cost → surfaces as an inventory loss at the Accounting seam.
- **Overage** → adjustment-in; default = current `avg_cost` (or last purchase price); a permission-gated field (`inventory.costing.overage_cost`) lets a supervisor override.

### 2.7 Negative stock / offline-first (POS) — provisional cost
- An issue with **no covering layer** is **allowed** (offline-first) and valued at the item's current running cost (provisional), tagging the movement `pending_cost_reconciliation`. A chip + reconcile action appear on the cost card; the covering receipt reconciles the COGS delta and clears the flag.

### 2.8 **Inventory Valuation report** (new route `/inventory/valuation`, permission `inventory.cost.view`)
- Table: Item · Category · Warehouse · Qty on hand · Effective method · Unit cost · **Total value**. Grand total + filters: warehouse, category, method, "as-of date". Export gated by `inventory.cost.export`.

## 3. i18n keys
`costing.default_method`, `costing.default_method_hint`, `costing.change_default_confirm`, `costing.method_label`, `costing.method.fifo`, `costing.method.average`, `costing.method.inherit`, `costing.specific_locked`, `costing.cost_card_title`, `costing.unit_cost`, `costing.qty_remaining`, `costing.layer_value`, `costing.total_valuation`, `costing.new_avg`, `costing.show_depleted`, `costing.margin`, `costing.overage_cost`, `costing.pending_reconciliation`, `costing.valuation_report_title`, `costing.as_of_date`, `costing.method_chip`.

## 4. Permissions
`inventory.cost.view` · `inventory.cost.export` · `inventory.costing.overage_cost` · `inventory.costing.method_edit`. Used ad hoc via `useCan()` (still the always-true mock stub — same convention as DD-2's four batch permissions, not registered in the FE_08 admin catalog).

## 5. Acceptance criteria — verified

1. Non-batch item, FIFO, receipts 100@10 then 100@12: issue 150 → COGS **1600**; remaining layer 50@12; valuation **600**. ✅ (`it_cost_fifo`)
2. Non-batch item, Weighted Average, receipts 100@10 then 100@14: `avg_cost`=**12** after 2nd receipt; issue 150 → COGS **1800**; remaining value **600**. ✅ (`it_cost_avg`)
3. Batch-tracked item: method locked to `specific`; issue costs each allocation at its own batch receipt cost — physical pick and cost consumption are the same order by construction. ✅
4. Sales return: return receipt cost equals the COGS on the original sale movement (10.6667), not current layer cost. ✅
5. Stocktake overage: adjustment-in defaults to `avg_cost`; override gated by `inventory.costing.overage_cost`.
6. Negative/offline issue with no layer: allowed, COGS at provisional running cost (15), flagged; covering receipt (16) reconciles delta (5) and clears the flag. ✅ (`it_cost_offline`)
7. Cost/margin hidden without `inventory.cost.view` everywhere (cost card, valuation report, issue margin) — price still shows.
8. Golden rule: every displayed unit cost/valuation is derivable from `Σ` over `stock_movement` for its carrier×warehouse(×batch); no hand-edited cost is a source of truth.
9. Changing the tenant default method is prospective.
10. Carrier: all costing keys on `carrier_id = coalesce(variant_id, item_id)`.
11. Valuation report "as-of date" replays movements up to that date.
12. No journal entries created in Inventory — COGS/valuation surface as a `CostEvent`; verified no ledger-posting call anywhere in `src/features/inventory`.

**Disclosed, non-blocking simplifications (same spirit as DD-2's):** Receipt/Issue/Return for **non-batch** stocked items is a genuinely new surface (`CostingSection.tsx`) — before DD-3 there was no stock-in/issue UI at all for `tracks_batch=false` items; built for simple (non-`is_product_parent`) carriers only, same trim as DD-2's batch UI. The Sales/POS margin readout lives inside Inventory's own Issue dialogs (batch and non-batch) — no Sales/POS module integration exists yet to drive it from (identical boundary to DD-2's Issue/Adjustment self-containment). Sales-return / purchase-return UI is built for non-batch carriers; the underlying `costing.ts` builders (`buildSalesReturnReceipt`, `buildCostingIssue` with `kind:"purchase_return"`) are carrier-agnostic and reusable once a batch-item return UI is wanted. Stocktake overage cost field + permission gate were added to `StocktakeEditorPage`'s summary calc; real ledger posting on stocktake/adjustment approval remains pre-existing mock-only (a gap that predates DD-3, not introduced or fixed by it).

*End of DD-3 (FIFO/FEFO Costing) — appended to Inventory deep-dive frontend spec.*
