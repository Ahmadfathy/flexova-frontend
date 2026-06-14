# Flexova — Accounting & Finance Spec (EN, build-ready)

> Layer 2, Core module 4. Financial backbone: every operational doc **auto-posts** to a real double-entry GL.
> Depends on: Design System, Inventory (weighted-avg COGS), Sales+ETA (AR/VAT), Purchasing (AP/input VAT). v1.

## 1. Scope
**In:** chart of accounts (Egyptian template), auto + manual journal entries, cashboxes/banks/e-wallets, expenses, receipt/payment vouchers, transfers, AR/AP, bank reconciliation, fiscal periods + closing, trial balance, financial statements (P&L / Balance Sheet / Cash Flow), opening-balance wizard.
**Out (later):** automated fixed-asset register + depreciation; multi-currency; complex deferred revenue.
**Two faces (role-gated):** **simple** (owner: cash · expenses · AR/AP · cash flow) vs **accounting** (COA · journals · TB · statements · closing). Default = simple.

## 2. Entities (✱ required)

### 2.1 Journal Entry (central)
| Field | Type | Req | Notes |
|---|---|---|---|
| no | string | ✱ | **per-branch sequence** |
| date | date | ✱ | must be in an `open` period |
| lines[] | array | ✱ | each: account✱, dr/cr amount✱, memo, cost_center |
| balance | rule | ✱ | **Σdr = Σcr enforced**; reject otherwise |
| source_ref | ref | | link to source doc (invoice/bill/expense/payroll) |
| type | enum | ✱ | `auto` (locked) / `manual` |

### 2.2 Other entities
- **Chart of Accounts** — 5 roots (assets/liabilities/equity/revenue/expense), hierarchical, Egyptian template seeded at onboarding.
- **Cashbox / Bank / e-Wallet** — name✱, branch, balance(computed), currency=EGP(v1).
- **Expense** — category✱, amount✱, pay_method✱, cost_center, attachment(receipt img).
- **Receipt Voucher** — customer✱, amount✱, treasury✱, allocations[invoice,amount] (oldest-first default); overflow → **customer credit balance (on-account)**.
- **Payment Voucher** — supplier/expense, amount, treasury; partial + multiple.
- **Transfer** — from/to (treasury↔bank↔wallet), amount.
- **Cost Center** — **branch = implicit default**; free centers optional + hidden until enabled.
- **Fiscal Period** — month/year, status `open/closed`.
- **Bank Reconciliation** — statement vs system; matched / unmatched(two columns).
- **Opening Balance** — onboarding wizard → one **balanced** opening entry (treasuries/AR/AP/inventory/capital); CSV import.

### 2.3 Auto-posting engine (the heart)
sale(credit)→ Dr AR / Cr revenue+VAT-payable · sale(cash)→ Dr treasury · COGS→ Dr COGS / Cr inventory(**weighted-avg**) · purchase→ Dr inventory/expense+input-VAT / Cr AP · receipt→ Dr treasury / Cr AR · payment→ Dr AP / Cr treasury · expense→ Dr expense / Cr treasury · transfer→ Dr to / Cr from · payroll→ Dr wages / Cr payable·treasury. **Reversal, never delete.** Auto entries not directly editable (edit source or post adjusting entry). Posting into a `closed` period is rejected.

## 3. Flows
- **Expense (most-used):** +expense → icon category → amount → pay method → optional receipt img → save (<15s). Auto-posts.
- **Collect from customer:** customer → open invoices + balance → amount → auto-allocate (oldest) or manual → treasury → save → shareable receipt (WhatsApp). Updates AR.
- **Pay supplier:** mirror on AP.
- **Transfer:** from→to→amount→save.
- **Manual journal (accountant):** line grid (account/dr/cr/memo/cost_center) + **live balance indicator** (green=balanced); no save until balanced.
- **Bank reconciliation:** load statement → auto-match (amount+~date) → resolve unmatched (link/create) → closing balance ties.
- **Closing:** pre-close checklist → preview statements → **soft monthly** (reopenable) / **hard yearly** (rolls net to equity, locks; elevated permission).
- **Opening balances (onboarding):** wizard per treasury/AR/AP/inventory/capital → balanced opening entry; CSV import.

## 4. Screens
- **Finance dashboard:** KPIs (liquidity = Σ treasuries+banks+wallets · net cash flow · AR · AP · monthly expenses · est. profit) · weekly cash-flow chart · top expense categories · overdue pills.
- **Treasuries/Banks/Wallets:** balance cards → movement ledger (date/memo/in/out/running balance, compact, sticky header, date filter, export).
- **Receipt/Payment voucher:** party · date · amount · treasury · allocation grid · on-account overflow · memo · attachment.
- **Expenses:** quick-entry + list, icon categories, filters, receipt attachment.
- **Journal + manual entry (accountant):** entries table (no/date/memo/dr/cr/source), `auto` badge + locked; manual w/ live balance.
- **Trial Balance:** opening/dr/cr/closing per account + balanced totals; export.
- **Financial statements:** P&L / Balance / Cash Flow, period filter, simple↔detailed, export PDF/Excel. (Simple mode shows P&L only as “Profit & Expenses”.)
- **Bank reconciliation:** two-column match UI + progress bar.
- **Closing:** multi-step wizard + period status badge + confirm modal.

## 5. States
- Period: `open` / `closed`. Voucher pay status pills: paid / partial / on-account.
- **Unbalanced entry:** block save + colloquial message (“Dr and Cr differ by X EGP”).
- **Closed period entry:** block + suggest open period / request reopen.
- **Negative cashbox:** **soft warning** (not blocked by default; tightenable).
- All 5 data states per Design System §8. **Offline:** POS cash receipts saved locally → sync (`local/syncing/synced`); back-office reports show “pending cashier X sync”, GL never shows revenue before sync.

## 6. Integrations
Sales+ETA (AR/revenue/VAT; ETA dual-rhythm status doesn’t block posting). Purchasing (AP/input VAT). Inventory (**weighted-avg COGS, value consumed only**). HR (payroll entry, advances). Local pay (Fawry/wallets/bank). Reports (feeds central dashboards). ETA (VAT payable/deductible → return summary).

## 7. Performance
Posting async/idempotent; ledgers paginated server-side; statements from pre-aggregated balances; reconciliation matching batched.

## 8. Decisions (v1, locked)
- Two faces (simple/accounting), default simple. Full double-entry GL behind the scenes (not reduced).
- Egyptian COA template at onboarding. EGP only. Per-branch numbering. Weighted-avg COGS consumed from Inventory.
- Soft monthly close + hard yearly close (reopen = elevated permission).
- **Fixed assets:** record-as-line only; **auto-depreciation + asset register deferred** (manual adjusting entry if needed).
- **Cost centers:** optional + hidden; branch = implicit default.
- **Advances / customer credit balances:** in v1, simplified (credit balance auto-applied on next invoice).
- **Opening balances:** v1 onboarding wizard + CSV.

## 9. Acceptance criteria
- Every approved operational doc generates a **balanced** journal entry automatically.
- Σdr=Σcr is enforced; unbalanced entries cannot be saved.
- Posting into a closed period is rejected; auto entries are not directly editable (reversal only).
- Customer collection allocates to invoices (oldest-first default) and reduces AR; overflow becomes on-account credit.
- Trial balance totals tie; P&L/Balance/Cash Flow generate for any open/closed period.
- Opening-balance wizard produces a single balanced opening entry.
