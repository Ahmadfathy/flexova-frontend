# Flexova — FE_17 Construction: Definition of Done

> Final acceptance gate for the Construction / Contracting sector (Brief 11). The sector is "done" only when **every** box below is checked against the running build.
> Version: 1.0 — August 2026
> **References:** `FE_17_Construction.md` (§15 master criteria) · `construction.fixtures.json` (pre-verified math).

---

## 1) Flag & modularity (the modular promise)
- [ ] With `construction.enabled` **off**, the FE_16 project hub is **byte-identical** to before — no construction tabs, KPIs, routes, or strings leak.
- [ ] With the flag on but `project.mode !== "construction"`, a normal FE_16 project is unaffected.
- [ ] With the flag on **and** `mode === "construction"`, the four header KPIs + secondary tabs appear.
- [ ] Every consumer (material issue, labor log, subcontract) tolerates the module being absent without error (feature-flag-aware).

## 2) BOQ + Cost Budget (S2)
- [ ] Contract value = Σ BOQ item values; updates live on edit.
- [ ] Each item shows both `unit_price` (sell) and `estimated_unit_cost` (cost); `expected_margin` recomputes live and colors green/red.
- [ ] **Hide-cost toggle** hides cost + margin columns only (client-safe view); persists per user.
- [ ] Section headers group items inside a phase with no price.
- [ ] Cost Budget is entered **per phase** (Option A) with optional materials/labor/subcontract/other breakdown.
- [ ] Excel/CSV import maps description/unit/qty/price.
- [ ] After contract approval the BOQ is **read-only** with the "edit via Variation Order" banner.

## 3) Contract terms (S3)
- [ ] Retention rate + optional cap + two-stage release template captured.
- [ ] Advance amount + recovery method/pct + received-receipt link captured.
- [ ] **Live preview** of a 100,000 claim matches the S5 engine exactly.
- [ ] retention% + advance% > 100 → blocked; cap < rate → warned.
- [ ] Terms **hard-lock after the first approved claim**; change needs elevated permission + alert.

## 4) Variation Orders (S4)
- [ ] VO supports batched lines (add item / modify qty / modify price) with a required reason.
- [ ] Live impact card shows contract-value before/after and margin impact.
- [ ] Approval creates a **new BOQ version**; contract value + S1 header update.
- [ ] Approved VO is **non-deletable**; correction is a reversing VO (auditable).
- [ ] Create works **offline**; approval prefers **online**.
- [ ] New/modified items enter the **next** claim automatically; qty reduced below executed → explicit warning.

## 5) Progress Claim engine (S5) — the heart
- [ ] Claim pulls all BOQ items (post-VO) with prev executed qty read-only.
- [ ] Input is **cumulative executed qty**; `cumulative %` and `current value = cumulative − prev` compute live.
- [ ] Backward progress (cumulative < prev) is **blocked**; overage (> contract qty) blocked/alerted (needs VO).
- [ ] Summary computes: gross − retention(**capped**) − advance recovery(**auto-capped at remaining**, manual override available) − manual deductions + **VAT on gross work value** = net payable.
- [ ] **Fixture check `claim_002`:** retention = 80,400 (accumulated hits cap 301,800), advance recovery = 157,200 (advance outstanding → 0), VAT = 284,060, net payable = 2,075,460. Engine matches to the piaster.
- [ ] **Fixture check `claim_001`:** gross 2,214,000, retention 221,400, advance 442,800, VAT 309,960, net payable 1,859,760.
- [ ] Submit → approve posts a balanced journal + issues a **B2B ETA tax invoice**.
- [ ] Official **claim PDF** prints (RTL, item table + deductions/retention/VAT summary + signatures).
- [ ] **One open draft per project** enforced.
- [ ] ETA rejection → claim stays approved, "rejected" badge + plain-Arabic reason + resend.

## 6) Claims register (S6)
- [ ] Spine table with a **totals row** that reconciles to the sum of per-claim figures.
- [ ] KPI strip: billed / collected / retained / remaining-to-bill.
- [ ] Drill-down opens the claim (approved = read-only + print).
- [ ] `+ new claim` disabled while a draft is open; ETA-rejected rows flagged + reachable for resend.

