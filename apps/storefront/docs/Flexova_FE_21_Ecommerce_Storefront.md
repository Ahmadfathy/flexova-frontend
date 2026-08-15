# Flexova — FE_21 E-commerce · Storefront (build-ready)

> **Phase 5 — Sector pattern (Brief 12), Storefront half.** The public online store — a **Next.js app inside the monorepo** (`apps/storefront`), not inside the ERP shell. The admin back-office is `apps/erp` (doc: `Flexova_FE_21_Ecommerce_Admin.md`). Page by page: rendering strategy, theme architecture, fields, states, SEO, integration with the ERP.
> Version: 1.0 — August 2026 · Build no. **FE_21 (Storefront)**
> **Repo:** monorepo workspace `apps/storefront` (pnpm workspaces + Turborepo). Shares `packages/shared` (types + design tokens) with `apps/erp`. Talks to the ERP via a BFF (server-to-server API), never direct DB.
> **Shared with ERP:** design tokens + types via `packages/shared` (same CSS-variable names) · ERP API contracts (stock/price/customer/order/invoice). **Not shared:** shell, components, layout — the storefront has its own presentation entirely.
> **Golden rules:** (1) **ERP is the absolute source of truth** — the storefront reads stock/price and reserves/creates orders, it never owns product/stock data. (2) **The theme is pure presentation** — all business logic lives in Shared Core; a theme changes look/structure, never logic. (3) **The online order is a bridge** — its own lifecycle, becomes an ERP invoice+ETA on confirm. (4) **No overselling** — stock reservation with TTL is the hard guard.

---

## 0) Scope (recap)

**In v1:** full storefront (home/catalog/product/cart/checkout/order-tracking/account) on the theme architecture (1–2 launch themes) · guest checkout + optional signup · stock reservation (anti-oversell) · payment (Paymob/Fawry/COD) via abstraction · affiliate attribution (link/cookie) · SEO (SSR, JSON-LD, clean slugs). **Out (v2):** merchant theme customization · advanced shipping · affiliate self-service · digital products · multi-currency · advanced coupons · reviews/wishlist.

---

## 1) Stack & architecture (decided)

- **Next.js App Router**, RSC default. **Rendering per data type:** static/ISR for product & catalog shells; dynamic islands for live stock/price; client + Server Actions (no-store) for cart/checkout/account.
- **Self-hosted / Docker:** reverse proxy (Nginx/Traefik) + N × Next.js (`output:'standalone'`) + **Redis shared cache handler (mandatory)** + ERP API. In-memory caching disabled; **tag-based invalidation via Redis** (`refreshTags()` syncs from Redis so a single webhook updates all instances).
- **BFF:** RSC/Server Actions call the ERP API server-to-server (secrets hidden). ERP is source of truth.
- **AR/RTL:** `lang="ar" dir="rtl"` in the original SSR HTML (not client-side).
- **Images:** `next/image` + CDN/reverse-proxy optimization.
- **Order idempotency:** Server Actions with idempotency keys (no duplicate orders on double-submit).

---

## 2) Theme Architecture (the star) — two strict layers

**Layer 1 — Shared Core (theme never touches):**
- Business logic: cart · checkout · order lifecycle · stock reservation · payment · affiliate.
- Design-token contract: unified CSS-variable names (`--brand`, `--surface`, `--ink`, spacing/radius scales) — the `@apply` layer (look only).
- Data contracts: the props/hooks every theme consumes (`useCatalog`, `useProduct`, `useCart`, `useCheckout`, `useAffiliate`).

**Layer 2 — Theme Package (a full package; adding one = a new folder):**
```
themes/<theme-name>/
├── theme.config.ts     ← register theme + metadata
├── tokens.css          ← token values (look — @apply/vars)
├── layouts/            ← page structure (fully different layout)
└── components/         ← the theme's own presentation components
```
- **Switch:** one `activeTheme` (per-tenant config) → loads the theme's token set + component set (via **dynamic import**, so only the active theme's bundle ships).
- **Resolved server-side** from tenant config → no FOUC; appears in the SSR HTML directly.
- **Contract:** any theme MUST consume Shared-Core logic + data contracts — it changes presentation (layout/components/tokens) only, never logic. This is what makes "total visual change" safe.
- **Adding a theme:** a new folder, zero edits to old themes or core.

