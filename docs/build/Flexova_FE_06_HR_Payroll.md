# Flexova — FE_06 HR & Payroll (build-ready)

> **Phase 4 — Core module 6.** Simple operational HR face + an optional statutory layer; a payroll engine that auto-posts to Accounting. Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — June 2026
> **Source of truth (do not redefine):** `Flexova_SPEC_EN_06_HR_Payroll` + `Flexova_UIUX_06_HR_Payroll` · `Flexova_FE_00_Foundation` · `Flexova_FE_04_Accounting` (payroll entry, advance disbursement, liabilities) · `Flexova_FE_05_CRM` / `Flexova_FE_02_Sales_ETA` (commission base = salesperson-tagged txn).
> **Governing principle — "simple payroll, formal as an optional layer":** the owner sees who works, attendance, salary, advances, "run this month's payroll" — not tax brackets or insurance shares. The **statutory layer (salary tax + social insurance) is OFF by default**; statutory rates/brackets are **versioned config tables (ETA-style), never hard-coded**.
> **Golden rules (carried):** (1) A payroll run posts **one balanced entry** to Accounting automatically. (2) Edits after approval create **reversing entries (never delete)**. (3) Commissions accrue on the **collected** base by default. (4) Per-branch numbering; EGP only.
> **Retroactive wiring:** resolves the FE_05 §12 handoff — commission rules pull from Sales/CRM **salesperson-tagged transactions**.

---

## 0) Module scope (recap)

**In v1:** employees, attendance, pay components, commissions, advances/loans, payroll runs, payslips, optional statutory (salary tax + social insurance) as versioned tables.
**Out (later):** automated statutory amounts as fixed law values (kept as config; actual numbers are a finance/legal input at enablement), employee self-service portal, biometric devices, deep shift scheduling (services sector).

Feeds Accounting (payroll entry, advance disbursement, tax/insurance liabilities). Reads commission base from Sales/CRM. Data via `lib/mock/client.ts` reading `hr.fixtures.json`. **No ETA integration** (payroll is outside e-invoice scope).

---

## 1) Statutory layer toggle (the optional formal face)

`hr.statutory.enabled` (tenant). When **off** (default): no tax/insurance fields on employees, no statutory deductions in payroll, statutory settings hidden. When **on**: employee statutory fields appear, the active **versioned table** applies from the next run, and payroll deducts tax + employee insurance share and posts employer share as expense + liability. Actual figures are injected via the versioned table at enablement (open point — not hard-coded).

---

## 2) Routes & IA

Mounts under shell nav `nav.hr`. Secondary **Tabs** below `PageHeader`.

```
/hr                              → redirect → /hr/dashboard
/hr/dashboard                    → HR dashboard                    [§4]
/hr/employees                    → Employees list                  [§5]
/hr/employees/new                → Add employee                    [§5]
/hr/employees/:id                → Employee card                   [§5]
/hr/attendance                   → Attendance grid                 [§6]
/hr/advances                     → Advances / loans                [§7]
/hr/payroll                      → Payroll runs list               [§8]
/hr/payroll/new                  → Payroll run wizard              [§8]
/hr/payroll/:id                  → Payroll run review / view       [§8]
/hr/commissions                  → Commissions (rules + report)    [§10]
/hr/settings/statutory           → Statutory settings (conditional)[§11]
```

**Secondary tabs:** Employees · Attendance · Advances · Payroll · Commissions. (Statutory under admin/gear, only if enabled.)
**Modals/drawers:** Grant advance/loan (modal, §7) · Payroll run wizard (full-height drawer, §8) · Manual line-edit (inline + reason, §8) · Payslip preview/share (modal, §9) · Approve run (`AlertDialog`, §8).
**i18n namespace:** `hr`. AR default, EN mirror. Simple mode uses colloquial labels; statutory terms appear only when enabled.

---

## 3) Payroll engine (the heart — auto-posts to Accounting)

Per employee in a run:
```
gross       = base + allowances + earned commissions + overtime
deductions  = advance/loan installments + absence/late + (tax + insurance — if statutory on)
net         = gross − deductions
```
**Auto-posting (shown to accountant in FE_04 journal):** Dr wages / Cr net-payable·treasury; employer insurance share → expense + liability; withheld tax/insurance → liabilities; advance grant → Cr treasury / Dr employee-advances (cleared on deduction). **Reversal, never delete.** A run in a `closed` accounting period is rejected.

