# Flexova — FE_14 Manufacturing (build-ready)

> **Phase 5 — Sector 6 (Brief 9 — Manufacturing & Production).** Build order after Retail/POS · F&B · Services · Repair · Wholesale.
> Version: 1.0 — July 2026
> **Reference activity:** carpentry/furniture (labels, fixtures, edge cases). The engine is generic across the six activities.
> **Source of truth (do not redefine):** `Flexova_UIUX_14_Manufacturing` · `Flexova_FE_00_Foundation` · `Flexova_FE_01_Inventory` (item_type, WIP logical warehouse, weighted-avg, movements) · `Flexova_FE_04_Accounting` (auto-posting) · `Flexova_FE_06_HR_Payroll` (direct labor + wage rate) · `Flexova_FE_12_Repair` (staged-order lifecycle + approval-gated execution).
> **Governing principle — "simple workshop by default, depth on demand":** the default is one MO + backflush at finish. Manual issue, detailed stages, and overhead sit behind an advanced mode. Two-faces pattern from the Core.
> **Golden rules (carried):** (1) balances change only via a documented **movement**; (2) each manufacturing event auto-posts a **balanced entry**; (3) edits/cancels use **reversing entries, never delete**; (4) per-branch numbering — **MO number = lot**; (5) EGP only; (6) **flag-don't-block** on material shortage; (7) feature-flag-aware (works without HR).

---

## 0) Module scope (recap)

**In v1:** BOM templates, manufacturing orders (MO) as the heart, Order BOM (frozen, editable), simple stages, material issue (backflush + manual), direct labor, simple overhead, scrap (mandatory reason), partial/full finished receipt, actual finished-product costing.
**Out (later, data-model respects):** MRP/planning, scheduling/capacity, full routing with standard time, standard cost/variance, QC, subcontracting, co/by-products, multi-level auto-explosion, variants matrix, cost centers.

Data via `lib/mock/client.ts` reading `mfg.fixtures.json`. Feeds Inventory (movements, WIP, weighted-avg) and Accounting (auto-posting). Reads labor from HR. Links MO to a Sales customer order (optional).

---

## 1) New inventory concepts consumed (not redefined)

- `item_type=manufactured` — a new item type on top of stocked/service. Output products and semi-finished components use it.
- **WIP logical warehouse** (`type=wip`, `logical=true`) — like the damaged-goods warehouse. Raw materials leave their store into WIP on issue; finished receipt drains WIP into the finished store.
- Weighted-average cost applies to all movements (from Inventory §2.7).
- `track_batch_expiry` stays flag-aware (food activity) — no new module.

---

## 2) Routes & IA

Mounts under shell nav `nav.mfg`. Secondary **Tabs** below `PageHeader`.

```
/mfg                             → redirect → /mfg/dashboard
/mfg/dashboard                   → Manufacturing dashboard          [§4]
/mfg/orders                      → MO list                          [§5]
/mfg/orders/new                  → New MO                           [§6]
/mfg/orders/:id                  → MO detail (hybrid)               [§7]
/mfg/bom                         → BOM templates list               [§8]
/mfg/bom/new                     → New BOM template                 [§8]
/mfg/bom/:id                     → BOM template editor              [§8]
```

**Secondary tabs:** Orders · BOM Templates.
**Modals/drawers:** New MO (drawer, §6) · Finished receipt (modal, §7.5) · Record scrap (modal, §7.6) · Add labor (inline, §7.3) · Manual material issue (modal, advanced, §7.3) · Approve MO (`AlertDialog`, §7).
**i18n namespace:** `mfg`. AR default, EN mirror. Carpentry labels in fixtures; UI strings generic + AR/EN below.

---

## 3) Costing & auto-posting engine (the heart)

Per MO, actual cost accumulates:
```
materials = Σ issued_qty × weighted_avg_cost   (scrapped material stays in WIP → raises unit cost)
labor     = Σ labor_entries.cost               (from HR wage rate or manual)
overhead  = fixed | materials × pct | rate × hours
total     = materials + labor + overhead
unit_cost = total ÷ Σ good_received            (order-average; partial receipts use current average)
```
**Auto-posting (shown in FE_04 journal):**
- issue → Dr WIP / Cr Inventory-Raw
- labor → Dr WIP / Cr Wages-Payable
- overhead → Dr WIP / Cr Overhead-Applied
- finished receipt → Dr Inventory-Finished / Cr WIP

Scrap has **no separate entry v1** — it remains inside WIP and is absorbed into finished unit cost. **Cancel after issue = reversing entries** (material returns from WIP to raw store).

---

## 4) Screen — Manufacturing dashboard (`/mfg/dashboard`)