## 7) Retention + release (S7)
- [ ] Accumulated retained = Σ retained across approved claims; outstanding = accumulated − released.
- [ ] Release event requires explicit confirm; blocked if amount > outstanding.
- [ ] Release posts a journal (reduce retention liability) + **payment voucher** to the client.
- [ ] **At-cap banner** shows when the cap is reached (future claims retain nothing).
- [ ] Warranty-release alert keys off the **initial-handover release date** + warranty months.

## 8) Subcontract + sub-claim (S8)
- [ ] Subcontractor = **supplier variant** (Purchasing); sub-BOQ uses the S2 engine with price = our cost.
- [ ] Copy-from-main **copies** items (no live link) in v1.
- [ ] Sub-claim mirrors the S5 engine but outputs a **payment voucher + AP**; sub-retention is **held by us** and releasable.
- [ ] Sub's tax invoice → **input VAT** (deductible; Purchasing/ETA).
- [ ] **Fixture check `subclaim_001`:** gross 96,000, sub-retention 9,600, net payable 99,840.
- [ ] Margin alert fires when a sub item value > the matching main BOQ item value.
- [ ] Approved sub-claims flow into S9 actual cost (subcontract line).

## 9) Actual vs Estimated (S9)
- [ ] Header KPIs: revenue billed, actual cost, actual profit + margin, vs estimated with variance color.
- [ ] **Phase pivot** compares Cost Budget estimate vs **ledger-derived** actual per phase, with variance %, % complete, and flag.
- [ ] Cost breakdown (materials/labor/subcontract/direct) vs estimated breakdown.
- [ ] Progress-vs-spend indicator present.
- [ ] **Approximate forecast** present and **clearly labeled** approximate (not EVM).
- [ ] Every actual cell **drills down to source documents**; no source figure is recomputed.
- [ ] No Cost Budget → estimated columns empty + prompt to S2; actual still renders.
- [ ] **Fixture check:** revenue billed 4,243,000; actual cost to date 3,855,000; actual profit 388,000; estimated profit 993,000.

## 10) Cross-module posting (Step 9)
- [ ] Approved claim posts revenue + retention liability + advance recovery + VAT + AR (Σdr = Σcr).
- [ ] Retention release + sub payment vouchers post correctly (AP for sub).
- [ ] Material issues + labor logs + sub-claims accumulate on the project/phase cost center.
- [ ] VAT base on every claim/tax invoice = current work value (retention/advance never touch it).

## 11) UX, RTL, i18n, states, performance
- [ ] Every screen implements all **five states** (loading/empty/error/no-results/offline), reachable via the mock switch.
- [ ] Full **RTL** via logical utilities only (no hard-coded left/right); claim PDF is RTL.
- [ ] Every string flows through the `construction.*` i18n namespace with an **EN mirror**; no hard-coded UI text.
- [ ] Money = Western digits + `tabular-nums` + `ج.م`; percentages/refs LTR-safe within RTL (bidi tested).
- [ ] Offline-first honored: BOQ edit, VO create, claim/sub-claim drafts work local (`local/syncing/synced`); approvals/ETA/vouchers prefer online.
- [ ] Claim table paginates by phase; S9 reads cached ledger aggregates (no raw recompute in the client).

## 12) Permissions (SoD)
- [ ] All `construction.*` keys enforced via `can(key, scope)` (default-deny).
- [ ] `claim.create` vs `claim.approve` and `vo.create` vs `vo.approve` are **separable** (SoD).
- [ ] `profitability.view` + `contract.terms_override` lean governance (owner/manager).
- [ ] Sensitive actions (VO approval, terms override, retention release) write to the immutable audit log.

## 13) Sign-off
- [ ] All spec §15 master criteria pass.
- [ ] All fixture math checks (claims, retention cap, advance recovery, sub-claim, profitability) reproduce exactly.
- [ ] Committed per screen with clear messages; sector demo runs end-to-end on fixtures (create BOQ → terms → VO → two claims → retention view → subcontract + sub-claim → profitability).

**Open point carried forward (not a blocker):** VAT-base treatment on claims is provisional pending a tax accountant, same status as the ETA connector. Flag in the Overview, don't hard-code assumptions that would be costly to reverse.

*End of FE_17 Construction DoD — version 1.0*
