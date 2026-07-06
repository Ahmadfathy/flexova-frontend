# Flexova — FE_10 F&B — Claude Code Kickoff

> Paste the prompt in §2 into a fresh Claude Code session scoped to FE_10 only. Verify §3 before commit. **Backend block is the module's last stage — not now.** v1 = **narrow core** (Floor/Order/Modifiers/Courses/KDS/Bill-Split); Menu&Recipe editor deferred.
> Version: 1.0 — July 2026

---

## 0) Files & paths (placement map — read first)

| Delivered file | Goes to (in repo) | Role |
|---|---|---|
| `Flexova_FE_10_FnB.md` | `docs/build/sectors/fnb/FE_10_FnB.md` | Module build spec |
| `Flexova_FE_10_FnB_Kickoff.md` | `docs/build/sectors/fnb/FE_10_FnB_Kickoff.md` | This kickoff |
| `Flexova_UIUX_10_FnB.md` | `docs/reference/UIUX_10_FnB.md` | UI/UX reference (context) |
| `Flexova_FE_10_FnB_fixtures.json` | `src/lib/mock/fixtures/fnb.fixtures.json` | **Runtime fixtures — keep the short name at this exact path** |

> Specs move into `docs/build/sectors/fnb/` freely. The **fixtures must stay** at `src/lib/mock/fixtures/fnb.fixtures.json` (mock layer reads by short name).

## 1) Pre-build checklist
- **Foundation + Core built:** FE_00 and FE_01–08 imported; **do not** redefine tokens/components/layouts.
- **POS built and reused wholesale:** `PosLayout` (top bar: logo/rail-aligned, live clock, 3-icon tooltips, green Dashboard pill, light-danger Exit), **shift** (open/close/Z + treasury), **tender modal** (mixed/store-credit/loyalty), **e-receipt/e-invoice + 80mm print + ETA queue/window/resend**, **journal**, **terminal settings** (mock hardware bridge), **product grid + density(4–12) + stable card**, per-terminal numbering, **flag-don't-block**, five states. **Reuse — do not reimplement.**
- **Spec + fixtures placed** per §0. Fixtures cross-reference `pos`/`inventory`/`crm` shared IDs.
- **Narrow core only:** no Menu/Recipe editor (menu+modifiers+recipes come from fixtures seed).

## 2) Kickoff prompt (paste this)
> Read `docs/build/sectors/fnb/FE_10_FnB.md` and `src/lib/mock/fixtures/fnb.fixtures.json`. The Foundation (FE_00), Core (FE_01–08), and **Retail/POS (FE_09 + FE_09a)** are already implemented — **reuse them wholesale**: import `PosLayout`, shift, tender modal, e-receipt/ETA + 80mm print, journal, terminal settings, product grid + density + stable card, per-terminal numbering, tokens/components/i18n/appearance. **Do not redefine tokens or edit the shell.**
>
> Register F&B as a **Sector module** (`moduleFlag:"fnb"`, `nav.fnb`, permission `fnb.access`) that runs **inside `PosLayout`** (the rail becomes menu categories). Build the **narrow core**, page by page:
> - **Floor plan (`/fnb/floor`)** — **visual** canvas: sections (صالة/تراس/VIP) + tables placed by `x,y` with shape/seats and **status colors** (available/occupied/reserved/dirty); tap available → guests → open Check → `/fnb/order/:id`; tap occupied → enter; transfer/merge/move (gated); **drag-drop editor** (`fnb.floor.edit`) that persists; RTL canvas; pan/zoom on small screens (sectioned-list fallback).
> - **Order (`/fnb/order/:checkId`)** — inside `PosLayout`: **menu grid** (reuse FE_09 product card + rail + search/scanner + density), **Course tabs**, **Check panel** (lines with modifiers + per-line status + course), footer **`Fire`** + **`Bill`**. Tap item → **Modifiers overlay** if it has groups; assign course; **Fire** routes lines to the KDS station (emit KOT) and flips status `preparing`; live status (ready→served); void line/order gated (reason). **BOM depletion is flag-aware** (`fnb.recipe`): recipe dishes deplete raw, simple dishes don't, absence never blocks.
> - **Modifiers overlay** — groups single/multi, required/optional, price deltas shown; required blocks confirm; modifiers show on line + KOT.
> - **KDS (`/fnb/kds` · `/fnb/kds/:stationId`)** — per station, columns of KOT tickets (table/ref, course, items+modifiers, **per-item timer**, status new/preparing/ready); **bump** (ready→notify floor), **recall**, reprint KOT; high-contrast glanceable; offline-tolerant.
> - **Bill/Split (`/fnb/bill/:checkId`)** — lines + totals with **service charge** + **tips**; **Split** equally / by-item / by-seat; **Settle** opens the **reused POS tender modal** → generates Sales doc/e-receipt (FE_09/FE_02); on settle order `settled`, table → `dirty` → `available`.
>
> Honor the invariants: **Check is long-lived**; **Fire routes to KDS (not settle)**; **Settle generates the document** (reuse FE_09/FE_02, never a separate finance source); payment vs sync/ETA **independent**; **offline-first** (order+KDS work offline; doc queued; B2C window countdown); **flag-don't-block** (missing `eta_code` on `mi_special` still sells). Order types **dine-in/takeaway/delivery**; **delivery channel modeled** (type + channel + address/phone), aggregator API is a deferred stub.
>
> Implement five states (`?mock=loading|empty|error|no_results|offline`), responsive (landscape order/floor; small → check bottom sheet, floor sectioned list), permission gating (`fnb.*` via real `can(key,scope)` from FE_08), and AR (default) + EN under the `fnb` namespace (+ reused `pos`). RTL logical properties; western digits + `tabular-nums`; `ج.م` after amounts. Then confirm the Module acceptance criteria (FE_10 §12).

## 3) Acceptance gate (verify before commit)
Run FE_10 §12. High-signal checks:
- Runs inside `PosLayout` as `moduleFlag:"fnb"`; no shell/token edits; POS top bar/shift/tender/journal/e-receipt reused.
- Floor plan visual (coordinates + status colors); tap opens/enters; drag-drop editor persists.
- Order: item→modifiers→course; **Fire emits KOT to the right station** and flips status; **Settle** (not Fire) generates the doc.
- Modifiers enforce required + price deltas; show on line + KOT.
- KDS per station with timers; bump→ready notifies floor; recall/reprint.
- Bill split (equal/by-item/by-seat) + service + tips; settle via reused tender; table frees after close.
- BOM flag-aware (`fnb.recipe`): `mi_burger` depletes raw, `mi_koshari` doesn't; never blocks. `mi_special` (no eta_code) still sells.
- Payment vs sync independent; offline order+KDS; delivery channel modeled.

## 4) Commit + next
- Commit: `feat(fnb): narrow core — floor plan + order + modifiers + KDS + bill/split (reuses POS, mock)`.
- Verify `git log --oneline`; push manually.
- **Next after build & pass:** module acceptance checklist (FE_10 §12) → then the **F&B Backend block** (last stage): Check→document, Fire/KOT routing + KDS state, BOM depletion, delivery channel, split/service/tips posting — contracts = these fixtures, reusing the POS backend block.

*End of FE_10 Kickoff — v1.0 (narrow core).*
