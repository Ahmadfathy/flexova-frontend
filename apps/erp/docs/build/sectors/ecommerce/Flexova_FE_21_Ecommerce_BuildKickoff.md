# Flexova — FE_21 E-commerce · Build Kickoff & Prompts (Monorepo)

> **Execution map for building the E-commerce module with Claude Code.** Two halves in one monorepo: `apps/erp` (admin, inside the shell) + `apps/storefront` (public Next.js store). Read before opening Claude Code.
> Version: 1.0 — August 2026 · Build no. **FE_21** · pnpm workspaces + Turborepo · self-hosted Docker + Redis.

---

## 0) Mental model

- Two build specs, both build-ready: `Flexova_FE_21_Ecommerce_Admin.md` (admin, in `apps/erp`) and `Flexova_FE_21_Ecommerce_Storefront.md` (store, in `apps/storefront`). Claude Code implements faithfully.
- **No backend in this phase.** Both halves read fixtures through their mock layers; mock signatures mirror the future ERP API 1:1. The storefront's BFF calls are mocked until the Backend block.
- **The ERP is the source of truth.** The storefront owns no stock/product data — it reads/reserves/creates orders via the (mocked) ERP API.
- **The theme is presentation only.** All business logic lives in Shared Core; a theme changes look/structure, never logic.
- **Monorepo, workspace-added (not rebuilt).** The existing frontend repo (`flexova-frontend`) is converted to a pnpm+Turborepo workspace; the current app moves under `apps/erp` (or stays and is registered as a workspace), and `apps/storefront` is added alongside. The existing code is not otherwise touched.

---

## 1) Target monorepo structure

```
<existing repo → workspace root>
├── apps/
│   ├── erp/                                   ← existing ERP (Core + all sectors)
│   │   ├── src/modules/ecommerce/             ← e-commerce ADMIN (in shell)
│   │   ├── src/lib/mock/fixtures/ecommerce.fixtures.json
│   │   └── docs/build/sectors/ecommerce/
│   │       ├── Flexova_FE_21_Ecommerce_Admin.md
│   │       └── Flexova_FE_21_Ecommerce_BuildKickoff.md   (this file)
│   └── storefront/                            ← NEW Next.js store
│       ├── app/                               ← App Router (RSC)
│       ├── themes/<theme-name>/               ← theme packages (Layer 2)
│       │   ├── theme.config.ts · tokens.css · layouts/ · components/
│       ├── lib/core/                          ← Shared Core (cart/checkout/reservation/affiliate)
│       ├── lib/mock/fixtures/ecommerce-storefront.fixtures.json
│       ├── lib/cache/redis-handler.ts         ← shared cache handler (mandatory)
│       ├── docs/
│       │   └── Flexova_FE_21_Ecommerce_Storefront.md
│       ├── Dockerfile                          ← output:'standalone'
│       └── next.config.ts                      ← standalone + custom cache handler
├── packages/
│   └── shared/                                ← types + design tokens shared by both apps
├── docker-compose.yml                         ← reverse proxy + N×storefront + Redis + erp-api
├── turbo.json                                 ← Turborepo pipeline
└── package.json                               ← pnpm workspaces root
```

> Final file placement is in **Phase 0 (§2)** below — don't place files until Phase A has created these folders.

---

## 2) Phase 0 — File placement (do this before anything)

The `apps/erp` and `apps/storefront` folders don't exist yet — **Phase A creates them**. So there's a chicken-and-egg: the docs need a home, but the homes aren't built. Resolve it in this order:

**Step 1 — drop the 6 files in a temp staging folder at the repo root** (they just need to be readable by Claude Code for Phase A):
```
<repo root>/_fe21_staging/
├── Flexova_FE_21_Ecommerce_BuildKickoff.md          (this file)
├── Flexova_FE_21_Ecommerce_Admin.md
├── ecommerce.fixtures.json
├── Flexova_FE_21_Ecommerce_Storefront.md
├── ecommerce-storefront.fixtures.json
└── Flexova_FE_21_Ecommerce_Backend.md
```

