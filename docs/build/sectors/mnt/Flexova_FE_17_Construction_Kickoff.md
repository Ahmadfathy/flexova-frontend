# Flexova — FE_17 Construction: Kickoff & Build Prompts

> Execution map for building the **Construction / Contracting** sector (Brief 11) with Claude Code. Read this before opening Claude Code.
> Version: 1.0 — August 2026
> **Spec (build-ready):** `FE_17_Construction.md` + `construction.fixtures.json`.

---

## 0) Mental model

- Construction is a **facet on the FE_16 project** — it adds **no new project entity**. The FE_16 project *is* the contract. Everything about project/phases/team/documents/appointments/staged-approval is **already built in FE_16** — import and reuse it; never redefine it.
- Everything construction renders **only** under `construction.enabled` (tenant flag) **and** `project.mode === "construction"`. With the flag off, FE_16 must behave exactly as before.
- **No backend in this phase.** Data flows through the existing mock layer (`src/lib/mock/client.ts`) reading `construction.fixtures.json`. Signatures mirror the future API 1:1 (drop-in later).
- **One screen per session, with a pause.** Build one S-screen, verify its acceptance, commit, move on. Keep context small.
- **Two numbers per BOQ item, unrelated:** `unit_price` (sell/revenue) and `estimated_unit_cost` (our cost, client never sees it). Don't conflate them.
- **The claim engine is the heart:** `current = cumulative − previous` per item; retention honors the cap; advance recovery auto-caps at remaining with a manual override; VAT on current work value only.

---

## 1) Path conventions (state to Claude Code if asked)

| Thing | Path |
|---|---|
| This spec | `docs/build/FE_17_Construction.md` |
| Fixtures | `src/lib/mock/fixtures/construction.fixtures.json` |
| App code | `src/` |
| Mock layer | `src/lib/mock/client.ts` |
| Feature flags | existing tenant flags store (from Core) |

> The spec references the fixtures as `construction.fixtures.json`. Rename `Flexova_FE_17_Construction.fixtures.json` → `construction.fixtures.json` at that path, or tell Claude Code the real path in your first prompt.

---

## 2) Prerequisites (gate before starting)

FE_16 (Projects) **must already be implemented and passing**, plus these Core modules it leans on: FE_01 Inventory (material issue), FE_02 Sales+ETA (tax invoice), FE_03 Purchasing (supplier → subcontractor, AP, input VAT), FE_04 Accounting (cost centers, auto-posting, vouchers, ledger), FE_06 HR (labor time-log), FE_08 Permissions (the `can(key, scope)` gate).
If FE_16 isn't built, stop — Brief 11 has nothing to sit on.

---

## 3) Build order & per-step prompts

Work top to bottom. Don't start a step until the previous one passes its acceptance criteria (§4). Each prompt assumes the Foundation + FE_16 + Core are already implemented and imported, never redefined.

### Step 0 — Flag, entities, mock wiring, project facet (S1)  *(do this alone, first)*
> Read `docs/build/FE_17_Construction.md` (§1, §2, §11, §12) and `src/lib/mock/fixtures/construction.fixtures.json`. The Foundation (FE_00), Projects (FE_16), and Core modules are already implemented — import tokens, components, shell, i18n, the appearance store, the project hub, and the `can(key, scope)` gate from them; do not redefine them. In this step: (a) register the `construction.*` i18n namespace (AR default, EN mirror) and the `construction.*` permission keys (§13); (b) wire `construction.fixtures.json` through the existing mock layer with signatures mirroring a future REST API; (c) gate all construction UI behind `construction.enabled && project.mode === "construction"` — when off, the FE_16 project hub is unchanged; (d) build the **S1 project-workspace facet**: the four header KPI pills (contract value, billed, retention held, remaining), the construction secondary tabs (BOQ · Claims · Retention · Subcontracts · Profitability), the Overview additions (contract financial position card, latest-claim card, alerts card), and the empty/onboarding state pointing to BOQ. Implement all five states, responsive, permissions gating, and AR/EN. Then confirm §11 + §15.1 acceptance.

