# Flexova — FE_21 E-commerce · Admin Back-office (build-ready)

> **Phase 5 — Sector pattern (Brief 12), Admin half.** The back-office for the online store, **inside the shell** like every other sector. The public Storefront is a separate repo/doc (`Flexova_FE_21_Ecommerce_Storefront.md`). Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — August 2026 · Build no. **FE_21 (Admin)**
> **Source of truth (do not redefine):** `Flexova_FE_00_Foundation` (tokens/shell/i18n/states) · `Flexova_FE_01_Inventory` (stock — source of truth, READ) · `Flexova_FE_02_Sales_ETA` (invoice + ETA on order confirm) · `Flexova_FE_04_Accounting` (AR/payments — READ) · `Flexova_FE_05_CRM` (customer = shopper, dedupe, WhatsApp).
> **Golden rules (carried):** stock/price/AR are READ from the ERP (ERP is the single source of truth); invoice/ETA routing unchanged (online B2C → e-receipt); a confirmed/accepted invoice is not edited (correct via note). **New golden rule:** the OnlineProduct is a *display layer* over an inventory item — it never duplicates stock.

---

## 0) Module scope (recap)

**In v1 (Admin):** Online products (display layer over inventory) · **catalog modes: manual / bulk-import / auto-publish rules / mirror (owner picks via `catalog_mode`)** · store categories · orders management (full lifecycle) · affiliates (basic: link + attribution + commission + payout) · payments config (Paymob/Fawry/COD via abstraction) · basic shipping (zones + manual tracking) · StoreConfig (active theme + payment gateway + `catalog_mode` + store data). Reads stock/price/AR/customer/invoice from the ERP.

**Out (v2):** merchant-side theme customization (v1 = developers add themes) · automated shipping + COD auto-settlement (closer to Brief 10) · affiliate MLM + self-service portal · digital products/subscriptions · multi-currency · advanced coupons · product reviews/wishlist.

Sector module under shell Sector group with `moduleFlag:"ecommerce"`; every consumer is feature-flag-aware. Data via `lib/mock/client.ts` reading `ecommerce.fixtures.json`.

---

## 1) Routes & IA

Mounts under shell nav Sector group `nav.ecommerce`. Secondary Tabs below `PageHeader`.

```
/ecommerce                      → redirect → /ecommerce/orders
/ecommerce/products             → Online products list          [§3]
/ecommerce/products/new         → Publish product (link to inventory item) [§3]
/ecommerce/products/:id         → Edit product (display + SEO)   [§3]
/ecommerce/categories           → Store categories tree         [§4]
/ecommerce/orders               → Orders list                   [§5]
/ecommerce/orders/:id           → Order detail (lifecycle)      [§5]
/ecommerce/affiliates           → Affiliates list               [§6]
/ecommerce/affiliates/:id       → Affiliate detail + payout     [§6]
/ecommerce/settings/payments    → Payments & shipping config    [§7]
/ecommerce/settings/store       → StoreConfig (theme + data)    [§8]
```

**Secondary tabs:** Orders · Products · Categories · Affiliates · Settings.
**i18n namespace:** `ecommerce`. AR default, EN mirror.

---

## 2) Entities (display model — Admin view)

| Entity | Owner | Notes |
|---|---|---|
| **OnlineProduct** | Storefront (Admin edits) | display layer over `inventory_item`: title, description(rich), images[], SEO{meta,slug,og}, store_category, online_price? (overrides ERP), publish_status. **Never duplicates stock.** |
| **StoreCategory** | Storefront | marketing tree, independent of internal inventory categories. |
| **OnlineOrder** | Storefront (bridge) | full lifecycle; links customer + invoice_id + shipment + affiliate_id. |
| **Affiliate** | Storefront | commission_pct, status, balance. |
| **AffiliateLink** | Storefront | unique code/link, clicks, attribution. |
| **StoreConfig** | Storefront | active_theme, `catalog_mode`, payment_gateway, shipping policy, store data, default lang/RTL. |
| **InventoryItem** | **READ (FE_01)** | stock/availability — source of truth. |
| **Price** | **READ (pricing)** | base price (online may override). |
| **Customer** | **READ (CRM)** | shopper = CRM customer; dedupe by phone. |
| **Invoice + ETA** | **READ (FE_02)** | generated on order confirm. |
| **AR/Payment** | **READ (FE_04)** | payment posted here. |

---

## 3) Screen — Online products (`/ecommerce/products*`)

### 3.1 Components
`PageHeader` + `DataTable`: thumbnail+title · category · **price (ERP + online override)** · **availability (ERP)** · publish_status (published/draft/hidden) · actions. Filter by category/status, search, export. Publish/edit form.

### 3.2 Publish/edit form
**Link to inventory (backbone):** search + select existing inventory item (stock/base price shown read-only). **Display layer (new):** marketing title · rich description · images/gallery upload · SEO (meta title/description · slug AR/EN · og-image) · store_category · optional online_price/offer · display variants. Publish status. On save → **`revalidateTag`** propagates to all storefront instances.

