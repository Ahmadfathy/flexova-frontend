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
