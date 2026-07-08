# Flexova — FE_12 Repair / Work Order (build-ready)

> **Sector pattern 4** (Brief pattern 8). Build order: after Retail/POS (FE_09), F&B (FE_10), Services (FE_11). Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — July 2026
> **Source of truth (do not redefine):** `Flexova_UIUX_12_Repair` · `Flexova_FE_00_Foundation` · **`Flexova_FE_09_Retail_POS`** (PosLayout, tender modal, e-receipt/ETA, 80mm, per-terminal numbering, flag-don't-block, five states) · **`Flexova_FE_10_FnB`** (Check→document long-lived-entity pattern) · **`Flexova_FE_11_Services`** (HR commission engine reuse) · `Flexova_FE_01_Inventory` (parts consumption, BOM flag-aware) · `Flexova_FE_04_Accounting` (auto-posting) · `Flexova_FE_05_CRM` (customer picker/quick-add) · `Flexova_FE_06_HR_Payroll` (commission rules).
> **Governing principle — "the work order is a living entity; the financial document is born only at delivery":** a Work Order lives across lifecycle stages before any financial effect, and generates the invoice/e-receipt at delivery only (Check→document pattern from FE_10).
> **Golden rules (carried):** (1) **Approval-gated** — no execution / no parts consumption before the customer approves the Quote. (2) **Parts = real inventory items** consumed via FE_01 (flag-aware); **labor = non-stock service**. (3) **flag-don't-block** — unregistered part / device without serial / item without `eta_code` → accepted + flagged, work continues. (4) **Frozen document** — after delivery, lines are immutable. (5) Payment status and ETA status are **orthogonal**.
> **Reuse, don't redefine:** PosLayout is route-scoped at `/repair/*` (top-level path, additive, inherits theme/mode/language, no shell touch). Tender modal, e-receipt/ETA hub, 80mm print, and commission posting are **imported as-is** from FE_09/FE_11.

---

## 0) Module scope (recap)

**In v1:** work order (living entity) with lifecycle (intake → diagnosis → quote+approval → execution → ready → delivery; reject path); embedded device (one per WO) with optional customer link; parts from inventory (flag-aware) + non-stock labor; **optional deposit**; simple warranty (period + zero-charge "under-warranty" WO); technician commission (HR engine); intake ticket + final document (parts+service) with orthogonal payment/ETA statuses; board tracking; workshop settings; repair reports.
**Out (later):** vehicle/asset registry + periodic service history; multi-device per WO; supplier warranty claims (RMA); customer self-tracking link; real hardware bridge (mock now).
**v1 focus:** generic device repair (mobile/electronics/computer/home-appliance); **vehicle as a device-type with optional fields** (chassis/plate/odometer).

Reads from CRM (customer), Inventory (parts + stock), HR (commission rules). Feeds Accounting (auto-posting), ETA (final document routing), Reports. Data via `lib/mock/client.ts` reading `rpr.fixtures.json`.

---

## 1) Routes & IA

Operational screens mount inside **PosLayout** (route-scoped at `/repair/*`). Settings/reports are back-office.

```
/repair                  → redirect → /repair/board
/repair/board            → Work Orders board (kanban / list)     [§3]   (PosLayout)
/repair/new              → Intake — new work order               [§4]   (PosLayout)
/repair/:id              → Work Order detail (central)           [§5]   (PosLayout)
   ↳ release modal on /repair/:id                                [§6]   (PosLayout)
/repair/settings         → Workshop settings                     [§7]   (back-office shell)
   (reports surface inside the Reports module — FE_07)           [§8]
```

**Modals/drawers:** Quick-add customer (reused from FE_05 §5.4) · Add part line (inventory picker, flag-aware) · Send quote for approval (channel picker: WhatsApp/phone/in-person) · Release + invoice (tender modal reused from FE_09) · Reject quote (`AlertDialog` + optional diagnosis fee) · Under-warranty WO create (`AlertDialog`, links original).
**i18n namespace:** `repair`. AR default, EN mirror.
**Numbering:** per-branch/terminal WO numbers (reuse FE_09 numbering util).

---

## 2) Entities (display model)

| Entity | Owner | Notes |
|---|---|---|
| Work Order | Repair | number ✱ (per-terminal), customer_id ✱ (CRM), device (embedded), status ✱ (lifecycle), technician_id, dates (intake/promise/ready/delivered), warranty_days, original_wo_id (if under-warranty), final_doc_id, deposit, notes |
| Device (embedded) | Repair | type ✱ (mobile/computer/appliance/vehicle), brand, model, serial (optional — flag if absent), intake_condition, accessories[], photos[], [vehicle optional: chassis/plate/odometer], customer_id link |
| Diagnosis | Repair | result + proposed_work |
| Quote | Repair | est. part lines + labor lines, total, approval_status (pending/approved/rejected), approval_channel (in-person/whatsapp/phone) |
| Part line | consumes Inventory | inventory item + qty + price → **deducts stock**; unregistered → ad-hoc line, `_flag: parts_adhoc` |
| Labor line | Repair | non-stock service + technician (executor) + price → commission base |
| Deposit / payment | Repair (+treasury) | **optional** advance; settled against final document |
| Intake ticket | Repair | printed at intake (custody proof) |
| Final document | → Accounting/ETA | invoice/e-receipt (parts+service), **frozen** at delivery, orthogonal payment/ETA statuses |
| Warranty | Repair | period from delivery + optional "under-warranty" WO (zero-charge, links original) |

**Validation:** customer ✱ + device.type ✱ are the only required intake fields; serial optional (flag); a WO cannot enter `in_progress` while `quote.approval_status != approved` (soft block); after `delivered`, lines locked.

---

## 3) Screen — Work Orders board (`/repair/board`)

### 3.1 Components
`PageHeader` (PosLayout top bar): `+ intake` (primary) · view toggle **kanban / list** · live clock (from PosLayout). Toolbar: search (WO no / customer / device); filters: status, technician, **overdue** (past promise date), period.
**Kanban columns** = lifecycle: pending_diagnosis · pending_approval · in_progress · ready · delivered. Card: WO no · customer · device (brand/model) · technician · promise date · status badge · **overdue flag** (danger pill if past promise).
**List (compact DataTable)** columns: WO no · customer · device · technician · status · promise date · total (`tabular-nums`, once priced) · actions (open).

### 3.2 Five states
Loading (skeleton columns) · **empty:** "no work orders yet" + `start an intake` · error · **no-results:** distinct, echoes filter · offline (banner; board cached, new intake queues `local/syncing/synced`).

### 3.3 Responsive / Permissions
Desktop kanban; mobile → status-scoped list (segmented control for status) with WO cards. `repair.wo.view` (scope: technician → own WOs, branch mgr → branch, owner → all).

### 3.4 AR / EN
| key | AR | EN |
|---|---|---|
| repair.board.title | أوامر الشغل | Work Orders |
| repair.intake.new | استلام جهاز | New intake |
| repair.status.pending_diagnosis | بانتظار الكشف | Pending diagnosis |
| repair.status.pending_approval | بانتظار الموافقة | Pending approval |
| repair.status.in_progress | قيد التنفيذ | In progress |
| repair.status.ready | جاهز للتسليم | Ready |
| repair.status.delivered | مُسلَّم | Delivered |
| repair.status.rejected | مرفوض | Rejected |
| repair.board.overdue | متأخر | Overdue |
| repair.board.promise | تاريخ الوعد | Promise date |
| repair.board.empty | مفيش أوامر شغل — ابدأ باستلام جهاز | No work orders — start an intake |

### 3.5 Acceptance
Kanban reflects lifecycle order; overdue flag fires past promise date; empty vs no-results distinct; scope applied (technician sees own).

---

## 4) Screen — Intake (`/repair/new`)

### 4.1 Components
PosLayout page, sectioned form:
- **Customer:** CRM picker (search name/phone) or **quick-add** (reused FE_05 §5.4: name+phone, <10s).
- **Device:** type ✱ (mobile/computer/appliance/vehicle) · brand · model · serial/IMEI (optional) · intake_condition (text + quick chips: scratches/no-power/screen-cracked…) · accessories[] (chips: charger/case/SIM/box) · photos[] (optional upload) · **[vehicle only, optional]** chassis / plate / odometer.
- **Reported faults:** free text.
- **Deposit (optional):** amount + treasury (no gate — skippable).
- **Assignment:** promise date + responsible technician.

### 4.2 Interactions
`save + print intake ticket` → creates WO at `pending_diagnosis`, prints 80mm **Intake Ticket** (custody proof), returns to board. Deposit (if entered) posts a treasury receipt immediately (FE_04). Vehicle fields appear only when `device.type = vehicle`.

### 4.3 Five states
Loading · **partial:** device without serial → accepted + `_flag: device_no_serial` (flag-don't-block) · error (validation on customer + device.type only) · offline (WO created local; ticket prints from cached template; deposit queues).

### 4.4 Responsive / Permissions
Desktop two-column (customer/device on `start`, faults/deposit/assignment on `end`); mobile → single column, sticky `save + print` bar. `repair.wo.create`; deposit needs `repair.deposit.take`.

### 4.5 AR / EN
| key | AR | EN |
|---|---|---|
| repair.intake.customer | العميل | Customer |
| repair.intake.device_type | نوع الجهاز | Device type |
| repair.device.mobile | موبايل | Mobile |
| repair.device.computer | كمبيوتر | Computer |
| repair.device.appliance | جهاز منزلي | Appliance |
| repair.device.vehicle | سيارة | Vehicle |
| repair.intake.serial | السيريال / IMEI | Serial / IMEI |
| repair.intake.condition | حالة الجهاز عند الاستلام | Condition at intake |
| repair.intake.accessories | الملحقات | Accessories |
| repair.intake.faults | الأعطال المبلّغة | Reported faults |
| repair.intake.deposit | عربون (اختياري) | Deposit (optional) |
| repair.intake.promise | تاريخ الوعد | Promise date |
| repair.intake.technician | الفنّي المسؤول | Technician |
| repair.intake.save_print | حفظ + طباعة إيصال الاستلام | Save + print intake ticket |
| repair.intake.no_serial | جهاز بلا سيريال — تم القبول والتعليم | Device without serial — accepted & flagged |

### 4.6 Acceptance
WO opens at pending_diagnosis; intake ticket prints; deposit optional (skippable) and posts to treasury when taken; device without serial accepted+flagged; vehicle fields conditional.

---

## 5) Screen — Work Order detail (`/repair/:id`) — central screen

### 5.1 Purpose
The whole lifecycle on one screen: identity → diagnosis → quote+approval → execution → warranty → deliver.

### 5.2 Layout
- **Header:** WO no · status badge · customer (link to CRM 360) · device summary · technician · dates. **Under-warranty** WOs show a link chip to the original.
- **Sections/tabs:**
  - **Diagnosis:** result + proposed work.
  - **Quote:** estimated part lines + labor lines · total (`tabular-nums`) · `send for approval` (channel picker) · approval badge (pending/approved/rejected).
  - **Execution:** actual **part lines** (inventory picker, flag-aware, **deduct on add**) + **labor lines** (service + executing technician). Unregistered part → ad-hoc line + correction flag.
  - **Payments:** deposit + any payments.
  - **Warranty:** period (activates at delivery); under-warranty WO → link to original + lines at zero.
- **Lifecycle action bar:** start diagnosis · send quote · approve / reject · mark ready · **deliver**.

### 5.3 Interactions
- `add part` → inventory picker (FE_01); on add, **stock deducts**; low/negative stock → warning, overridable with permission + reconciliation flag (FE_01 logic).
- `add labor` → service + technician → sets commission base (FE_06 engine).
- `send for approval` → channel picker (WhatsApp opens prefilled template / phone / in-person) → status `pending_approval`.
- `approve` (needs `repair.quote.approve`) → `in_progress`. `reject` → `AlertDialog` → optional diagnosis fee (per-tenant) → `rejected`, device released as-is.
- Entering `in_progress` blocked (soft) if quote not approved.
- `deliver` → opens Release modal (§6).

### 5.4 Five states
Loading (skeleton header+sections) · empty-ish (fresh WO: diagnosis empty, "run diagnosis to start") · error · offline (parts add queues; deduction reconciles on sync); **locked** (delivered → all lines read-only, frozen banner).

### 5.5 Responsive / Permissions
Desktop two-column (header/device on `start`, sectioned work on `end`); mobile → stacked sections + sticky lifecycle action bar. Permissions: `repair.diagnosis.manage`, `repair.quote.manage`, `repair.quote.approve` (sensitive), `repair.parts.consume`, `repair.deliver` (sensitive).

### 5.6 AR / EN
| key | AR | EN |
|---|---|---|
| repair.wo.diagnosis | الكشف | Diagnosis |
| repair.wo.proposed_work | العمل المقترح | Proposed work |
| repair.wo.quote | عرض السعر | Quote |
| repair.wo.send_approval | إرسال للموافقة | Send for approval |
| repair.wo.approve | موافقة | Approve |
| repair.wo.reject | رفض | Reject |
| repair.wo.approval_pending | بانتظار موافقة العميل | Awaiting customer approval |
| repair.wo.execution | التنفيذ | Execution |
| repair.wo.add_part | إضافة قطعة | Add part |
| repair.wo.add_labor | إضافة عمالة | Add labor |
| repair.wo.part_adhoc | قطعة غير مسجّلة — تُباع وتُعلَّم للتصحيح | Unregistered part — sold & flagged |
| repair.wo.mark_ready | جاهز للتسليم | Mark ready |
| repair.wo.deliver | تسليم | Deliver |
| repair.wo.locked | مُسلَّم — المستند مجمّد | Delivered — document frozen |
| repair.wo.warranty_link | تحت الضمان — مرتبط بأمر أصلي | Under warranty — linked to original |
| repair.wo.quote_before_exec | العرض لسه بانتظار الموافقة | Quote still awaiting approval |

### 5.7 Acceptance
No execution/parts before approval (soft block); parts deduct stock on add; ad-hoc part flagged; deliver disabled until ready; delivered WO fully locked.

---

## 6) Release + invoice (`/repair/:id` → release modal)

### 6.1 Flow
`deliver` → generate final document (parts + service) → **subtract deposit** from total → **tender modal (reused from FE_09)** (cash/mixed) → orthogonal **payment status** + **ETA status** → frozen document · e-receipt/e-invoice · 80mm print.
On success: **auto-posting** (FE_04: parts revenue + service revenue + parts COGS + deposit settlement, Σdebit=Σcredit) · **technician commission posted** (FE_06) · **warranty period starts** · status → `delivered`.

### 6.2 flag-don't-block
Item without `eta_code` → sold, printed, and **flagged** (correction queue) — never blocks delivery. ETA hub (reused from FE_02/FE_09) shows B2B (pre-clearance) / B2C (window) queues; customer type + TRN (from CRM) drive routing.

### 6.3 States / Permissions
Loading (posting) · error (tender validation) · offline (document created local, ETA/print queue, posting reconciles). `repair.deliver` (sensitive).

### 6.4 AR / EN
| key | AR | EN |
|---|---|---|
| repair.release.title | التسليم + الفاتورة | Deliver + invoice |
| repair.release.parts_total | إجمالي القطع | Parts total |
| repair.release.service_total | إجمالي الخدمة | Service total |
| repair.release.less_deposit | خصم العربون | Less deposit |
| repair.release.net | الصافي المستحق | Net due |
| repair.release.print | طباعة الإيصال | Print receipt |
| repair.release.eta_flagged | صنف بلا كود ETA — تم البيع والتعليم | Item without ETA code — sold & flagged |

### 6.5 Acceptance
Deposit subtracted; payment & ETA statuses independent; auto-posting balanced; commission posted; warranty starts; missing eta_code never blocks; document frozen post-delivery.

---

## 7) Workshop settings (`/repair/settings`) — back-office

Diagnosis fee (optional, **off by default**, amount when on) · default warranty period (days) · technician list + commission rules (**read from HR** — FE_06) · per-terminal WO numbering · WhatsApp templates (approval request / ready notice).
**States:** all 5. **Permissions:** `repair.settings.manage` (elevated).
**AR/EN:** `repair.settings.title`="إعدادات الورشة"/"Workshop settings", `repair.settings.diag_fee`="رسم الكشف"/"Diagnosis fee", `repair.settings.warranty_days`="فترة الضمان (يوم)"/"Warranty period (days)", `repair.settings.technicians`="الفنّيون"/"Technicians".
**Acceptance:** diagnosis fee off by default; warranty default applies to new WOs; commission rules read from HR (not redefined).

---

## 8) Repair reports (inside Reports module — FE_07)

Open/overdue WOs · technician productivity · avg repair time · quote approval rate · most-consumed parts · warranty cost. Data-scoped per role/branch (FE_07 rules).
**Permissions:** `repair.export` + report view scope.
**AR/EN:** `repair.reports.productivity`="إنتاجية الفنّيين"/"Technician productivity", `repair.reports.approval_rate`="نسبة الموافقة"/"Approval rate", `repair.reports.warranty_cost`="تكلفة الضمان"/"Warranty cost".

---

## 9) Module-wide states, RTL, integrations, performance

- **Unregistered part / no serial / no eta_code:** accepted + flagged (flag-don't-block), never halts the technician.
- **Quote not approved:** soft block on entering execution, clear message.
- **Negative stock on part consume:** warning; overridable with permission + reconciliation flag (FE_01).
- **Delivery in a closed accounting period:** blocked + suggest open period (FE_04 consistency).
- **Under-warranty WO:** lines zero to customer; parts still deduct stock and post as **warranty cost**.
- **Reject:** device released as-is; optional diagnosis fee; no parts/service invoice.
- **Offline:** board + intake + parts add work offline (`local/syncing/synced`); ticket/receipt print from cached templates; posting/ETA reconcile on sync.
- Western digits + `tabular-nums`; `ج.م`; serial/IMEI/chassis/plate LTR within RTL (bidi tested); arrows mirror.
- **Integrations:** CRM (customer + repair history), Inventory (parts consume, flag-aware), HR (technician commission), Accounting (auto-posting), ETA (final doc routing), WhatsApp (approval/ready/receipt), Reports.
- **Performance:** board paginated/indexed on status+promise; parts picker reuses FE_01 indexed search; commission posting idempotent on sync.

---

## 10) Permissions (input to FE_08)
`repair.wo.view` · `repair.wo.create` · `repair.wo.edit` · `repair.diagnosis.manage` · `repair.quote.manage` · `repair.quote.approve` (sensitive) · `repair.parts.consume` · `repair.deliver` (sensitive) · `repair.warranty.manage` · `repair.deposit.take` · `repair.settings.manage` (elevated) · `repair.export`.
Scope: branch/terminal/technician-own applied as usual (default-deny + row scope + SoD).

---

## 11) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Work Order | board, detail | ✓ | ✓ | wo.* | ✓ |
| Device (embedded) | intake, detail | ✓ | ✓ | wo.create/edit | ✓ |
| Diagnosis | detail | ✓ | ✓ | diagnosis.manage | ✓ |
| Quote | detail | ✓ | ✓ | quote.manage/approve | ✓ |
| Part line | detail (execution) | ✓ | ✓ | parts.consume | ✓ |
| Labor line | detail (execution) | ✓ | ✓ | quote.manage | ✓ |
| Deposit/payment | intake, detail | ✓ | ✓ | deposit.take | ✓ |
| Final document | release modal | ✓ | ✓ | deliver | ✓ |
| Warranty | detail, settings | ✓ | ✓ | warranty.manage | ✓ |

## 12) Module acceptance criteria
1. A Work Order flows intake → diagnosis → quote+approval → execution → ready → delivery, generating the financial document **only at delivery**.
2. Execution/parts consumption is blocked until the customer approves the quote.
3. Parts deduct real inventory (flag-aware); labor is non-stock and feeds commission.
4. Deposit is optional; when taken it posts to treasury and is subtracted at delivery.
5. Warranty: period starts at delivery; an under-warranty WO is zero-charge to the customer, parts still deduct stock as warranty cost.
6. Delivery auto-posts a balanced journal, posts technician commission, freezes the document; payment & ETA statuses are orthogonal; missing `eta_code` never blocks.
7. Everything RTL via `repair` i18n keys with all 5 states; board/intake work offline and reconcile on sync.
8. PosLayout route-scoped at `/repair/*`; shell/tokens untouched.

**Fixtures:** `Flexova_FE_12_Repair.fixtures.json` (mock-layer short name `rpr.fixtures.json`) — Egyptian mobile/computer repair context: WOs across all lifecycle states, an under-warranty WO linked to a delivered one, a device without serial (flag), an ad-hoc part (flag), a part without eta_code (flag), a deposit case, technicians with commission rules, inventory parts + labor services.

*End of FE_12 Repair / Work Order — version 1.0*