### 3.3 Five states
skeleton · empty ("انشر أول منتج") · error · no-results · offline. **Special:** inventory item deleted/suspended in ERP → product shows "الصنف غير متاح" warning + auto-hidden from storefront (graceful).

### 3.4 Responsive / Permissions
Standard shell responsive. `ecommerce.products.manage`.

### 3.5 AR / EN
منتج أونلاين/Online product · منشور/Published · مسودة/Draft · مخفي/Hidden · سعر أونلاين/Online price · رابط ثابت/Slug.

### 3.6 Acceptance
Product links to inventory (never duplicates stock); save triggers revalidation; suspended ERP item auto-hides; SEO fields persist.

### 3.7 Catalog modes — filling the store from inventory (`catalog_mode`)

How inventory items become online products is controlled by one setting, **`catalog_mode`** (in StoreConfig §8), chosen by the store owner. All four modes are fully built; the owner picks one. This is a spectrum from fully manual (opt-in) to fully mirrored (opt-out) — one switch prevents conflicting modes running at once.

**Mode 1 — `manual` (default):** publish one item at a time via §3.2. Full control, best for curated catalogs.

**Mode 2 — `bulk`:** a **"استيراد من المخزون" (Import from inventory)** action on the products list opens a modal listing inventory items **not yet published**, with search + filter by inventory category + **"اختر الكل"**. Selecting items → **"انشر المحدّد"** creates an OnlineProduct per item **with defaults from inventory** (title = item name, price = ERP price, no images/SEO initially — enrich later per item). Solves the "500 items, publish once" problem.
- States: empty ("كل الأصناف منشورة بالفعل") · no-results (after filter) · progress indicator for large batches · partial-failure report (which items failed + why).

**Mode 3 — `auto_rule`:** rules like **"any new inventory item in category X → auto-publish online"**. Rule builder: inventory category (or tag) → auto-publish on/off + default store_category mapping. New qualifying items appear online automatically (with inventory defaults). Good for merchants whose whole inventory is for online sale.
- Rule management sub-screen: list rules · add/edit/disable · dry-run preview ("سينشر X صنف").

**Mode 4 — `mirror`:** the store is a **live mirror of inventory** — every sellable inventory item is shown by default; the owner **hides exceptions** instead of publishing the rule. Inverts the model to opt-out. Best when the store is the primary sales channel.
- Exceptions sub-screen: search inventory · toggle "مخفي أونلاين" per item · bulk hide. Raw materials/samples/non-sellable flags are excluded from mirror by default.

**Cross-mode rules (integrity):**
- Switching mode never deletes data — published products persist; changing to `mirror` just changes the default visibility resolution.
- Display enrichment (images/SEO/description) is always per-item and survives across modes — bulk/auto/mirror only handle *existence/visibility*, never overwrite an item's curated display layer.
- The "OnlineProduct = display layer, never duplicates stock" rule holds in **all** modes — mirror/auto still read stock/price live from the ERP; they only auto-create the display shell.
- Availability shown = ERP stock − reservations, in every mode.

**Permissions:** `ecommerce.products.manage` (bulk/exceptions) · `ecommerce.catalog.configure` (change `catalog_mode` + rules — governance-sensitive, audit-logged).

**Acceptance (§3.7):** each mode works and is switchable via `catalog_mode`; bulk publish creates display shells with inventory defaults; auto-rule publishes qualifying new items; mirror shows all sellable items with per-item hide; switching modes is data-safe and never overwrites curated display fields; stock/price always live-read from ERP.

---

## 4) Screen — Store categories (`/ecommerce/categories`)

Marketing category tree (independent of inventory categories). Add/edit/reorder (hierarchy) · assign products · SEO per category. States: empty ("أضف أول تصنيف") · standard. Permission: `ecommerce.products.manage`.

---

## 5) Screen — Orders (`/ecommerce/orders*`) — daily operations core

### 5.1 List
`DataTable`: order code · customer (name/phone) · total · **StatusPill** (pending_payment · paid · processing · shipped · delivered · returned · cancelled) · payment method (card/COD) · date · actions. Filter by status/payment/date; search by code/phone.

### 5.2 Order detail
Item summary + customer + address + payment + attribution (affiliate if any). **Contextual action by status:** paid → "بدء التجهيز" · processing → "شُحن" (+ carrier/tracking no.) · shipped → "تم التسليم" · any → "إرجاع/إلغاء" (permissioned). **ERP links (READ):** generated invoice + ETA status + collection/AR status. Return → **credit note in ERP** (carried rule).

### 5.3 Five states
empty · skeleton · error · offline (status update offline-first + sync). **Special:** `pending_payment` stuck long (webhook late) → flagged + "إعادة فحص الدفع".

### 5.4 Permissions
`ecommerce.orders.view` · `ecommerce.orders.manage` (status/fulfillment) · `ecommerce.orders.refund` (return/cancel — SoD-sensitive).

### 5.5 AR / EN
أوردر/Order · بدء التجهيز/Start processing · شُحن/Shipped · تم التسليم/Delivered · إرجاع/Return · رقم التتبّع/Tracking no.