---

## 4) Screen — HR dashboard (`/hr/dashboard`)

**KPIs (`KpiCard`):** active headcount · monthly payroll cost · outstanding advances · accrued commissions · today's absences.
**Alerts band:** "Payroll not run this month" · "Advances over threshold". 
**Quick actions:** `+ employee` · `run payroll` · `grant advance`.
**States:** loading (skeleton) · empty (new tenant: "add your first employee") · error · offline (banner "as of last sync"). **Permissions:** `hr.employee.view`.
**AR/EN:** `hr.dash.headcount`="عدد الموظفين"/"Headcount", `hr.dash.payroll_cost`="تكلفة الرواتب الشهرية"/"Monthly payroll cost", `hr.dash.advances`="السلف القائمة"/"Outstanding advances", `hr.dash.commissions`="عمولات مستحقّة"/"Accrued commissions", `hr.dash.absences`="غياب اليوم"/"Today's absences", `hr.dash.no_run`="لم يُشغَّل مسير لهذا الشهر"/"Payroll not run this month".
**Acceptance:** KPIs aggregate from posted data; "payroll not run" alert appears when no run exists for the current month.

---

## 5) Employees list + card (`/hr/employees`, `/new`, `/:id`)

### 5.1 List
`PageHeader`: `+ employee` · export. Search (name/phone); filters: branch, employment_type, status. Columns: name · title · type · salary · **advance balance** (`tabular-nums`) · status pill · actions (view/payslips/grant-advance).

### 5.2 Add/edit (`/new`, `/:id/edit`)
Fields: name ✱ · phone ✱ · employment_type ✱ (monthly/daily/hourly/commission — segmented) → **type-appropriate salary structure** reveals (monthly: base; daily: day rate; hourly: hourly rate; commission: base + commission rule link) · branch ✱ · title · pay components (repeater: allowance/bonus/deduction, fixed/variable) · linked_user (optional employee↔user) · status. **Statutory fields (tax/insurance IDs) appear only if §1 enabled.**

### 5.3 Employee card (`/:id`)
Header: name/title/type/branch. Tabs: Data + salary structure · Attendance (this employee) · Advances/loans (+ remaining + schedule) · Payslip history (shareable) · Statutory (if on).

### 5.4 States / Permissions
All 5; offline (created local). `hr.employee.view/manage`.
**AR/EN:** `hr.employees.title`="الموظفون"/"Employees", `hr.employee.new`="موظف جديد"/"New employee", `hr.employee.type`="نوع التوظيف"/"Employment type", types: "شهري|يومية|بالساعة|عمولة"/"Monthly|Daily|Hourly|Commission", `hr.employee.salary_structure`="هيكل الراتب"/"Salary structure", `hr.employee.advance_balance`="رصيد السلف"/"Advance balance".
**Acceptance:** salary structure adapts to type; statutory fields appear only when the layer is on.

---

## 6) Attendance (`/hr/attendance`)

Monthly/weekly **grid** (employees × days). Cell states (semantic colors): present / absent / leave / overtime / late. **Batch entry** (set a column/row at once); per-employee summary (days present, absences, overtime hours). Feeds deduction/overtime in the run.
**States:** all 5; **offline:** check-in/attendance stored local then syncs (`local/syncing/synced`). **Permissions:** `hr.attendance.manage`.
**AR/EN:** `hr.attendance.title`="الحضور"/"Attendance", states "حاضر|غائب|إجازة|إضافي|تأخير"/"Present|Absent|Leave|Overtime|Late", `hr.attendance.batch`="إدخال بالدفعة"/"Batch entry".
**Acceptance:** batch entry works; summary feeds payroll deductions/overtime; offline entry syncs.

---

## 7) Advances / loans (`/hr/advances`)

