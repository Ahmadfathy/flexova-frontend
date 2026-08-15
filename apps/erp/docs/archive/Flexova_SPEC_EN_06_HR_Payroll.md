# Flexova — HR & Payroll Spec (EN, build-ready)

> Layer 2, Core module 6. Simple ops face + optional statutory layer; payroll engine auto-posts to Accounting.
> Depends on: Design System, Accounting (payroll entry/advances), Sales+CRM (commission base). v1.

## 1. Scope
**In:** employees, attendance, pay components, commissions, advances/loans, payroll runs, payslips, optional statutory (salary tax + social insurance) as versioned tables.
**Out (later):** automated statutory amounts as fixed law values (kept as config), employee self-service portal, biometric devices, deep shift scheduling (services sector layer).
**Principle:** simple operational face; **statutory layer off by default** (most SMEs informal); statutory rates/brackets as **versioned config tables (ETA-style), never hard-coded**.

## 2. Entities (✱ required)

### 2.1 Employee (central)
| Field | Type | Req | Notes |
|---|---|---|---|
| name | string | ✱ | |
| phone | string | ✱ | |
| employment_type | enum | ✱ | `monthly/daily/hourly/commission` |
| salary_structure | object | ✱ | base + components by type |
| branch | ref | ✱ | |
| title | string | | |
| statutory_ids | object | | tax/insurance — only if statutory enabled |
| status | enum | | active/suspended |
| linked_user | ref | | optional employee↔user link |

### 2.2 Other entities
- **Pay Component** — fixed/variable; kind `addition/deduction` (allowance/bonus/deduction).
- **Attendance** — present/absent/leave/overtime, shift; per day/batch; feeds deduction/overtime.
- **Commission Rule** — % or amount on sale/service; base **collected (default)** / invoiced; tiered. Source = salesperson tag on txn.
- **Advance / Loan** — advance (one-shot deduction) or loan (installments); remaining balance; **disbursed from treasury on grant**.
- **Payroll Run** — period + branch/all; status `draft/approved/posted`; per-branch numbering.
- **Payslip** — gross/deductions/net per employee/period; shareable.
- **Statutory tables** — salary-tax brackets + insurance shares/ceilings, **versioned**; off by default.

### 2.3 Payroll engine (the heart)
gross = base + allowances + earned commissions + overtime; deductions = advance/loan installments + absence/late + (tax + insurance if enabled); net = gross − deductions. **Auto-posts:** Dr wages / Cr net-payable·treasury; employer insurance share → expense + liability; withheld tax/insurance → liabilities; advance grant → Cr treasury / Dr employee-advances (cleared on deduction). Reversal not delete.

## 3. Flows
- **Add employee:** name + phone + type → type-appropriate salary structure → branch → save. Statutory fields appear only if layer enabled.
- **Attendance:** simple daily/weekly entry (present/absent/leave/overtime) per employee or batch; or app/device check-in (later).
- **Grant advance/loan:** amount + (one-shot/installments) → approve (permission) → **instant treasury disbursement (auto-post)** → scheduled deduction.
- **Run payroll (key):** wizard period+scope → engine pulls (attendance+components+collected commissions+installments) → **review table** (gross/deductions/net, line-editable w/ permission) → approve → payslips + **Accounting posting** + net as payable/expense.
- **Issue/share payslip:** per employee, WhatsApp share or batch print.
- **Retro edit / re-run:** reversing entry + revised run (no delete).
- **Enable statutory (tenant setup):** pick/update active versioned table + employee statutory data → applied from next run.

## 4. Screens
- **HR dashboard:** active headcount · monthly payroll cost · outstanding advances · accrued commissions · today’s absences; alerts (“payroll not run this month”, “advances over threshold”).
- **Employees list/card:** list (name/title/type/salary/advance balance/status); card (data + structure + attendance + advances/loans + payslip history + statutory if on).
- **Attendance:** monthly/weekly grid, batch entry, semantic colors, per-employee summary.
- **Advances/loans:** outstanding list + remaining + installment schedule, grant button, settlement tracking.
- **Payroll run (hub):** wizard; review = `tabular-nums` table + totals + manual-edit flags + run-status badge; approve = sensitive (confirm + permission).
- **Payslip:** clear additions/deductions/net, company identity, WhatsApp/PDF; colloquial labels in simple mode.
- **Commissions:** rule mgmt + accrued/paid report per employee/period (linked to source txn).
- **Statutory settings (optional):** enable/update tax+insurance versioned tables; hidden unless enabled.

## 5. States
- Payroll run: `draft/approved/posted`.
- **Run in closed accounting period:** blocked + suggest open period/reopen.
- **Missing attendance:** warn before run (“3 employees lack attendance this month”).
- **Negative net** (deductions > gross via large advances): soft-block + suggest deferring an installment.
- All 5 data states per Design System §8. **Offline:** attendance/check-in stored locally then syncs; payroll run is online back-office.

## 6. Integrations
Accounting (payroll entry, advance disbursement, tax/insurance liabilities). Sales/CRM (commission base = salesperson-tagged txn, collected default). POS (later: cashier shift↔employee, check-in). WhatsApp (payslips). ETA (none v1 — payroll outside e-invoice scope). Reports (labor cost, commissions, attendance).

## 7. Performance
Payroll computed in batch per run; commission accrual queried from indexed txn tags; payslip generation async.

## 8. Decisions (v1, locked)
- Simple face + **statutory layer optional, off by default**; statutory tables **versioned/configurable** (ETA pattern).
- Payroll engine + auto-posting (not reduced). Employment types: monthly/daily/hourly/commission.
- **Commission on collected by default.**
- Advances (one-shot) + loans (installments), auto treasury disbursement.
- Per-branch numbering; EGP only; reversal not delete.
- **Actual statutory numbers** = finance/legal input injected at enablement (open point).
- Employee portal, biometric devices, deep scheduling = later.

## 9. Acceptance criteria
- A payroll run computes gross/deductions/net per employee and posts one balanced entry to Accounting.
- Commissions accrue from salesperson-tagged transactions on the configured base (collected default).
- Granting an advance disburses from treasury immediately and schedules deduction in the next run.
- Statutory deductions apply only when the layer is enabled, using the active versioned table.
- Edits after approval create reversing entries (no deletion).
- Payslips are shareable via WhatsApp/PDF.
