# Claude Code Prompts — Inventory DD-1: Variants / Matrix

> Run in order from the repo root (`flexova-frontend`, a single Vite React app — NOT a monorepo).
> Reference specs: `docs/deep-dive/inventory/inventory.frontend.md` (frontend, build target) · `docs/backend-specs/modules/inventory.backend.md` (backend, context only — frontend runs on the mock layer, do NOT build a backend).
> Do NOT touch design tokens, the shell, or the appearance system. Mirror v1 Inventory patterns (ModalShell/DrawerShell, DataTable, StatusPill, useCan, i18n).
> After each step: `npm run typecheck` + lint, then verify the acceptance checks.

Real paths you will use:
- Fixtures: `src/lib/mock/fixtures/Inventory.fixtures.json`  (capital I, single file)
- Mock client: `src/lib/mock/client.ts`
- i18n: `src/i18n/locales/ar/inventory.json` + `src/i18n/locales/en/inventory.json`
- Feature module: `src/features/inventory/` (items/, categories/, price-lists/, …)
- Routes: `src/App.tsx` (children of `/inventory`)
- Nav tabs: `src/config/menu.ts` (the `inventory` entry → `children[]`)
- Flags: `src/lib/flags.ts`  ·  Permissions: `src/lib/permissions.ts`

---

## PROMPT 0 — Orientation (read-only)

```
Read, do NOT modify. Goal: confirm exactly where DD-1 Variants code will go.
Read:
- docs/deep-dive/inventory/inventory.frontend.md  (the build target; note the "Repo integration map" block)
- src/lib/mock/fixtures/Inventory.fixtures.json    (top-level keys, item shape, ledger shape)
- src/lib/mock/client.ts                           (how it loads fixtures + simulates mock states loading/empty/error/no_results/offline + latency)
- src/features/inventory/items/ItemsListPage.tsx, QuickAddModal.tsx, useItems.ts, types.ts
- src/config/menu.ts (the inventory entry + SubItem type), src/lib/flags.ts (FlagKey union + FLAGS + isFlagEnabled), src/App.tsx (inventory routes)
Report: (1) confirmed fixtures path + item/ledger field names, (2) how items are created/edited today (QuickAddModal — there is no items/:id detail page), (3) the SubItem type (does it support a flag field?), (4) how to register a new flag "inventory.variants". No code changes in this step.
```

---

## PROMPT 1 — Merge fixtures + extend the mock client

```
Additively add Variants demo data + client methods.
1. Merge docs/deep-dive/inventory/fixtures/Inventory.fixtures.variants.json into src/lib/mock/fixtures/Inventory.fixtures.json per its `merge_instructions`:
   - add new top-level arrays `attributes`, `attribute_values`
   - append it_tshirt, it_mug to `items`
   - append ledger_add rows to `ledger`  (ledger rows use fields: source_ref, cost, variant_id, item_id — MATCH the existing ledger shape)
   - add cat_apparel, cat_homeware to `categories`
   - modify NO existing record.
2. Extend src/lib/mock/client.ts with methods mirroring backend spec §2 (same latency + mock-state simulation as existing calls):
   listAttributes/getAttribute/create/update/deleteAttribute (409 if a value in use)
   listAttributeValues/create/update/deleteAttributeValue (409 if a variant uses it)
   listVariants(itemId)/createVariant/updateVariant(overrides only)
   generateVariants(itemId, {attributeValueSets, excludedCombos, perComboRows}) — ATOMIC (all-or-nothing), reject if projected combos > 200 or any duplicate variant code
   items list: support filters `has_variants` + `attribute_value_id[]` and `expand=variants`; stock/movements: accept `variant_id`.
Acceptance: JSON valid; existing screens unaffected; a product-parent returns variants[], rollup balance = Σ variant balances, and a price range; generateVariants rejects >200 combos and duplicate codes atomically. Report final fixtures path + new client method names.
```

---

## PROMPT 2 — Attribute library screen + flag + menu tab + i18n

```
Build the Attribute library (inventory.frontend.md §4), flag-gated.
1. Register the flag in src/lib/flags.ts: add "inventory.variants" to the FlagKey union AND the FLAGS record (value: import.meta.env.DEV). It MUST be registered (unregistered flags default to enabled).
2. src/config/menu.ts: add an optional `flag?: string` to the SubItem interface, then add a child to the inventory entry: { key: "attributes", route: "/inventory/attributes", flag: "inventory.variants" }, placed AFTER "categories". Update the tab renderer that maps children to filter out SubItems whose `flag` is disabled (isFlagEnabled).
3. Routes in src/App.tsx: add /inventory/attributes (list) and an editor (modal or /inventory/attributes/:id).
4. Screen (new files under src/features/inventory/attributes/): DataTable columns name_ar · name_en · type pill (list/color/number) · #values · #products using it · actions; "+ attribute". Editor: name_ar (required), name_en, type (segmented). list/color → values repeater (value_ar/value_en; color adds a swatch/hex via a color input). number → unit + min/max/step (informational).
5. Guards: deleting an attribute/value in use → block with count ("used by N products"); rename a value → propagates to variant display names.
6. All 5 mock states; permission `inventory.attribute.manage` for create/edit/delete, view with `inventory.item.view` (useCan).
7. i18n: add the keys from inventory.frontend.md §6 to ar/inventory.json + en/inventory.json (AR default, EN mirror). No hard-coded strings.
Acceptance: Attributes tab hidden when the flag is off; value-in-use cannot be deleted; rename propagates; fully RTL; all strings via i18n.
```