Outstanding list: employee · type (advance/loan) · amount · **remaining** · installment schedule · status. `grant` modal: amount ✱ + type (one-shot advance / loan installments + count) → **approve** (needs `hr.advance.approve`) → **instant treasury disbursement (auto-post: Cr treasury / Dr employee-advances)** → scheduled deduction in upcoming run(s).
**States:** all 5; empty ("no outstanding advances"). **Permissions:** request `hr.advance.request`; approve+disburse `hr.advance.approve` (sensitive).
**AR/EN:** `hr.advance.title`="السلف والقروض"/"Advances & loans", `hr.advance.grant`="منح سلفة"/"Grant advance", `hr.advance.one_shot`="مرة واحدة"/"One-shot", `hr.advance.installments`="أقساط"/"Installments", `hr.advance.remaining`="المتبقّي"/"Remaining".
**Acceptance:** granting disburses from treasury immediately (auto-post) and schedules deduction in the next run.

---

## 8) Payroll run (`/hr/payroll`, `/new`, `/:id`) — central screen

### 8.1 List
Runs: no (per-branch) · period · scope (branch/all) · status pill (draft/approved/posted) · total net · actions (open/payslips/reverse).

### 8.2 Run wizard (`/new`)
Steps: (1) select **period + scope** (branch/all). (2) engine pulls attendance + components + **collected commissions** + installments and computes per employee. (3) **Review table** — `tabular-nums`: employee · gross · deductions · net · (manual-edit flags). Lines editable **with permission** (`hr.payroll.run`), each edit tagged + reason. Totals row. (4) **Approve** (`AlertDialog`, sensitive, `hr.payroll.approve`) → generates payslips + **posts one balanced entry to Accounting** + records net as payable/expense → status `posted`.

### 8.3 Critical states
- **Closed accounting period:** block + suggest open period / request reopen.
- **Missing attendance:** warn before run ("3 employees lack attendance this month").
- **Negative net** (deductions > gross via large advances): **soft-block** + suggest deferring an installment.
- All 5 data states; offline = online back-office process (run requires connection).

### 8.4 Permissions
`hr.payroll.run` (build/edit), `hr.payroll.approve` (approve — sensitive). Manual line-edit gated.

### 8.5 AR / EN
| key | AR | EN |
|---|---|---|
| hr.payroll.title | مسير الرواتب | Payroll |
| hr.payroll.new | تشغيل مسير | Run payroll |
| hr.payroll.period | الفترة | Period |
| hr.payroll.gross | الإجمالي | Gross |
| hr.payroll.deductions | الاستقطاعات | Deductions |
| hr.payroll.net | الصافي | Net |
| hr.payroll.status.draft | مسودة | Draft |
| hr.payroll.status.approved | معتمَد | Approved |
| hr.payroll.status.posted | مرحّل | Posted |
| hr.payroll.approve_confirm | الاعتماد سيُرحّل قيد المرتبات للحسابات ولا يُحذف. متابعة؟ | Approving posts the payroll entry to Accounting and can't be deleted. Continue? |
| hr.payroll.missing_attendance | {{n}} موظفين بلا بيانات حضور لهذا الشهر | {{n}} employees lack attendance this month |
| hr.payroll.negative_net | الصافي سالب — اقترح تأجيل قسط سلفة | Net is negative — consider deferring an advance installment |

### 8.6 Acceptance
A run computes gross/deductions/net per employee and posts one balanced entry to Accounting; closed-period run blocked; missing-attendance warned; negative-net soft-blocked; edits after approval create reversing entries.

---

## 9) Payslip (`/hr/payroll/:id` → per employee)

Clear additions/deductions/net, company identity, period. Shareable via **WhatsApp** (consistent with CRM) or batch PDF print. **Simple mode** uses colloquial labels (e.g. "إضافات/خصومات/الصافي") instead of accounting terms.
**Permissions:** `hr.payslip.view`.
**AR/EN:** `hr.payslip.title`="قسيمة الراتب"/"Payslip", `hr.payslip.additions`="إضافات"/"Additions", `hr.payslip.share_wa`="مشاركة واتساب"/"Share via WhatsApp".
**Acceptance:** payslips are shareable via WhatsApp/PDF with clear gross/deductions/net.

---

## 10) Commissions (`/hr/commissions`)