**KPIs (`KpiCard`):** orders in progress · orders approved awaiting start · current WIP value · scrap value (month) · orders overdue vs customer order.
**Alerts band:** "material low for an approved order" · "order open more than X days".
**Quick actions:** `+ manufacturing order` · `+ BOM template`.
**States:** loading (skeleton) · empty (new tenant: "create your first BOM template") · error · offline (banner "as of last sync"). **Permissions:** `mfg.order.view`.
**AR/EN:** `mfg.dash.in_progress`="قيد التشغيل"/"In progress", `mfg.dash.awaiting`="بانتظار البدء"/"Awaiting start", `mfg.dash.wip_value`="قيمة تحت التشغيل"/"WIP value", `mfg.dash.scrap_month`="هالك الشهر"/"Scrap this month", `mfg.dash.overdue`="متأخّرة"/"Overdue".
**Acceptance:** KPIs aggregate from MO data; shortage alert appears for approved MOs whose Order BOM exceeds available stock.

---

## 5) Screen — MO list (`/mfg/orders`)

`PageHeader`: `+ manufacturing order` (Primary) · export. Search (number/product/customer); filters: status, product, warehouse, period, linked-to-customer.
**Columns:** number · product · qty · **received** (`tabular-nums`) · status pill · finished warehouse · customer · **running cost** · actions (open/duplicate/cancel).
**Status pills (semantic):** `draft`=neutral · `approved`=warning · `in_progress`=info · `partial`=info · `done`=success · `cancelled`=neutral.
**States:** all five reachable via `?mock=loading|empty|error|no_results|offline`.
**Permissions:** `mfg.order.view`; row cancel needs `mfg.order.create` + confirm.
**Acceptance:** received column ≤ qty; running cost matches `cost_summary.total`; three fixture cases visible (MO-0101 partial, MO-0102 approved, MO-0103 draft).

---

## 6) Screen — New MO (`/mfg/orders/new`, drawer)

Fields: **product** (manufactured item) ✱ · **qty** ✱ · from template? (select → copies Order BOM + stages) or build free · linked customer order (optional) · raw/WIP/finished warehouses · issue mode (backflush default | manual). Save → status `draft`.
**Custom-modify:** after copying a template, the Order BOM table is **editable** (add/remove/adjust lines) — a frozen copy; the template is untouched (see MO-0102: wood 2.4→3.2, mdf 1.8→2.4).
**Semi-finished warning:** if a component's item is `manufactured`, show banner "this is a manufactured item — you can make a separate order" with a link (see MO-0103 → it_door_ready).
**Permissions:** `mfg.order.create`.
**AR/EN:** `mfg.new.product`="المنتج التام"/"Finished product", `mfg.new.from_template`="من قالب"/"From template", `mfg.new.build_free`="بناء حر"/"Build free", `mfg.new.issue_mode`="وضع الصرف"/"Issue mode", `mfg.new.backflush`="آلي عند الإنهاء"/"Backflush", `mfg.new.manual`="إذن يدوي"/"Manual issue".
**Acceptance:** editing Order BOM does not mutate the template; semi-finished banner appears for manufactured components.

---

## 7) Screen — MO detail (`/mfg/orders/:id`) — **HYBRID**

### 7.0 Sticky header
MO number + status pill · product/qty/received · **running cost breakdown** (materials/labor/overhead/total) · progress bar (received/ordered) · **context buttons by status**:
`draft → Approve` · `approved → Start production` · `in_progress|partial → Receive finished` · always: `Cancel`.
Buttons **disabled without permission** + tooltip (SoD). `Approve` needs `mfg.order.approve`; `Receive finished` needs `mfg.finished.receive`.