---

## PROMPT 3 — Item Editor + has_variants toggle + Variants section + Matrix grid

```
v1 has NO tabbed item detail page — items are created via QuickAddModal only. Introduce an Item Editor surface and add Variants there (inventory.frontend.md §3, reading "Tab N" as "section").
1. New route /inventory/items/:id in src/App.tsx → an Item Editor page (src/features/inventory/items/ItemEditorPage.tsx) OR a DrawerShell editor, following existing patterns. Opened from an Items-list row action ("edit"). QuickAddModal stays the fast-create path.
2. In the editor Basic section + in QuickAddModal: add a toggle `has_variants`, rendered ONLY when isFlagEnabled("inventory.variants") and item_type=stocked. Turning it on: hide the single barcode field + single sale_price (note "prices managed at variant level"), keep name/category/base_uom/tax_type/image/base eta_code on the parent as inherited defaults, and reveal the Variants section (in QuickAddModal, route the user into the editor to build the matrix).
3. Variants section = (a) Attribute picker: multi-select from /attributes (1–3) + per-attribute value chips + inline "new value" (writes to library, confirm); soft warning above 3 attributes. (b) Matrix grid:
   - auto-generate the cartesian of selected values; group by first attribute when 3 chosen.
   - columns/row: include (checkbox default on) · combo (read-only "أحمر · L") · variant_code (auto PARENT-RED-L, editable, unique-checked) · barcode (auto/tag) · sale_price · reorder_level · per-warehouse opening_qty + opening_cost (collapsible) · status.
   - bulk row: set price for all / generate all barcodes / apply reorder to all / select-deselect all.
   - exclusion: unchecking include drops the combo (no SKU); remember excluded; re-check re-adds.
   - edit mode: pre-fill existing variants; adding a value expands the grid; removing a value whose variant has movements is BLOCKED (tooltip cant_remove_value) — offer "suspend variant".
   - validation: each included row unique code; opening entries create `opening` movements per variant on save (never editable balances); ≥1 included variant to save.
   - guard: projected combos > 200 → block generate (combo_explosion). Perf: virtualize grid above 40 combos.
4. Ledger view (in editor): add a variant selector (single or "all" merged), read-only, per-variant then total in the header.
5. Permissions: toggle + Variants section + matrix require `inventory.item.variants`; per-variant opening requires `inventory.item.opening`.
Acceptance (spec §8): toggle switches to product mode, simple items unchanged; matrix auto-generates the cartesian, excluded combos create no SKU; each variant is an independent SKU with own code/barcode/price/balance/ledger; opening balances create per-variant `opening` movements (never a direct balance edit); removing a movement-bearing value is blocked (suspend offered); combo_explosion blocks >200; too_many_attrs warns above 3.
```

---

## PROMPT 4 — Items list: product-parent rows (ItemsListPage.tsx)

```
Update src/features/inventory/items/ItemsListPage.tsx + useItems.ts per inventory.frontend.md §2.
1. Hybrid row model: a row is a simple item OR a product parent; variant SKUs are NOT top-level rows.
2. Product-parent row: name = parent; code = parent code + a "N variants" Badge; balance column = scope-respecting rollup (Σ variants) with tooltip rollup_hint; sale_price column = price range ("من X إلى Y ج.م") when variant prices differ, else single; status pill = parent; if ANY variant is low-stock, add a low-stock pill; row expander (chevron at logical start) expands inline to variant sub-rows (combo · code · balance · price · status), virtualized + lazy per parent.
3. Filters: add Attribute multi-select (matches products with a variant having that value) + has_variants filter (all/simple/product).
4. Search: also match variant code + barcode; a variant hit scrolls to + expands its parent, highlighting the sub-row.
5. Bulk actions on a product apply to all variants; deletion blocked if ANY variant has movements. Export: flatten one row per variant.
Acceptance: product shows as one row with variants badge + rollup + price range; searching a variant barcode expands its parent; export = one row/variant; simple-item behavior unchanged; RTL; i18n.
```

---

## PROMPT 5 — Variant quick-edit drawer

```
Build a variant quick-edit DrawerShell (inventory.frontend.md §3.6), opened from a variant sub-row action or a matrix row "edit".
Fields: variant image (override), barcode(s), price per price-list, reorder_level, eta_code (override), status. Show inherited-from-parent values as muted placeholders with an "override" affordance (i18n key `inventory.variants.inherited`); saving persists only overridden fields (null = inherit). States: loading (save) · error (toast) · offline (local, sync chip). Permission `inventory.item.variants` to edit, else read-only.
Acceptance: inherited values shown as placeholders; only overrides persist; offline edits show a sync chip; RTL; i18n.
```

---

## PROMPT 6 — Final verification

```
Verify DD-1 against inventory.frontend.md §8 (10 criteria): for each, PASS/FAIL + the file/behavior satisfying it. Then:
- npm run typecheck + lint; fix DD-1 regressions.
- Confirm all 5 mock states reachable for every new screen.
- Confirm no hard-coded strings (inventory namespace), tabular-nums on numbers, logical properties (RTL).
- Confirm isFlagEnabled("inventory.variants") = false fully hides the feature (Attributes tab, has_variants toggle, Variants section) with simple items unaffected.
Report a short checklist.
```

---

*End of DD-1 Variants Claude Code prompts (real repo paths).*