### 5.6 Acceptance
Contextual action tracks status; confirm generates invoice+ETA (READ shown); return posts credit note; offline status update syncs; stuck-payment flagged.

---

## 6) Screen — Affiliates (`/ecommerce/affiliates*`)

### 6.1 List
`DataTable`: affiliate (name/data) · tracking code/link · commission_pct · clicks · attributed orders · **balance due** · status.

### 6.2 Detail + payout
Data + unique link (copy/share) · stats (clicks/conversions/commissions) · attributed-orders log · **balance + payout request**. Payout: admin approves → **payment posted in Accounting**. Add affiliate: data + commission_pct → auto-generate unique link/code.

### 6.3 States / Permissions
empty ("أضف أول مسوّق") · standard. `ecommerce.affiliates.manage`. v1 = admin-side view + manual payout; self-service portal v2.

### 6.4 Acceptance
Commission computed on confirmed orders only; payout posts to Accounting; unique link generated; attribution log accurate.

---

## 7) Screen — Payments & shipping (`/ecommerce/settings/payments`)

**Payments:** enable/configure gateways (Paymob/Fawry/COD) per-tenant · connection status · transaction log (READ from Accounting). Abstraction layer: adding a gateway = adapter, not code change. **Shipping (v1 basic):** zones + cost per zone · carriers as list (field) · manual tracking. v2: automated integration + COD auto-settlement. States: standard + empty per section. Permission: `ecommerce.settings.manage`.

---

## 8) Screen — StoreConfig (`/ecommerce/settings/store`) — theme architecture surface

- **Active theme:** pick from available themes (visual gallery + preview per theme) → sets `activeTheme` → **resolved server-side (no FOUC)**. Theme switch touches **no data/products** — pure presentation. Clear message: switch is instant, safe, does not affect orders/products.
- **Catalog mode (`catalog_mode`):** pick how the store fills from inventory — `manual` / `bulk` / `auto_rule` / `mirror` (see §3.7). Each mode with a one-line explainer; switching is data-safe (never overwrites curated display fields). `auto_rule` reveals the rule builder; `mirror` reveals the exceptions manager. Governance-sensitive (audit-logged) via `ecommerce.catalog.configure`.
- **Store data:** name · logo · contact · social links · default lang (AR/EN) · RTL.
- **Policies:** shipping · returns · privacy (static content pages).

States: standard. Permission: `ecommerce.settings.manage`. `activeTheme` → storefront (server-side).

---

## 9) Module-wide states, RTL, integrations, performance

- **RTL-native, tokens/components from FE_00.**
- **Integrations:** stock/price ← FE_01 (READ); invoice/ETA ← FE_02 (online B2C → e-receipt); AR/payment ← FE_04 (READ); customer ← CRM (dedupe); revalidation → storefront via Redis tags.
- **Offline-first:** order status updates work offline + sync.
- **Performance:** orders + products are hot paths — skeleton-first, lazy tabs.

---

## 10) Permissions (input to FE_08)

| Permission | Grants |
|---|---|
| `ecommerce.products.manage` | products + categories |
| `ecommerce.orders.view` | orders read |
| `ecommerce.orders.manage` | status/fulfillment |
| `ecommerce.orders.refund` | return/cancel (SoD-sensitive) |
| `ecommerce.affiliates.manage` | affiliates + payout |
| `ecommerce.settings.manage` | payments/shipping/store/theme |
| `ecommerce.catalog.configure` | change `catalog_mode` + auto-publish rules + mirror exceptions (governance-sensitive) |

Consistent with carried SoD (refund/payout are governance-sensitive) + immutable audit.

---

## 11) Coverage matrix

| Flow (UX §5, admin family) | Screen | Status |
|---|---|---|
| 9 Publish online product | §3 | ✅ |
| 10 Manage orders | §5 | ✅ |
| 11 Store/theme settings | §8 | ✅ |
| Affiliate manage + payout (7,8) | §6 | ✅ |
| Payments/shipping config | §7 | ✅ |

---

## 12) Module acceptance criteria (Admin)

1. OnlineProduct is a display layer over inventory — never duplicates stock; suspended ERP item auto-hides.
2. **Catalog modes:** manual/bulk/auto_rule/mirror all work and switch via `catalog_mode`; bulk creates shells with inventory defaults; auto-rule publishes qualifying new items; mirror shows all sellable with per-item hide; switching is data-safe (curated display fields preserved); stock/price live-read in every mode.
3. Save/publish triggers storefront revalidation (Redis tag).
4. Orders lifecycle full; confirm generates invoice+ETA (READ shown); return posts credit note.
5. Affiliate commission on confirmed orders only; payout posts to Accounting.
6. Payments via abstraction (adapter per gateway); COD supported.
7. StoreConfig theme switch is server-side, instant, data-safe.
8. All stock/price/AR/customer READ from ERP (single source of truth).
9. Feature-flag-aware; standard five states everywhere; AR+EN.
