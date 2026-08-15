# Flexova — FE_17 Construction / Contracting (build-ready)

> **Sector Brief 11 — builds directly on Brief 7 (FE_16 Projects).** Multi-phase project + BOQ + progress claims (extracts) + retention + advance + subcontractors + actual-vs-estimated cost. Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — August 2026
> **Source of truth (do not redefine):** `Flexova_Project_Brief` (Pattern 11) · `Flexova_Design_Foundations` · `Flexova_FE_16_Professional_Services` (project / phases / team / documents / appointments / staged-approval / profitability — **inherited whole**) · `Flexova_FE_01_Inventory` (material issue) · `Flexova_FE_02_Sales_ETA` (tax-invoice + ETA pipeline) · `Flexova_FE_03_Purchasing` (supplier → subcontractor variant, AP, payment voucher, input VAT) · `Flexova_FE_04_Accounting` (cost centers, auto-posting, receipt/payment vouchers, AR/AP — read/consume, never recomputed) · `Flexova_FE_06_HR_Payroll` (time-log / labor).
> **Governing principle — "the contract is a facet on the project":** Brief 11 adds NO new project entity. The FE_16 project *is* the contract; construction fields, tabs, and the contractual-financial layer (BOQ → claims → retention → advance → subcontract) sit **on top of it** and appear only when `construction.enabled`.
> **Golden rules (carried + new):** (1) **Everything about the project/phases/team/docs/appointments/staged-approval is INHERITED from FE_16 — never re-defined here.** (2) **Two numbers per BOQ item, unrelated:** `unit_price` = client sell price (revenue); `estimated_unit_cost` = our cost (never shown to the client). (3) **A claim's `current = cumulative − previous`** — never a fixed milestone. (4) **VAT base = current period work value**, while retention + advance recovery affect **net payable only**, not the tax base *(open point flagged for a tax accountant — same status as the ETA connector; treat as provisional).* (5) **Actual cost is ledger-derived at the phase level** (materials + labor + subcontract + direct/equipment); estimated cost is entered per phase (Cost Budget). (6) **Feature-flag-aware:** every consumer (material issue, labor, subcontract) expects the module's absence and does not break.
> **Retroactive wiring:** none. This is a pure additive facet on FE_16; when the flag is off, FE_16 behaves unchanged.

---

## 0) Module scope (recap)

**In v1:** BOQ grouped under inherited phases (2 levels: phase → item, + optional non-priced section header) · Cost Budget per phase (Option A) · basic Variation Orders (documented, versions the BOQ, approval-gated) · full progress claim (cumulative %/qty, current = cumulative − previous, retention, advance recovery, manual deductions, VAT) · retention (unified rate + optional cap, manual two-stage release) · advance payment (auto-recovery, auto-capped at remaining + manual override) · subcontractors **back-to-back** (contract + claims + retention on the AP side, mirror of the main flow) · actual-vs-estimated at phase level with breakdown + simple "approximate forecast" · claim → tax invoice on ETA (existing pipeline, no new logic).

**Out (deferred):** per-item retention · item-level actual cost · plant/equipment costing engine (equipment = direct expense in v1) · external subcontractor portal · schedule / Gantt / critical path (inherit FE_16 phases + dates only) · complex liquidated-damages formulas (LDs = manual deduction line in v1) · multi-currency (EGP-only, consistent with Accounting) · prospective-change of locked contract terms · live back-to-back link between sub-BOQ and main BOQ items (v1 = copy, not link).

Reads from Inventory (issues), HR (labor time-logs), Accounting (cost centers, AR/AP, vouchers, ledger), Sales/ETA (tax invoice), Purchasing (suppliers → subcontractors). Feeds Accounting (auto-posting: revenue, retention liability, advance recovery, VAT, AR; sub AP + sub-retention), ETA (claim → tax invoice), Reports + owner WhatsApp digest (project profitability). Data via `lib/mock/client.ts` reading `construction.fixtures.json`.

---

## 1) Routes & IA