**Step 2 — run Phase A** (§3) — it builds `apps/erp`, `apps/storefront`, `packages/shared`, Docker, Redis.

**Step 3 — move each file to its final home** (after the folders exist):

| File | Final path |
|---|---|
| `Flexova_FE_21_Ecommerce_Admin.md` | `apps/erp/docs/build/sectors/ecommerce/Flexova_FE_21_Ecommerce_Admin.md` |
| `ecommerce.fixtures.json` | `apps/erp/src/lib/mock/fixtures/ecommerce.fixtures.json` |
| `Flexova_FE_21_Ecommerce_BuildKickoff.md` | `apps/erp/docs/build/sectors/ecommerce/Flexova_FE_21_Ecommerce_BuildKickoff.md` |
| `Flexova_FE_21_Ecommerce_Storefront.md` | `apps/storefront/docs/Flexova_FE_21_Ecommerce_Storefront.md` |
| `ecommerce-storefront.fixtures.json` | `apps/storefront/lib/mock/fixtures/ecommerce-storefront.fixtures.json` |
| `Flexova_FE_21_Ecommerce_Backend.md` | `apps/erp/docs/reference/Flexova_FE_21_Ecommerce_Backend.md` |

**Step 4 — delete `_fe21_staging/`**, then proceed to Session Zero (§4).

> You can hand Claude Code Step 3 too: after Phase A, tell it "move the files from `_fe21_staging/` to their final paths per Phase 0 Step 3, then delete the staging folder."

---

## 3) Phase A — Monorepo setup (do this first, once)

Open Claude Code in the repo root and paste this **before any feature work**:

> Convert this repo (`flexova-frontend`, a frontend-only repo) into a **pnpm + Turborepo monorepo** without disturbing the existing app. Steps: (1) add a root `package.json` with pnpm `workspaces: ["apps/*","packages/*"]` and a `turbo.json` pipeline (build/dev/lint). (2) Move the existing app under `apps/erp` (or register it in place as the `admin` workspace) — do not change its source, only its location/workspace wiring; confirm it still builds and runs. (3) Create `packages/shared` for types + design tokens, and expose the existing FE_00 design tokens there so both apps consume the same CSS-variable contract. (4) Scaffold `apps/storefront` as a **Next.js App Router** app (TypeScript, RTL-ready) with `output:'standalone'` in `next.config.ts`. (5) Add a `docker-compose.yml` with: reverse proxy (Traefik or Nginx), the storefront service (scalable to N), **Redis**, and a placeholder for the ERP **backend** API (a separate service/repo — this monorepo is frontend-only). (6) In the storefront, wire a **custom Next.js cache handler backed by Redis** and disable in-memory caching (so ISR/data cache is shared across instances and tag invalidation propagates). **Do not build any store features yet** — just stand up the monorepo, confirm both apps boot, and report the resulting structure back to me.

**Phase A gate (all true before Phase B):**
- Root pnpm workspaces + Turborepo pipeline in place; `pnpm install` + `turbo build` succeed.
- `apps/erp` builds and runs exactly as before (no source changes).
- `packages/shared` exposes the FE_00 token contract to both apps.
- `apps/storefront` boots (Next.js standalone) with RTL scaffolding.
- `docker-compose.yml` includes reverse proxy + storefront + **Redis** + erp-api placeholder.
- Redis cache handler wired; in-memory caching disabled.

---

## 4) Phase B — Session Zero (per app)

### Session Zero — Admin (run in `apps/erp` context)
> In `apps/erp`, I'm adding the **e-commerce admin** sector module (FE_21, admin half). Read `docs/build/sectors/ecommerce/Flexova_FE_21_Ecommerce_BuildKickoff.md` then the spec `docs/build/sectors/ecommerce/Flexova_FE_21_Ecommerce_Admin.md` and fixtures `src/lib/mock/fixtures/ecommerce.fixtures.json`. Confirm the FE_00 shell/tokens, the existing mock layer `src/lib/mock/client.ts`, and the ERP entities the admin reads (inventory FE_01, sales+ETA FE_02, accounting FE_04, CRM FE_05). Confirm the Sector-group `moduleFlag:"ecommerce"` registration (no shell edits). **Do not write code yet** — verify and list the admin build prompts (§6) in order, then wait for Admin Prompt 1.

