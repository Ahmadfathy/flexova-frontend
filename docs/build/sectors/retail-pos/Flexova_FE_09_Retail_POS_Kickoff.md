# Flexova — FE_09 Retail/POS — Claude Code Kickoff

> Paste the prompt in §2 into a **fresh, single Claude Code session** scoped to FE_09 only. Verify §3 acceptance before commit. Backend block is the **last** stage for this module — not now.
> Version: 1.0 — July 2026

---

## 0) Files & paths (placement map — read this first)

| Delivered file | Goes to (in repo) | Role |
|---|---|---|
| `Flexova_FE_09_Retail_POS.md` | `docs/build/sectors/retail-pos/FE_09_Retail_POS.md` | Module build spec |
| `Flexova_FE_09a_POS_Layout.md` | `docs/build/sectors/retail-pos/FE_09a_POS_Layout.md` | Dedicated `PosLayout` spec |
| `Flexova_FE_09_Retail_POS_Kickoff.md` | `docs/build/sectors/retail-pos/FE_09_Retail_POS_Kickoff.md` | This kickoff |
| `Flexova_UIUX_09_Retail_POS.md` | `docs/reference/UIUX_09_Retail_POS.md` | UI/UX reference (context only) |
| `Flexova_FE_09_Retail_POS_fixtures.json` | `src/lib/mock/fixtures/pos.fixtures.json` | **Runtime fixtures — keep the short name at this exact path** |

> Rule: **specs move into the sector folder freely** (reference docs). The **fixtures file must stay** at `src/lib/mock/fixtures/pos.fixtures.json` — the mock layer reads it by short name. If you place it elsewhere, tell Claude Code the real path in the first prompt.

---

## 1) Pre-build checklist (confirm before you paste)
- **Foundation done:** FE_00 (tokens/appearance/shell/i18n) and FE_01–08 are already built and imported from — do **not** redefine any token/component/layout.
- **Spec + fixtures placed:**
  - Spec: `docs/build/sectors/retail-pos/FE_09_Retail_POS.md`
  - Fixtures: `src/lib/mock/fixtures/pos.fixtures.json` (cross-references `inventory`, `sales`, `crm` fixtures — shared IDs `cu_*`, `it_*`, `br_main`, `br_nasr`, `wh_*`, `pm_*`, `pl_*`, `tr_*`, `tax_t1`).
- **Dedicated layout (approved):** build **`PosLayout`** per `docs/build/sectors/retail-pos/FE_09a_POS_Layout.md` — route-scoped (`/pos/*` render in `PosLayout`, not `AppShell`), **additive only** (new files under `components/shell/pos/` + one router branch; **no** token or existing-layout edits). POS also appears as a **Sector nav item** (`moduleFlag:"pos"`, FE_00 §14.3); activating it enters `PosLayout`.
- **Reuse, don't rebuild:** e-receipt/e-invoice model, signing, submission queue, legal-window countdown, `StatusPill`/`EtaBadge`, and the **80mm print template** all come from **FE_02**. Credit-note/return logic reuses FE_02 §7. Auto-posting + treasury reconciliation reuses **FE_04**. Walk-in/credit/loyalty reuse **FE_05**.