Construction is **not** a top-level nav item — it mounts **inside the inherited project workspace** (FE_16). When `construction.enabled` and a project has `mode = "construction"`, extra secondary tabs appear below the project `PageHeader`.

```
/projects/:id                      → Project workspace (FE_16 hub)          [§2 / S1]
/projects/:id/boq                  → BOQ + Cost Budget editor               [§3 / S2]
/projects/:id/contract             → Contract terms (retention/advance)     [§4 / S3]
/projects/:id/variations           → Variation Orders                       [§5 / S4]
/projects/:id/variations/:vo       → VO editor
/projects/:id/claims               → Progress claims register               [§7 / S6]
/projects/:id/claims/new           → Progress claim editor (the heart)      [§6 / S5]
/projects/:id/claims/:claim        → Claim view (read-only if approved)     [§6 / S5]
/projects/:id/retention            → Retention + release                    [§8 / S7]
/projects/:id/subcontracts         → Subcontracts list                      [§9 / S8]
/projects/:id/subcontracts/:sc     → Subcontract + sub-claims               [§9 / S8]
/projects/:id/profitability        → Actual vs Estimated                    [§10 / S9]
```

**Secondary tabs (construction mode only):** Overview (inherited) · BOQ · Claims · Retention · Subcontracts · Profitability · Documents (inherited).
**Modals/drawers:** VO create (approval-gated) · Retention release (`AlertDialog` + explicit confirm) · Claim submit/approve (staged) · Import BOQ from Excel (wizard) · Manual deduction line (inline, on claim).
**i18n namespace:** `construction`. AR default, EN mirror. All money = Western digits + `tabular-nums` + `ج.م`.

---

## 2) Entities (display model)

Inherited entities are **referenced, not redefined.**

| Entity | Owner | Notes |
|---|---|---|
| **Project (= contract)** | **FE_16 (inherited)** | scope + phases + team + documents + appointments + staged/approval. Construction adds a `mode="construction"` facet + fields below. |
| **Phase** | **FE_16 (inherited)** | the container BOQ items group under; the unit for Cost Budget & actual/estimated. |
| BOQ Item | Construction | `code · description · unit · estimated_qty · unit_price(sell) · amount · phase_ref · section_header?(no price) · cumulative_executed_qty(derived) · boq_version` |
| Section header | Construction | visual grouping row inside a phase; no price. |
| Cost Budget | Construction | **per phase** (Option A): `phase_ref · estimated_cost · breakdown?(materials/labor/subcontract/other)`. |
| Variation Order | Construction | `type(add_item/modify_qty/modify_price, batchable) · target_boq_item? · reason ✱ · date · ext_ref? · attachment? · status · contract_value_impact` → new BOQ version. |
| Progress Claim | Construction | `claim_no · period · date · status(draft→submitted→approved→invoiced→collected) · gross_current · retention_this · advance_recovery_this · deductions[] · vat · net_payable · tax_invoice_ref?` |
| Claim Line | Construction | `boq_item_ref · prev_qty(read) · cumulative_qty(input) · cumulative_pct(derived) · cumulative_value · prev_value · current_value(=cumulative − prev)` |
| Retention | Construction | **contract-level:** `rate · cap? · accumulated_retained(derived) · released · outstanding`. |
| Release Event | Construction | `amount · stage(initial_handover/warranty_end/other) · date · reason/attachment · voucher_ref` |
| Advance Payment | Construction | **contract-level:** `amount · recovery_method(fixed_pct/proportional) · recovery_pct · recovered_to_date · outstanding · received_receipt_ref?` |
| Subcontract | Construction | `subcontractor(supplier variant) · sub_boq[] · retention · advance · status` — **mirror on AP.** |
| Sub Progress Claim | Construction | same shape as Progress Claim; output = **payment voucher** (not tax invoice); retention = **held by us**; sub's tax invoice → **input VAT** (Purchasing/ETA). |

**Validation (module-wide):** cumulative_qty < prev_qty → **block** ("progress can't go backwards — use a VO"); cumulative_qty > contract qty → **block/alert** (overage needs a VO); retention_rate + advance_recovery_pct combos that would exceed 100% net → block; BOQ locked after contract approval (edits route through VO); contract terms lock hard after the first approved claim (change needs elevated permission).