### 7.1 Tab — Overview
product · qty · linked customer · warehouses (raw/WIP/finished) · issue mode · notes · progress. **Material-shortage banner** (flag-don't-block) if Order BOM exceeds stock — approval still allowed (see MO-0102).

### 7.2 Tab — BOM
Order BOM table: item · qty · uom · scrap % · **available in stock** (inline shortage warning). **Editable only while `draft`** (see §7.7 edit lock); read-only after approval.

### 7.3 Tab — Stages
Ordered list; per stage: name · assignee (HR employee, optional) · status (`pending → in_progress → done`) · start/end (manual) · scrap. Buttons: Start / End; **Add labor** (inline: employee + hours → cost from HR rate or manual). **Advanced:** Manual material issue for a stage (modal) when issue_mode=manual.
**Permissions:** `mfg.order.execute` for start/end + labor; `mfg.material.issue` for manual issue.

### 7.4 Tab — Cost
Breakdown: materials (actual, weighted-avg) + labor + overhead + **scrap effect** + unit cost, with **drill-down** per movement (visible trust). Numbers `tabular-nums`.

### 7.5 Modal — Finished receipt
good qty received (≤ remaining) + finished warehouse + **computed unit-cost preview** before confirm → explicit confirm (sensitive) → backflush issues raw per Order BOM (Dr WIP/Cr Raw) → finished enters store at unit cost → weighted-avg updates → status `partial`/`done` → auto-posting. **Partial receipts use current order-average cost.**
**Permissions:** `mfg.finished.receive`.

### 7.6 Modal — Record scrap
stage · qty · **reason (mandatory, from list)** · note → confirm. Effect shows immediately in Cost tab (charged to finished cost).
**Permissions:** `mfg.scrap.record`.

### 7.7 Edit lock
Order BOM editing while `draft` only. To edit after approval → return to draft (protects cost integrity). Cancel after issue → reversing entries; material returns from WIP to raw store; effect preserved.

**AR/EN (detail):** `mfg.mo.approve`="اعتماد"/"Approve", `mfg.mo.start`="بدء التشغيل"/"Start production", `mfg.mo.receive`="استلام تام"/"Receive finished", `mfg.mo.running_cost`="التكلفة الجارية"/"Running cost", `mfg.mo.scrap_effect`="أثر الهالك"/"Scrap effect", `mfg.mo.unit_cost`="متوسط تكلفة الوحدة"/"Avg unit cost", `mfg.mo.shortage`="خامة أقل من المطلوب"/"Material below required", `mfg.mo.add_labor`="إضافة عمالة"/"Add labor", `mfg.mo.record_scrap`="تسجيل هالك"/"Record scrap".

**Acceptance:**
- Sticky header shows running cost + status-driven buttons; buttons gated by permission with tooltip.
- Approve allowed while material is short (flag-don't-block banner present).
- Finished receipt previews unit cost, drains WIP, updates weighted-avg, supports partial (order-average).
- Scrap requires a reason and raises finished unit cost.
- Cancel after issue reverses movements (no delete).
- Semi-finished component (MO-0103) makeable as its own single-level order.

---

## 8) Screen — BOM templates (`/mfg/bom`, `/new`, `/:id`)

### 8.1 List
`PageHeader`: `+ BOM template`. Columns: output product · components count · default overhead · status · actions (edit/clone/archive).

### 8.2 Editor (`/new`, `/:id`)
Two tabs: **Basic** (output product ✱ · reference qty · default overhead: method + value) · **Components & stages** (components table: item · qty · uom · expected scrap % ; default stages list). Footer: `Save` · `Save as copy` · `Cancel`.
**Semi-finished flag:** component whose item is `manufactured` shows a small badge.
**Permissions:** `mfg.bom.view` / `mfg.bom.manage`.
**AR/EN:** `mfg.bom.ref_qty`="كمية الإنتاج المرجعية"/"Reference qty", `mfg.bom.overhead`="overhead افتراضي"/"Default overhead", `mfg.bom.expected_scrap`="هالك متوقّع"/"Expected scrap", `mfg.bom.stages`="مراحل افتراضية"/"Default stages".
**Acceptance:** template clone produces an independent copy; editing a template never mutates existing MOs (they hold frozen Order BOMs).

---

## 9) Permissions catalog (enforced via `can(key, scope)`)

`mfg.bom.view` · `mfg.bom.manage` · `mfg.order.view` · `mfg.order.create` · `mfg.order.approve` (sensitive) · `mfg.order.execute` · `mfg.material.issue` · `mfg.finished.receive` (sensitive) · `mfg.scrap.record` · `mfg.export`.
Branch/row scope applies (from FE_08). SoD-expected: separate `mfg.order.approve` from `mfg.finished.receive`.

---

## 10) Feature-flag awareness

- **No HR module:** labor entries accept manual cost; no employee picker dependency.
- **No Sales link:** customer-order field simply hidden.
- **Food activity:** batch/expiry fields appear only if `track_batch_expiry` on the item (Inventory flag) — no new UI otherwise.
- The module is optional (flag `mfg.enabled`); consumers elsewhere must not break when absent.

---

## 11) Module acceptance criteria (gate)

1. Balances change only via movements; issue creates Raw→WIP, receipt WIP→Finished.
2. MO number = lot; per-branch numbering.
3. Backflush is default; manual issue available only in advanced/manual mode.
4. Order BOM is a frozen editable copy; templates never mutate MOs.
5. Partial receipt works at order-average cost.
6. Scrap mandatory reason; charged to finished cost; no separate entry.
7. Cancel after issue = reversing entries (no delete).
8. Approve allowed under material shortage (flag-don't-block).
9. Semi-finished component makeable as its own single-level order.
10. All five states reachable via `?mock=...`; AR default + EN mirror; RTL correct.
11. Every screen gated by real `can(key, scope)`, not placeholders.

---

*End of FE_14 Manufacturing — version 1.0*