**Rule management:** % or amount on sale/service; base **collected (default)** / invoiced; tiered. Source = **salesperson tag on the transaction** (from Sales/CRM). Ready patterns for later sectors: salon (amount/service), doctor (amount/visit or %), teacher (%/group), rep (% on collected).
**Accrued/paid report:** per employee + period, each line linked to the source transaction.
**States:** all 5. **Permissions:** `hr.commission.manage`.
**AR/EN:** `hr.commission.title`="العمولات"/"Commissions", `hr.commission.base`="أساس الاحتساب"/"Base", `hr.commission.collected`="المُحصَّل"/"Collected", `hr.commission.invoiced`="المفوتر"/"Invoiced", `hr.commission.accrued`="مستحقّة"/"Accrued".
**Acceptance:** commissions accrue from salesperson-tagged transactions on the configured base (collected default); report links to source txns.

---

## 11) Statutory settings (`/hr/settings/statutory`) — conditional

Hidden unless `hr.statutory.enabled` (§1). Enable/update **versioned** salary-tax brackets + insurance shares/ceilings (ETA-style table with an active version + effective date), link employee statutory data. Applied from the next run.
**Permissions:** `hr.statutory.config` (elevated). Actual figures = finance/legal input at enablement.
**AR/EN:** `hr.statutory.title`="الإعدادات القانونية"/"Statutory settings", `hr.statutory.tax`="ضريبة كسب العمل"/"Salary tax", `hr.statutory.insurance`="التأمينات الاجتماعية"/"Social insurance", `hr.statutory.version`="إصدار الجدول الساري"/"Active table version".
**Acceptance:** statutory deductions apply only when enabled, using the active versioned table; figures are configurable, never hard-coded.

---

## 12) Module-wide states, RTL, integrations, performance

- Critical states (§8.3) module-wide: closed period block, missing attendance warn, negative net soft-block.
- **Offline:** attendance/check-in stored local then syncs; payroll run is an online back-office process.
- Western digits + `tabular-nums`; `ج.م`; EGP only; per-branch numbering; reversal not delete.
- **Integrations:** Accounting (payroll entry, advance disbursement, tax/insurance liabilities — out), Sales/CRM (commission base — in), POS (later: cashier shift↔employee), WhatsApp (payslips — out), Reports (labor cost, commissions, attendance — out). No ETA.
- **Performance:** payroll computed in batch per run; commission accrual from indexed txn tags; payslip generation async.

## 13) Permissions (input to FE_08)
`hr.employee.view/manage` · `hr.attendance.manage` · `hr.advance.request` · `hr.advance.approve` (sensitive) · `hr.commission.manage` · `hr.payroll.run` · `hr.payroll.approve` (sensitive) · `hr.payslip.view` · `hr.statutory.config` (elevated) · `hr.export`.

## 14) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Employee | list, card, add/edit | ✓ | ✓ | employee.* | ✓ |
| Pay component | within employee form | ✓ | ✓ | employee.manage | ✓ |
| Attendance | grid, batch | ✓ | ✓ | attendance.manage | ✓ |
| Commission rule | rules + report | ✓ | ✓ | commission.manage | ✓ |
| Advance/Loan | list, grant modal | ✓ | ✓ | advance.request/approve | ✓ |
| Payroll run | list, wizard, review | ✓ | ✓ | payroll.run/approve | ✓ |
| Payslip | per-employee, share | ✓ | ✓ | payslip.view | ✓ |
| Statutory tables | settings (conditional) | ✓ | ✓ | statutory.config | ✓ |

## 15) Module acceptance criteria
1. A payroll run computes gross/deductions/net per employee and posts one balanced entry to Accounting.
2. Commissions accrue from salesperson-tagged transactions on the configured base (collected default).
3. Granting an advance disburses from treasury immediately and schedules deduction in the next run.
4. Statutory deductions apply only when the layer is enabled, using the active versioned table.
5. Edits after approval create reversing entries (no deletion).
6. Payslips are shareable via WhatsApp/PDF.
7. Run blocked in a closed accounting period; missing-attendance warned; negative-net soft-blocked; everything RTL via i18n keys with all 5 states.

**Fixtures:** `Flexova_FE_06_HR_Payroll.fixtures.json` (Egyptian context — employees across all types, attendance grid, advances/loan with schedule, commission rules + accrued, a payroll run with a balanced auto-post entry, statutory tables off with a sample versioned table).

*End of FE_06 HR & Payroll — version 1.0*