---

## 3) Screen — BOQ + Cost Budget editor (`/projects/:id/boq`) [S2]

### 3.1 Purpose
Build BOQ items per phase and enter estimated cost alongside — one place. Sell price and estimated cost live in the same row with a **hide-cost toggle** (for on-screen presentation to the client).

### 3.2 Layout
- **Start rail:** inherited phase tree (collapsible); each phase shows **sell value** + **estimated cost**.
- **Main:** BOQ DataTable (compact, sticky header) for the selected phase.

### 3.3 BOQ table (per phase)
Columns: code (optional, auto/manual) · description · unit (م²/م.ط/عدد/م³/مقطوعية — extensible list) · estimated_qty · unit_price(sell) · **value(sell)** = qty×price (read-only) · **estimated_unit_cost** (input) · **expected_margin** = (price−cost)×qty (read-only, green/red).
- **Section header** row: visually distinct, groups items inside a phase, no value.
- **Phase totals row:** Σ sell · Σ estimated cost · Σ margin.
- **Hide-cost toggle** in toolbar → hides `estimated_unit_cost` + `expected_margin` columns (client-safe view). Persisted per user.

### 3.4 Cost Budget breakdown (optional)
Opening a phase (or item) reveals a side panel to split the estimated cost: **materials / labor / subcontract / other**. If left blank, the aggregate `estimated_unit_cost` stands. Breakdown feeds the finer comparison in S9.

### 3.5 Tools
Add item · add section · drag-reorder (within a phase) · **Import BOQ from Excel/CSV** (mapping wizard: description/unit/qty/price) — strong switching lever · copy-from-previous-project (deferred, noted).

### 3.6 Five states
Loading (skeleton) · **empty:** "no items in this phase yet" + `add first item` / `import from Excel` · error · no-results (search within BOQ) · offline (local edit + sync).

### 3.7 Validation / lock
Zero qty or price → **soft warn** (lump-sum allowed). Cost > price → margin red (**warn, not block** — intentional loss possible). **After contract approval → read-only** with banner "contract approved — edit via Variation Order."

### 3.8 Responsive / Permissions
Desktop split (rail + table); mobile → phase accordion, item cards (description + qty + price + margin). `construction.boq.edit`; hide-cost is view-only, ungated.

### 3.9 AR / EN
| key | AR | EN |
|---|---|---|
| construction.boq.title | جدول الكميات | Bill of Quantities |
| construction.boq.item | البند | Item |
| construction.boq.unit | الوحدة | Unit |
| construction.boq.qty | الكمية | Qty |
| construction.boq.unit_price | سعر الوحدة | Unit price |
| construction.boq.value | القيمة | Value |
| construction.boq.est_cost | التكلفة المقدّرة | Est. cost |
| construction.boq.margin | الهامش المتوقّع | Expected margin |
| construction.boq.section | قسم | Section |
| construction.boq.hide_cost | إخفاء التكلفة | Hide cost |
| construction.boq.import | استيراد من Excel | Import from Excel |
| construction.boq.locked | العقد معتمد — التعديل عبر أمر تغيير | Contract approved — edit via Variation Order |

### 3.10 Acceptance
Contract value = Σ BOQ; margin recomputes live; hide-cost hides cost+margin only; after approval the table is read-only and edits force a VO.

---

## 4) Screen — Contract terms (`/projects/:id/contract`) [S3]

### 4.1 Purpose
Set the financial rules claims apply automatically. One-time setup at contract creation; editable until the first claim.

### 4.2 Sections
- **Retention:** rate (%) · cap? (% of contract value where retention stops) · release template (two stages: % at initial handover / % at warranty end + warranty months — advisory; actual release is manual in S7).
- **Advance:** amount (value or % of contract) · recovery method (`fixed_pct` from each claim — default / `proportional`) · recovery_pct · received date + receipt link.
- **Billing/tax:** VAT rate (from Accounting) · claim numbering (per project) · reminder note of the VAT-base rule (§Golden rule 4).