## 2) Kickoff prompt (paste this)
> Read `docs/build/sectors/retail-pos/FE_09_Retail_POS.md`, `docs/build/sectors/retail-pos/FE_09a_POS_Layout.md`, and `src/lib/mock/fixtures/pos.fixtures.json`. The Foundation (FE_00) and Core modules (FE_01–08) are already implemented — import tokens, components, shell, i18n, appearance store, `StatusPill`/`EtaBadge`, the **80mm print template (FE_02 §12)**, and the mock layer from them; do **not** redefine them and do **not** edit any token or the three back-office layouts.
>
> First build the **dedicated `PosLayout`** (FE_09a): route-scoped so all `/pos/*` render in `PosLayout` **instead of** `AppShell` (additive router branch; new files only under `components/shell/pos/`). It keeps a **slim POS top bar** (terminal/branch · shift · online/offline + queue · sandbox · Fullscreen · language · **Exit POS**), drops module nav/search/notifications, and **inherits** theme/dark-light/font/`dir` live from the appearance store. Also register POS as a **Sector module** (`moduleFlag:"pos"`, nav key `nav.pos`, permission `pos.access`) so it appears in the back-office nav; activating it enters `PosLayout`.
>
> Then build the module's screens exactly as specified, page by page, rendered inside `PosLayout` — cashier (`/pos/register`), variant picker, weight entry, tender modal (mixed + store-credit + loyalty), parked (`/pos/parked`), return (`/pos/return`), open shift + paid-in/out, close shift + Z-report (`/pos/shift/*`), terminal journal (`/pos/journal`), terminal settings (`/pos/settings`).
>
> Honor the two POS invariants from the spec: **(1) offline-first** — sell + 80mm print + drawer work with zero network; the ticket generates a Sales document/e-receipt that enters the submission queue (`local`→`queued`→`valid`/`rejected`), B2C shows a window countdown; **(2) flag-don't-block** — an item missing `eta_code`/`tax_type` still sells and prints; the generated doc is flagged and held from submission, never blocking the cashier. Keep **payment status and sync/ETA status independent** (separate pills/filters). Support **mixed/split tender** (change on cash only). **Variants** resolve to one SKU (OOS disabled); **weighed** items compute `weight × price/kg`. **POS return**: linked → refund as original + credit note; **no-original → offer cash OR store credit at the customer's choice** (both supported), store credit to a linked customer or a printed bearer voucher. **Loyalty** earns on close and redeems at tender. **Shift close** computes variance (expected − counted) and posts one balanced treasury entry (FE_04); terminal locks after close; no selling without an open shift. Use **per-terminal** numbering.
>
> Implement all five states (`?mock=loading|empty|error|no_results|offline`), responsive (tablet/terminal landscape first; small screens → cart bottom-sheet), permission gating (`pos.*` via the real `can(key, scope)` from FE_08), and AR (default) + EN strings under the `pos` namespace. Model hardware (80mm printer / drawer / scanner / scale) behind a **mock hardware bridge** interface (no real device I/O yet) so the flows are exercisable. Then walk through and confirm the Module acceptance criteria (FE_09 §16).

## 3) Acceptance gate (verify before commit)
Run the FE_09 §16 list. High-signal checks:
- No sale without an open shift; float recorded; terminal **locks** after close.
- Offline: sale + 80mm print + drawer with network off (`?mock=offline`); doc shows `local`→`queued`; B2C nearing-window shows a live countdown.
- Ticket close **generates** a Sales doc/e-receipt (FE_02 path) — not a separate finance source; accepted receipts have no edit/delete.
- **Mixed tender** works; change on cash only. **Variant** → one SKU (OOS disabled). **Weighed** line = weight × price/kg.
- **Return:** linked → as original + credit note; **no-original → cash or store credit (customer's choice)**; inbound movement created.
- **Loyalty** redeems at tender when enabled; **flag-don't-block** proven (missing `eta_code` sells + flags, never blocks).
- Shift close: variance = expected − counted; **one balanced** treasury entry posted; Z-report renders offline.
- Payment vs sync status shown **separately**; per-terminal numbering (`MN-P1-…` / `NS-P1-…`); all strings via i18n keys, full RTL.

## 4) Commit + next
- Commit: `feat(pos): cashier + shift + tender(mixed) + variants + weight + return + journal + settings (offline-first, mock)`.
- Verify `git log --oneline`; push manually.
- **Next logical step after this builds & passes:** the **Retail/POS Backend block** (offline sync + conflict resolution, shift reconciliation, hardware bridge, POS ticket → Sales document generation) — added to `Flexova_Backend_Plan.md`, contracts = these fixtures. (Backend is always the module's last stage.)

*End of FE_09 Kickoff — version 1.0*