### Session Zero — Storefront (run in `apps/storefront` context)
> In `apps/storefront`, I'm building the **public store** (FE_21, storefront half). Read `docs/Flexova_FE_21_Ecommerce_Storefront.md` and `lib/mock/fixtures/ecommerce-storefront.fixtures.json`. Confirm: the design-token contract from `packages/shared`, the Redis cache handler + standalone config from Phase A, and the mock ERP client the BFF will use. Confirm the theme-architecture folders (`themes/<name>/` with theme.config/tokens/layouts/components) and the Shared Core location (`lib/core`). **Do not write pages yet** — verify and list the storefront build prompts (§6) in order, then wait for Storefront Prompt 1.

---

## 5) Admin build prompts (`apps/erp`, prompt-by-prompt)

> `Flexova_FE_21_Ecommerce_Admin.md` = shorthand for the full path above. **All §N refs in A1–A5 point inside the Admin spec file**, not this kickoff.

**A1 — Scaffold + Orders (daily operations core):** Register the sector under the shell Sector group (`moduleFlag:"ecommerce"`, no shell edits). Build the route tree (§1) and implement **§5 Orders** (list + detail) exactly: status-driven contextual action (start-processing/shipped/delivered/return-cancel), ERP links (invoice/ETA/AR as READ), five states + offline status update, AR+EN. Gate refund/cancel behind `ecommerce.orders.refund`. Confirm §5.6.

**A2 — Online products + categories:** Implement §3 + §4: products list, publish/edit form (link to inventory item — never duplicate stock; display layer + SEO fields), store categories tree. On save trigger a revalidation hook (mock until backend). Handle the suspended-ERP-item auto-hide. Confirm §3.6.

**A2.5 — Catalog modes (bulk / auto-rule / mirror):** Implement §3.7: the four `catalog_mode` options driven by StoreConfig. Build (1) **bulk import** modal (list unpublished inventory items + search/filter/select-all → create OnlineProduct shells with inventory defaults, partial-failure report), (2) **auto-publish rules** sub-screen (rule builder + dry-run preview), (3) **mirror** exceptions sub-screen (show-all-sellable + per-item hide). All modes must preserve curated display fields on switch and live-read stock/price. Gate mode/rule changes behind `ecommerce.catalog.configure`. Confirm §3.7 acceptance.

**A3 — Affiliates + payout:** Implement §6: affiliates list + detail, unique link generation, commission (confirmed orders only), balance + admin payout (posts to Accounting, mocked). Confirm §6.4.

**A4 — Settings (payments/shipping + StoreConfig/theme):** Implement §7 + §8: payment gateway config (Paymob/Fawry/COD via abstraction), basic shipping zones, StoreConfig with **active-theme picker** (writes `activeTheme`; server-side resolution note) + **`catalog_mode` picker** (manual/bulk/auto_rule/mirror — reveals rule builder / exceptions manager per mode). Confirm §7 + §8 acceptance.

**A5 — Permissions:** Register the §10 permission keys into FE_08 (including `ecommerce.catalog.configure`); verify the role behavior (refund/payout/catalog-configure SoD-sensitive). Confirm §12.

---

## 6) Storefront build prompts (`apps/storefront`, prompt-by-prompt)

> `Storefront.md` = shorthand for `docs/Flexova_FE_21_Ecommerce_Storefront.md`. **All §N refs in S1–S6 point inside the Storefront spec file**, not this kickoff.

**S1 — Theme architecture (the foundation, build first):** Implement §2 exactly: two layers — Shared Core (`lib/core`: cart/checkout/reservation/affiliate logic + data contracts/hooks) and Theme Packages (`themes/<name>/` with theme.config/tokens.css/layouts/components). Wire `activeTheme` resolved **server-side** from config (no FOUC) with **dynamic import** of the active theme's bundle. Scaffold two themes (`aurora`, `noir`) with **fully different layouts** consuming the same Shared-Core contracts + `packages/shared` tokens. Prove: switching `activeTheme` changes look+structure with zero Shared-Core edits. Confirm §11.1.