### 4.3 Live preview (important)
A side card shows how a hypothetical 100,000 claim computes under current terms:
```
Current work value           100,000
− retention (rate%)          − …
− advance recovery (pct%)    − …
= net before VAT               …
+ VAT (on 100,000, not net)  + …
= net payable                  …
```

### 4.4 Five states + lock
Validation: retention% + advance recovery% > 100 → block; cap < rate → warn. **After the first approved claim → hard lock;** further change needs `construction.contract.terms_override` (elevated) + alert. Empty → sensible defaults (10% retention, no advance).

### 4.5 Permissions / AR-EN
`construction.contract.edit`; override elevated.
| key | AR | EN |
|---|---|---|
| construction.contract.retention | المحتجزات | Retention |
| construction.contract.retention_rate | نسبة المحتجز | Retention rate |
| construction.contract.retention_cap | سقف المحتجز | Retention cap |
| construction.contract.advance | الدفعة المقدّمة | Advance payment |
| construction.contract.recovery | استرداد الدفعة | Advance recovery |
| construction.contract.warranty | مدة الضمان | Warranty period |
| construction.contract.locked | العقد بدأ الفوترة — تعديل الشروط بصلاحية عُليا | Billing started — terms change needs elevated permission |

### 4.6 Acceptance
Preview matches the claim engine exactly; terms lock hard after the first approved claim.

---

## 5) Screen — Variation Order (`/projects/:id/variations`) [S4]

### 5.1 Form
Type (add_item / modify_qty / modify_price — **batchable, multiple lines per VO**) · target BOQ item (if modify) · **reason ✱** · date · external ref (consultant/client letter no.) · attachment.

### 5.2 Impact (read-only)
Live card: impact on contract value (+/−) · contract value before/after · impact on expected margin.

### 5.3 State / approval
Draft → submitted → **approved / rejected** (inherited staged/approval). On approval → **new BOQ version**, contract value updates, S1 header reflects it. **Approved VO is not deletable** — correction = reversing VO (auditable). **Create offline available; approval prefers online** (offline → stays "submitted" until sync).

### 5.4 Register + effect on claims
Table (no · date · type · impact · status); each BOQ version traceable. Added/modified items enter the **next** claim automatically. Reducing a qty below already-executed → **explicit warn** (conflict with a prior claim; flagged for review).

### 5.5 Five states / Permissions / AR-EN
All 5; empty ("no variations — contract at original value"). `construction.vo.create` / `construction.vo.approve`.
| key | AR | EN |
|---|---|---|
| construction.vo.title | أوامر التغيير | Variation Orders |
| construction.vo.type_add | إضافة بند | Add item |
| construction.vo.type_qty | تعديل كمية | Modify qty |
| construction.vo.type_price | تعديل سعر | Modify price |
| construction.vo.reason | السبب | Reason |
| construction.vo.impact | الأثر على قيمة العقد | Impact on contract value |
| construction.vo.reduce_warn | تخفيض أقل من المنفّذ — تعارض مع مستخلص سابق | Reduction below executed — conflicts with a prior claim |

### 5.6 Acceptance
Approving a VO versions the BOQ and updates contract value; approved VOs are non-deletable; new items appear in the next claim.

---

## 6) Screen — Progress Claim editor (`/projects/:id/claims/new`) [S5] — the heart

### 6.1 Purpose
Issue a periodic claim computed from cumulative executed quantity. All arithmetic is automatic; the contractor enters **cumulative executed qty only**.

### 6.2 Header
claim_no (auto, per project) · previous claim ref · date · period · status (draft→submitted→approved→invoiced→collected).

### 6.3 Main table (spine)
Pulls **all BOQ items** (latest version, post-VO) with history:
| column | source |
|---|---|
| item / description / unit | BOQ |
| contract qty | BOQ (post-VO) |
| unit price | BOQ |
| **prev executed qty** | previous claim (read-only) |
| **cumulative executed qty** | **input** |
| cumulative % | derived (shown next to qty) |
| cumulative value | derived = cum qty × price |
| prev value | derived |
| **current value** | derived = cumulative − prev |