Stop and verify. Confirm the flag truly hides everything when off.

### Steps 1–8 — construction screens, one per session
Use this template, swapping the screen:
> Read `docs/build/FE_17_Construction.md` §<N> (screen <S>) and `construction.fixtures.json`. FE_16 + Core + Step 0 are already implemented — reuse the project hub, tabs, mock layer, permission gate, and inherited entities; do not redefine them. Build this screen exactly as specified: layout, every field with its type/validation, the five states, responsive behavior, permission gating, and AR/EN strings. Keep everything flag-aware. Then confirm the screen's acceptance criteria.

Order (each is one session):
1. **S2 — BOQ + Cost Budget editor** (§3): phase-tree rail; BOQ table with sell `value` (read-only) + `estimated_unit_cost` (input) + `expected_margin`; **hide-cost toggle**; section headers; Cost Budget breakdown panel; Excel/CSV import wizard; read-only lock after contract approval (banner → edits via VO).
2. **S3 — Contract terms** (§4): retention rate + cap + release template; advance amount + recovery method/pct; **live preview** of a 100,000 claim; **hard lock after first approved claim** (elevated override).
3. **S4 — Variation Order** (§5): batchable lines (add/modify qty/price); reason ✱; live impact card; approval → new BOQ version; approved VO non-deletable (reversal only); create offline / approve online.
4. **S5 — Progress Claim editor** (§6) — **the heart**: pulls all BOQ items with prev/cumulative; **input = cumulative executed qty**; live `current = cumulative − prev`; docked summary panel (gross − retention[capped] − advance[auto-capped + manual override] − manual deductions + VAT[on gross] = net payable); submit→approve→post+ETA tax invoice; printable claim PDF; block backward progress; one open draft only.
5. **S6 — Progress claims register** (§7): spine table + totals row + KPI strip; drill-down (approved = read-only + print); `+ new claim` disabled when a draft is open; ETA-rejected rows flagged.
6. **S7 — Retention + release** (§8): accumulated/released/outstanding KPIs; accrual table per claim; **release event** (`AlertDialog` + explicit confirm) → journal + payment voucher; at-cap banner; **warranty alert keyed off the initial-handover release date**.
7. **S8 — Subcontract + sub-claim** (§9): subcontractor = supplier variant; sub-BOQ (same S2 engine, price = our cost) with **copy-from-main (copy, not link)**; sub-claim = same S5 engine but output = **payment voucher + AP + sub-retention held by us**; margin alert when sub value > main BOQ item value.
8. **S9 — Actual vs Estimated** (§10): header KPIs; **phase-by-phase pivot** (estimated vs ledger-derived actual, variance color, % complete); cost breakdown (materials/labor/subcontract/direct); progress-vs-spend; **approximate forecast** (labeled). Every actual cell drills to source docs.