---

## 3) Entities the storefront reads/creates

| Entity | Source | Storefront use |
|---|---|---|
| OnlineProduct | ERP (admin-published) | title/desc/images/SEO — static/ISR |
| StoreCategory | ERP | catalog nav — static/ISR |
| InventoryItem (stock) | ERP (READ, live) | availability via reservation |
| Price | ERP (READ, live) | final price (online may override) |
| Cart | storefront (client/session) | temp; carries reservations at checkout |
| StockReservation | storefront→ERP (TTL) | anti-oversell |
| OnlineOrder | storefront (bridge) | lifecycle → ERP invoice+ETA on confirm |
| Customer | ERP/CRM | guest→implicit CRM customer (phone dedupe) |
| Affiliate/Link | ERP | attribution (cookie/code) |

---

## 4) Page — Product (PDP) — heart of shopping

### 4.1 Static / dynamic split (screen's governing rule)
| Element | Type | Source |
|---|---|---|
| title · description · images/gallery | **static (ISR)** | OnlineProduct |
| SEO meta · slug · og · JSON-LD | **static (ISR)** | OnlineProduct |
| breadcrumb · category | static (ISR) | StoreCategory |
| **available stock / availability** | **dynamic (live)** | ERP |
| **final price / offer** | **dynamic (live)** | ERP |
| variant selector | interactive (client) | OnlineProduct + ERP |

### 4.2 Layout (structure — theme decides the look)
Gallery (static, instant) · info block: title (static) → **price (dynamic island)** → **availability badge (dynamic island)** → variant selector → **Add to cart** · description/details (static) · related (static/ISR).

### 4.3 Add-to-cart states
in-stock → active (adds to cart; **no reservation** — reservation at checkout) · **out-of-stock (dynamic)** → disabled + "غير متوفّر حالياً" + optional "أبلغني" · variant required & unselected → disabled + hint.