Section headers show for grouping. **Validation live:** cumulative < prev → block; cumulative > contract qty → block/alert (needs VO).

### 6.4 Live summary panel (transparency core)
Recomputes on every edit, same logic as the S3 preview:
```
Σ current work value        ← Σ current_value
− retention (rate, capped)  ← honors retention cap
− advance recovery          ← auto-capped at remaining; manual override available
− manual deductions[]       ← inline table (memo + amount): LDs / penalties / other
= net before VAT
+ VAT (on current work value, NOT on net)
= net payable
```
Context indicators: accumulated retention after this claim · total advance recovered · advance remaining. **Advance recovery = min(recovery_pct × gross, remaining advance)** + a **manual override** to accelerate recovery in a given claim.

### 6.5 Flow & posting
Save draft → **submit** (locks input, routes to approver: client/consultant/manager) → **approve** ⇒ **auto journal** (revenue + retention liability + advance recovery + VAT + AR) + **tax invoice on ETA** (VAT base = current work value; same Sales pipeline) → **collect** (receipt voucher, inherited). Retention accrues to S7; advance recovered updates.

### 6.6 Print/export
Official **claim document** (PDF): item table (cumulative/prev/current) + deductions/retention/VAT summary + signatures. This is a real document handed to the client/consultant.

### 6.7 Five states
First claim → prev = 0 for all items. Empty (no approved BOQ) → block + "approve the BOQ first." Offline → input + save draft local; approval + ETA online. **ETA rejected** → claim stays "approved" with a "rejected" badge + colloquial reason + resend (inherited ETA panel).

### 6.8 Responsive / Permissions
Desktop table + docked summary; **mobile:** summary as a sticky bottom sheet, table horizontally scrollable, one item per card option. `construction.claim.create`; approve = `construction.claim.approve` (SoD: separate from create where possible).

### 6.9 AR / EN
| key | AR | EN |
|---|---|---|
| construction.claim.title | المستخلص | Progress claim |
| construction.claim.prev_qty | المنفّذ سابقاً | Prev executed |
| construction.claim.cum_qty | المنفّذ التراكمي | Cumulative executed |
| construction.claim.cum_pct | النسبة التراكمية | Cumulative % |
| construction.claim.current_value | قيمة الفترة الحالية | Current period value |
| construction.claim.gross | إجمالي الأعمال الحالية | Current work total |
| construction.claim.retention | المحتجز | Retention |
| construction.claim.advance_recovery | استرداد الدفعة | Advance recovery |
| construction.claim.deduction | خصم | Deduction |
| construction.claim.net_payable | صافي المستحق | Net payable |
| construction.claim.no_backward | لا يمكن أن يقل الإنجاز عن السابق | Progress can't go below previous |

### 6.10 Acceptance
current = cumulative − prev per item; retention honors the cap; advance recovery auto-caps at remaining with manual override; VAT computes on current work value; approval posts a journal + issues an ETA tax invoice; official claim PDF prints.

---

## 7) Screen — Progress claims register (`/projects/:id/claims`) [S6]

Spine table (compact, sticky header, filter). Columns: claim no · period/date · **current work value** · retention · advance recovery · deductions · VAT · **net payable** · **collected/outstanding** (Accounting) · status (+ ETA badge). **Totals row** = cumulative contract position. Drill-down → S5 (approved = read-only + print).
Top KPI strip: total billed · total collected · total retained · remaining-to-bill.
**Tools:** filter (status/period/ETA state); export PDF/Excel; **`+ new claim`** — enabled only if no open draft (**one draft at a time, v1**).
**Five states:** empty ("no claims yet" + issue first) · open-draft banner · ETA-rejected rows flagged · offline "as of last sync."
**Permissions:** `construction.claim.view`. **AR/EN:** `construction.claims.title`="المستخلصات"/"Progress claims", `construction.claims.billed`="المفوتر"/"Billed", `construction.claims.collected`="المحصّل"/"Collected", `construction.claims.remaining`="المتبقّي للفوترة"/"Remaining to bill".
**Acceptance:** totals reconcile to per-claim sums; one open draft max; drill-down opens the claim; rejected ETA reachable for resend.