### Step 9 — cross-module wiring (after S9)
> Confirm the intentional integrations connect end-to-end (don't rebuild them): approved claim → Accounting journal (revenue + retention liability + advance recovery + VAT + AR) **and** ETA tax invoice (VAT base = current work value); retention release → journal + payment voucher; material issues (FE_01) + labor logs (FE_06) + approved sub-claims (S8) → the project/phase **cost center** feeding S9 actuals; sub tax invoice → **input VAT** (FE_03/ETA); every screen's gating uses the real `can('construction.*', scope)` check, not placeholders.

---

## 4) Per-step acceptance checkpoints (gate before moving on)

The spec's §15 is the master gate. High-signal checks per step:

- **S1/flag:** flag off → FE_16 project hub identical (no construction tabs/KPIs); flag on + `mode="construction"` → four KPIs + tabs appear; empty project routes to BOQ onboarding.
- **S2 BOQ:** contract value = Σ BOQ; margin recomputes live; hide-cost hides cost+margin columns only; after approval the table is read-only and edits force a VO.
- **S3 terms:** preview matches the claim engine to the piaster; terms hard-lock after the first approved claim.
- **S4 VO:** approval versions the BOQ + updates contract value; approved VOs non-deletable; new items appear in the next claim; create works offline, approval prefers online.
- **S5 claim:** `current = cumulative − prev` per item; retention respects the cap; advance recovery = `min(pct×gross, remaining)` with manual override; VAT on gross work value (not net); backward progress blocked; approval posts a journal + ETA invoice; claim PDF prints; one open draft max.
- **S6 register:** totals row reconciles to per-claim sums; drill-down opens the claim; rejected ETA reachable for resend.
- **S7 retention:** accumulated = Σ retained; release blocked above outstanding; release posts journal + payment voucher; warranty alert keys off the initial-handover date; at-cap banner shows.
- **S8 sub:** sub-claim mirrors S5 but outputs a payment voucher + AP; sub-retention held & releasable; copy-from-main copies (no live link); loss alert fires when sub > sell; approved sub-claims flow into S9 actual cost.
- **S9 profitability:** phase pivot compares Cost Budget estimate vs ledger-derived actual; every actual cell drills to source; forecast labeled approximate; no Cost Budget → estimated columns empty + prompt, actual still shows.

> **Fixture-driven verification (use these while testing):** `claim_002` must show the **retention cap hit** (retains only 80,400, accumulated = cap 301,800) **and** the **advance fully recovered** (recovers only the remaining 157,200, outstanding = 0). If your engine retains 202,900 or recovers 405,800 on claim 2, the cap/auto-cap logic is wrong.

---

## 5) Cross-module integrations already wired in the spec

Intentional — should "just connect", don't rebuild:
- **Claim → Accounting + ETA:** approved claim auto-posts and issues a B2B tax invoice (VAT base = current work value).
- **Retention/advance affect net payable only**, never the VAT base (provisional — flagged for a tax accountant).
- **Cost center = project/phase:** material issues (FE_01), labor logs (FE_06), sub-claims (S8) accumulate here → S9 actuals.
- **Subcontractor = supplier variant** (FE_03): sub-claim → payment voucher + AP; sub tax invoice → input VAT.
- **Profitability read-only:** S9 displays figures owned by Accounting/Inventory/HR; never recomputes source numbers.
- **Permissions everywhere:** FE_08 catalog gates every construction screen/action via `can(key, scope)`.
- **Fixture cross-reference:** IDs are shared (`cu_developer`, `sup_noor_electric`, `cc_prj_bldg_zayed`) so flows connect end-to-end.

---

## 6) Working tips

- **Verify the flag first** (Step 0): a project with the flag off must look exactly like FE_16 — a leak here undermines the whole modular promise.
- **Exercise the five states** via the existing mock switch (`?mock=loading|empty|error|no_results|offline`).
- **Build the claim engine (S5) against the fixture math** — `claim_001` and `claim_002` are pre-verified; match them exactly before styling.
- **Commit per screen** (`feat(construction): S5 progress claim editor + engine`).
- If Claude Code proposes deferring a v1 item (per-item retention, item-level cost, plant costing, sub-portal, Gantt) — that's correct, those are **out of v1**; don't let it add them.
- If it proposes a redesign, point it back to the spec — decisions are locked unless deliberately changed.

---

## 7) After FE_17
- **DoD:** run `FE_17_Construction_DoD.md` as the final gate before calling the sector done.
- **Backend:** `FE_17_Construction_Backend.md` replaces the mock layer with real APIs (signatures already match) — the claim/retention/advance engine, cost-center aggregation, and sub-AP posting are the domain-heavy parts.
- **Next sector:** continue the Brief order; Brief 11 was the highest-reuse pattern (built on Brief 7).

*End of FE_17 Construction Kickoff — version 1.0*