### 4.4 Two-layer states (storefront-specific)
*static shell:* HIT served instantly · **404 (unpublished/deleted)** → themed "not found" + suggestions + catalog link (true 404 for SEO, not soft-404).
*dynamic islands:* loading → small skeleton on price/badge (page doesn't wait) · **ERP read fail** → graceful "تأكّد من التوفّر" instead of broken number; button neutral until confirmed (never sells on missing data) · offline → static page shows; interactive buttons wait for connection.

### 4.5 SEO (screen requirement)
Native SSR `lang="ar" dir="rtl"` · meta/og/twitter · **JSON-LD Product schema** · canonical · clean AR/EN slug · responsive `next/image`.

### 4.6 Acceptance
Static shell instant + SEO-complete; live price/availability injected; never sells on missing/failed data; true 404; add-to-cart gated by variant/stock.

---

## 5) Page — Catalog (PLP)

### 5.1 Static/dynamic split
grid (title/image/slug) · filters · breadcrumb · SEO = **static (ISR)**; **price + availability badge per card = dynamic (live)**.

### 5.2 Layout
filter bar (side/top per theme): category · price range · attributes · sort. Product-card grid (ProductCard = pure theme component). **Pagination with indexable `?page=` links** (better SEO than infinite scroll).

### 5.3 Two-layer states
*static:* HIT instant · empty ("لا منتجات في هذا القسم بعد") · no-results (after filter → "امسح الفلاتر", distinct from empty).
*dynamic:* per-card skeleton on price/badge · ERP fail → card without broken price ("اعرض التفاصيل").

### 5.4 SEO
Each category indexable · clean pagination · unique meta per category · JSON-LD ItemList.

### 5.5 Acceptance
Grid instant + indexable; live price/availability per card; filter/sort on static layer where possible; empty≠no-results.

---

## 6) Page — Cart

Client-only (not SEO), **no reservation** — live re-check only.
Items (image/title/variant/qty ±/price×qty/remove) · **live re-check on open** (price may change → "السعر اتحدّث"; item out → alert + adjust) · summary (subtotal; shipping in checkout) · "إتمام الشراء" · basic coupon (v1). States: empty ("سلتك فاضية" + "تصفّح المنتجات") · out-of-stock-while-in-cart (banner + blocked until resolved) · price-changed (non-blocking notice) · offline (saved locally; re-check waits). Integration: `useCart` (Shared Core); re-check ← ERP; no reservation here.

## 7) Page — Checkout — highest integrity risk

**Start checkout → StockReservation immediately** (from ERP availability, TTL, visible countdown "محجوز لك 10:00"). If availability < requested → instant adjust + alert.
**Steps (guest-first):** (1) delivery: phone✱ + name✱ + address✱ — no signup; phone in CRM → linked (optional login suggested); else implicit CRM customer. (2) shipping method/zone + cost (v1 basic). (3) payment: Paymob/Fawry/**COD**. (4) review → confirm.
**Confirm → payment:** card/wallet → gateway → **webhook confirms → `paid`** → reservation committed → **invoice+ETA generated** → "تم الطلب" + receipt. **COD** → confirm → `processing` → invoice generated → collect on delivery.
**Critical states:** TTL expiry mid-checkout → "انتهى وقت الحجز" + re-check + re-reserve (keep entered data) · payment fail → clear message + reservation lives out its TTL + retry (idempotent) · webhook fail/late → order `pending_payment` + no invoice before payment confirmed · **item out at confirm (race)** → block + alert + adjust (reservation is the primary guard) · **idempotency** → double-submit = one order · offline → block payment start + keep entered data.
Integration: `useCheckout` (Shared Core); reservation/invoice/ETA/AR ← ERP; customer ← CRM (implicit); payment ← abstraction; attribution ← affiliate cookie.

## 8) Page — Order tracking (public, guest-friendly)
Access by link + order code (guest, no account) · status timeline (confirmed → processing → shipped → delivered) · tracking no./carrier if available · order summary. States: invalid code ("لم نجد هذا الطلب") · offline retry. Reads OnlineOrder status; may link carrier tracking.

## 9) Page — Account (optional) + Home
**Account:** my orders · saved addresses · data. **Optional** (guest needs none). Shopper = CRM customer. **Home:** static/ISR; display sections (featured/categories/banners) = pure theme components; SEO for the root.

---

## 10) Cross-cutting: integration points with the ERP

| Moment | Integration | Rule |
|---|---|---|
| PDP/PLP render | live stock+price read | ERP source of truth |
| checkout start | StockReservation (TTL) | anti-oversell |
| paid (webhook) / COD confirm | invoice + ETA generated | online B2C = e-receipt |
| payment | posted to Accounting | AR/collection |
| confirmed + attributed order | affiliate commission | confirmed only |
| product changed in admin | `revalidateTag` via Redis | all instances update |
| cancel / TTL expiry | reservation released | automatic |

---

## 11) Acceptance criteria (Storefront)

1. Theme architecture: two layers; adding a theme = a new folder, zero core/old-theme edits; switch is server-side (no FOUC); business logic untouched by themes.
2. PDP/PLP: static shell instant + SEO-complete; live price/availability as dynamic islands; never sells on missing/failed data; true 404.
3. Checkout: reservation with visible TTL; guest-first with implicit CRM customer; confirm generates invoice+ETA; idempotent; race-safe via reservation.
4. ERP is source of truth everywhere; storefront owns no stock/product data.
5. Self-hosted stack: Redis shared cache + tag invalidation so one webhook updates all instances; standalone Docker output.
6. AR/RTL native in SSR; `next/image`; clean slugs; JSON-LD.
7. Payment via abstraction incl. COD; affiliate attribution via cookie/code on confirmed orders.