---

## 8) Screen — Retention + release (`/projects/:id/retention`) [S7]

### 8.1 Summary (KPIs)
Accumulated retained (Σ from approved claims) · released to date · outstanding held · rate/cap (from S3) + "at cap?" indicator.

### 8.2 Accrual table
Row per claim (claim no · its work value · retained from it · running accumulated). Read-only, drill-down.

### 8.3 Releases
Table of executed releases (date · stage · amount · status · voucher ref). **`+ new release`** → amount (system suggests per S3 template, editable) · stage (initial_handover / warranty_end / other) · date · reason/attachment. Validation: amount > outstanding → block. Approve → **auto journal** (reduce retention liability) + **payment voucher** to client (return retention).

### 8.4 Time alerts (context)
Warranty release due: **warranty start = date of the initial-handover release** + warranty months (from S3). When elapsed and retention still held → alert "warranty retention due for release since [date]"; also surfaces as a pill in S1.

### 8.5 States / Permissions / AR-EN
Empty ("retention appears after your first claim") · at-cap banner ("cap reached — future claims won't retain") · offline (release prefers online). `construction.retention.release`.
| key | AR | EN |
|---|---|---|
| construction.retention.accumulated | المحتجز المتراكم | Accumulated retention |
| construction.retention.released | المُفرج | Released |
| construction.retention.outstanding | المتبقّي محجوز | Outstanding held |
| construction.retention.release_new | إفراج جديد | New release |
| construction.retention.stage_initial | استلام ابتدائي | Initial handover |
| construction.retention.stage_warranty | نهاية الضمان | Warranty end |
| construction.retention.due | محتجز الضمان مستحق الإفراج | Warranty retention due |

### 8.6 Acceptance
Accumulated retention = Σ retained across claims; release blocked above outstanding; approving a release posts a journal + payment voucher; warranty alert keys off the initial-handover date.

---

## 9) Screen — Subcontract + sub-claim (`/projects/:id/subcontracts`) [S8]

### 9.1 Subcontract
Subcontractor = **supplier variant** (inherited Purchasing) or new. **Sub-BOQ** = same S2 editor (here `unit_price` = **our cost paid to the sub**). Sub-BOQ items may be **copied** from the main BOQ as a starting point (**copy, not live link — v1**) or entered independently. Terms = same S3 (sub retention + sub advance + recovery).

### 9.2 Sub progress claim (mirror of S5)
Identical engine to S5 (cumulative qty → current = cumulative − prev → retention − advance recovery − deductions + VAT). **Only the output differs:**
- Output = **payment voucher / AP** (not a tax invoice).
- Journal posts to **AP** (liability to us).
- Retention = **held by us from the sub** — a liability we release later (mini S7 inside the subcontract).
- The sub's tax invoice (if VAT-registered) → **input VAT** (deductible; inherited Purchasing/ETA — no new logic).

### 9.3 List + cost link
Subcontracts tab table: subcontractor · contract value · paid · retained-from-sub · outstanding · status. **Approved sub-claims = part of actual cost** (the "subcontract" line in S9 breakdown).

### 9.4 States / validation / AR-EN
Empty ("no subcontractors on this project" + add) · same S5 validations · **margin alert:** sub value for an item > that item's main BOQ value → "subcontract costs more than your sell price — this item is a loss" (real analytic value). Offline: create local; approval + payment online.
| key | AR | EN |
|---|---|---|
| construction.sub.title | مقاولو الباطن | Subcontractors |
| construction.sub.contract | عقد باطن | Subcontract |
| construction.sub.boq | نطاق الباطن | Sub-BOQ |
| construction.sub.claim | مستخلص باطن | Sub progress claim |
| construction.sub.voucher | سند صرف | Payment voucher |
| construction.sub.copy_from_main | نسخ بنود من العقد الرئيسي | Copy items from main BOQ |
| construction.sub.loss_warn | الباطن أغلى من سعر بيعك | Sub costs more than your sell price |