**S2 — Catalog (PLP) + Home:** Implement §5 + §9 home: ISR static grid + dynamic per-card price/availability islands; filters/sort; indexable pagination; empty≠no-results; SEO (unique meta, JSON-LD ItemList). Confirm §5.5.

**S3 — Product (PDP):** Implement §4: static/ISR shell (title/desc/gallery/SEO/JSON-LD) + dynamic islands (live price/availability); variant selector; add-to-cart gating (stock/variant); true 404; graceful ERP-fail fallback (never sell on missing data). Confirm §4.6.

**S4 — Cart:** Implement §6: client cart, live re-check on open (price-changed notice, out-of-stock block), no reservation here, empty state. Confirm cart acceptance.

**S5 — Checkout (highest integrity):** Implement §7: start→StockReservation with visible TTL; guest-first delivery (implicit CRM customer via phone; optional login); shipping; payment (Paymob/Fawry/COD); confirm→(webhook `paid` | COD `processing`)→invoice+ETA (mocked). Handle every critical state: TTL expiry mid-checkout, payment fail, webhook late, race-out-at-confirm, idempotency, offline. Confirm §7 + §11.3.

**S6 — Order tracking + Account:** Implement §8 + §9: public guest tracking by code (timeline, invalid-code state) + optional account (orders/addresses). Confirm acceptance.

---

## 7) Acceptance gate (verify before commit)

- **Monorepo:** both apps build via Turborepo; ERP unchanged; `packages/shared` tokens consumed by both.
- **Theme architecture:** adding a theme = a new folder, zero core/old-theme edits; switch server-side (no FOUC); business logic untouched.
- **PDP/PLP:** static shell instant + SEO-complete; live price/availability islands; never sells on missing/failed data; true 404.
- **Checkout:** reservation with visible TTL; guest→implicit CRM; confirm→invoice+ETA; idempotent; race-safe.
- **Admin:** OnlineProduct never duplicates stock; suspended ERP item auto-hides; orders lifecycle full; affiliate commission on confirmed only; StoreConfig theme switch data-safe.
- **Self-hosted:** Redis shared cache + tag invalidation so one webhook updates all storefront instances; standalone Docker output.
- **ERP = source of truth** everywhere; stock/price/AR/customer READ.

---

## 8) Cross-app integrations (should "just connect")

- **Storefront ↔ ERP:** BFF server-to-server (mocked now); stock/price live-read; reservation; order→invoice+ETA; AR post.
- **Admin ↔ ERP:** inventory/price/AR/customer/invoice READ (in-process, same app).
- **Revalidation:** admin product change → tag invalidation → Redis → all storefront instances.
- **Shared:** `packages/shared` tokens + types across both apps.

---

## 9) Definition of Done (DoD) — FE_21

1. Monorepo (pnpm+Turborepo) stands up; ERP builds unchanged; storefront boots standalone; `packages/shared` live.
2. Docker compose: reverse proxy + N×storefront + Redis + erp-api placeholder; Redis cache handler active; in-memory disabled.
3. Theme architecture: two layers; two themes with different layouts; switch server-side, data-safe, zero core edits to add a theme.
4. Storefront pages (PDP/PLP/Cart/Checkout/Tracking/Account/Home) with static/dynamic split, five states (two-layer), SEO, AR/RTL native.
5. Checkout: reservation+TTL, guest→implicit CRM, invoice+ETA on confirm, idempotent, race-safe; every critical state handled.
6. Admin (in `apps/erp`): products/categories/orders/affiliates/settings all per spec; OnlineProduct never duplicates stock; theme picker writes `activeTheme`.
7. ERP is source of truth; all stock/price/AR/customer READ; revalidation propagates via Redis tags.
8. Permissions registered in FE_08 (refund/payout SoD-sensitive); feature-flag-aware; AR+EN throughout.
9. Both apps' acceptance criteria (Admin §12, Storefront §11) confirmed.

> **No Overview PDF for this Brief** (carried decision).

*End of FE_21 E-commerce build kickoff.*