### 9.5 Permissions / Acceptance
`construction.subcontract.manage`. Acceptance: sub-claim mirrors the main claim engine but outputs a payment voucher + AP; sub-retention held and releasable; approved sub-claims flow into actual cost.

---

## 10) Screen — Actual vs Estimated (`/projects/:id/profitability`) [S9]

### 10.1 Header KPIs
Revenue billed (Σ approved claim work value) · **actual cost** (ledger, project cost center) · **actual profit** (+ margin %) · **vs estimated** (estimated profit from Cost Budget) with a colored variance indicator.

### 10.2 Pivot — phase by phase (core, Option A)
| phase | estimated cost | actual cost | variance | variance % | % complete | flag |
|---|---|---|---|---|---|---|
Positive variance (actual > estimated) = **red** (leakage); negative = green (saved). **Drill-down on any actual cell** → cost components → source documents (visual-trust, every number traceable). `% complete` contextualizes partial phases.

### 10.3 Breakdown
Per phase (or project): actual split into **materials** (inventory issues) · **labor** (time-log/HR) · **subcontract** (S8 claims) · **direct/equipment** (Accounting), vs the estimated breakdown from Cost Budget (if entered).

### 10.4 Extra indicators
Progress-vs-spend (spent 70% of budget at 50% executed → "spending faster than execution"). **Approximate forecast:** if the current cost rate holds, projected closing profit ≈ X (simple linear projection, **clearly labeled "approximate"** — not full EVM).

### 10.5 States / Permissions / AR-EN
Empty ("profitability appears once you spend/bill") · no Cost Budget → estimated columns empty + prompt to S2; actual still shows · offline "as of last sync." `construction.profitability.view` (typically owner/manager — SoD governance).
| key | AR | EN |
|---|---|---|
| construction.profit.title | الربحية (فعلي مقابل مقدّر) | Profitability (actual vs estimated) |
| construction.profit.revenue | الإيراد المفوتر | Revenue billed |
| construction.profit.actual_cost | التكلفة الفعلية | Actual cost |
| construction.profit.est_cost | التكلفة المقدّرة | Estimated cost |
| construction.profit.variance | الانحراف | Variance |
| construction.profit.complete | نسبة الإنجاز | % complete |
| construction.profit.forecast | توقّع تقريبي | Approximate forecast |
| construction.profit.materials | خامات | Materials |
| construction.profit.labor | عمالة | Labor |
| construction.profit.subcontract | باطن | Subcontract |

### 10.6 Acceptance
Phase pivot compares Cost Budget estimate to ledger-derived actual; every actual cell drills to source docs; forecast is labeled approximate; feeds Reports + owner WhatsApp digest.

---

## 11) Screen — Project workspace facet (`/projects/:id`) [S1]

The FE_16 project hub, **extended** when `construction.enabled` + `mode="construction"`.
- **Header additions (over inherited):** four KPI pills — **contract value** (BOQ + VOs) · **billed to date** (Σ claims) · **retention held** · **remaining to bill** (`tabular-nums`) + overall completion (value-weighted average of BOQ items).
- **Overview tab additions:** contract financial position card (contract value → billed → collected → retention → advance outstanding → net remaining) · latest-claim card (+ `new claim`) · alerts card (retention due · advance not yet recovered · pending VO).
- **Empty (no BOQ yet):** onboarding card "start: enter BOQ items per phase" → CTA to S2.
- **Offline:** "as of last sync."
**Permissions:** `construction.project.view`. **AR/EN:** `construction.hub.contract_value`="قيمة العقد"/"Contract value", `construction.hub.billed`="المفوتر"/"Billed", `construction.hub.retention`="المحتجز"/"Retention held", `construction.hub.remaining`="المتبقّي"/"Remaining".

---

## 12) Module-wide states, RTL, integrations, performance

- **Feature-flag-aware:** all construction routes/tabs render only under `construction.enabled` + `mode="construction"`; with the flag off, FE_16 is unchanged. Consumers (material issue, labor log, subcontract) tolerate the module's absence.
- **Cost center = project/phase:** activate the free cost centers already provisioned by Accounting — no new logic.
- **Offline-first:** BOQ edit, VO create, claim draft, sub-claim draft all work local (`local/syncing/synced`); approvals, ETA submit, and vouchers prefer online.
- Western digits + `tabular-nums`; `ج.م`; percentages LTR within RTL (bidi tested); arrows mirror; claim PDF is RTL.
- **Integrations:** Inventory (issue → material actual), HR (time-log → labor actual), Accounting (cost centers, auto-post, AR/AP, vouchers, ledger — consume only), Sales/ETA (claim → tax invoice; VAT base = current work value), Purchasing (supplier → subcontractor, AP, input VAT), Reports + WhatsApp (project profitability digest).
- **Performance:** claim table paginated by phase; summary panel memoized; profitability from cached ledger aggregates (S9 reads pre-computed, not raw); BOQ import streamed.
- **Open point (flagged, provisional):** VAT-base treatment on claims (VAT on current work value; retention/advance affect net only) — confirm with a tax accountant, same status as the ETA connector decisions.

## 13) Permissions (input to FE_08)
`construction.project.view` · `construction.boq.edit` · `construction.contract.edit` · `construction.contract.terms_override` (elevated) · `construction.vo.create` · `construction.vo.approve` · `construction.claim.create` · `construction.claim.approve` · `construction.retention.release` · `construction.subcontract.manage` · `construction.profitability.view`.
> **SoD note:** create vs approve separated for claims and VOs; profitability + terms_override lean governance (owner/manager), consistent with the core SoD model.

## 14) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Project facet | S1 hub | ✓ | ✓ | project.view | ✓ |
| BOQ Item + Cost Budget | S2 editor | ✓ | ✓ | boq.edit | ✓ |
| Contract terms | S3 | ✓ | ✓ | contract.edit/override | ✓ |
| Variation Order | S4 + register | ✓ | ✓ | vo.create/approve | ✓ |
| Progress Claim + lines | S5 editor, S6 register | ✓ | ✓ | claim.create/approve | ✓ |
| Retention + release | S7 | ✓ | ✓ | retention.release | ✓ |
| Subcontract + sub-claim | S8 | ✓ | ✓ | subcontract.manage | ✓ |
| Actual vs Estimated | S9 | ✓ | ✓ | profitability.view | ✓ |

## 15) Module acceptance criteria
1. Construction UI appears only under the flag + `mode="construction"`; FE_16 unchanged when off.
2. Contract value = Σ BOQ + approved VOs; BOQ locks after approval (edits via VO); approved VOs non-deletable + versioned.
3. A claim computes `current = cumulative − prev` per item; retention honors the cap; advance recovery auto-caps at remaining with manual override; VAT on current work value.
4. Approving a claim posts a journal and issues an ETA tax invoice; the official claim PDF prints.
5. Retention accumulates from claims; release is manual/two-stage; warranty alert keys off the initial-handover date.
6. Subcontracts mirror the claim engine on the AP side (payment voucher + AP + sub-retention); sub-claims flow into actual cost.
7. Profitability compares per-phase estimated (Cost Budget) vs ledger-derived actual with drill-down; forecast labeled approximate.
8. One open claim draft max; everything RTL via i18n keys with all 5 states; EGP + `tabular-nums`.

**Fixtures:** `Flexova_FE_17_Construction.fixtures.json` (Egyptian context — a 5-floor residential building: phases عظم/مباني+محارة/تشطيبات; BOQ with sell + estimated cost; one approved VO; contract terms with retention cap + advance; two progress claims demonstrating cumulative logic, the **retention cap hit** and **advance fully recovered** on claim 2; retention accrual; one electrical **subcontract** with a sub-claim; per-phase actual-vs-estimated with breakdown + approximate forecast).

*End of FE_17 Construction — version 1.0*
