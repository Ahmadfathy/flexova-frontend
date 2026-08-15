# Flexova — FE_04 Accounting & Finance (build-ready)

> **Phase 4 — Core module 4.** Financial backbone. Every approved operational doc **auto-posts** to a real double-entry GL, surfaced through **two faces** (simple/accounting). Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — June 2026
> **Source of truth (do not redefine):** `Flexova_SPEC_EN_04_Accounting` + `Flexova_UIUX_04_Accounting` · `Flexova_FE_00_Foundation` · `Flexova_FE_01_Inventory` (weighted-avg COGS, value consumed only) · `Flexova_FE_02_Sales_ETA` (AR/revenue/VAT) · `Flexova_FE_03_Purchasing` (AP/input VAT).
> **Golden rules (carried):** (1) Every approved operational doc generates a **balanced** journal entry automatically. (2) **Σdr = Σcr** is enforced; unbalanced entries cannot be saved. (3) Auto entries are **never directly edited or deleted** — correct the source doc (regenerates) or post an adjusting entry (**reversal, never delete**). (4) Posting into a `closed` period is rejected.
> **Governing principle — "two faces of one ledger":** a full double-entry GL runs behind the scenes; the **owner** sees a simple cash/AR/AP/expenses view (no "journal" / "debit/credit"), the **accountant** sees COA/journals/TB/statements/closing. Default tenant view = **simple**.

---

## 0) Module scope (recap)

**In v1:** chart of accounts (Egyptian template), auto + manual journal entries, cashboxes/banks/e-wallets, expenses, receipt/payment vouchers, transfers, AR/AP, bank reconciliation, fiscal periods + closing, trial balance, financial statements (P&L/Balance/Cash Flow), opening-balance wizard.
**Out (later):** automated fixed-asset register + depreciation, multi-currency, complex deferred revenue. (Fixed assets = record-as-line only; manual adjusting entry for depreciation.)

Consumes: Inventory (weighted-avg COGS, value only), Sales (AR/revenue/VAT-payable), Purchasing (AP/input-VAT), HR (payroll entry — later). Data via `lib/mock/client.ts` reading `accounting.fixtures.json`.

---

## 1) View modes (the governing switch — threads through everything)

`finance.viewMode` derived from role permissions: `simple` (needs `finance.view_simple`) | `accounting` (needs `finance.view_accounting`). Default tenant = `simple`. A user with both can toggle (persisted in Appearance-adjacent finance pref).

- **simple (owner):** Dashboard · Treasuries · Expenses · Receipts · Payments · Transfers. No COA, no journal, no debit/credit vocabulary anywhere. Statements reduced to "Profit & Expenses".
- **accounting:** all of the above **plus** Journal · Chart of accounts · Trial balance · Statements (full P&L/BS/CF) · Reconciliation · Closing.

The auto-posting engine runs identically in both; only its **visibility** differs. The owner never sees a journal entry; the accountant reviews/audits them.

---

## 2) Routes & IA

Mounts under shell nav `nav.accounting`. Secondary **Tabs** below `PageHeader`; the tab set depends on view mode (§1).

```
/finance                         → redirect → /finance/dashboard
/finance/dashboard               → Finance dashboard                    [§4]
/finance/treasuries              → Treasuries / Banks / Wallets grid    [§5]
/finance/treasuries/:id          → Treasury movement ledger             [§5]
/finance/expenses                → Expenses list + quick entry          [§6]
/finance/receipts                → Receipt vouchers list                [§7]
/finance/receipts/new            → Receipt voucher (collect)            [§7]
/finance/payments                → Payment vouchers list                [§8]
/finance/payments/new            → Payment voucher                      [§8]
/finance/transfers               → Transfers list                       [§9]
/finance/transfers/new           → Transfer                             [§9]
/finance/opening-balances        → Opening-balance wizard (onboarding)  [§14]
--- accounting mode only ---
/finance/journal                 → Journal entries list                 [§10]
/finance/journal/new             → Manual journal entry                 [§10]
/finance/journal/:id             → Journal entry view                   [§10]
/finance/coa                     → Chart of accounts                    [§11]
/finance/trial-balance           → Trial balance                        [§11]
/finance/statements              → Financial statements (P&L/BS/CF)     [§12]
/finance/reconciliation          → Bank reconciliation                  [§13]
/finance/closing                 → Closing wizard                       [§13]
```

**Modals/drawers:** Quick expense (modal, §6) · Collect/Pay (voucher modals, §7/§8) · Transfer (modal, §9) · Account create/edit (modal, §11) · Reopen period (`AlertDialog`, elevated) · Closing confirm (`AlertDialog`).
**Period badge:** the current fiscal period status (`open`/`closed`) is shown persistently in the module header.
**i18n namespace:** `finance`. AR default, EN mirror. Simple vs accounting wording differs by key (owner-friendly vs accounting terms).

---

## 3) Auto-posting engine (behind the scenes — visible only to accountant)

Posting rules translate each approved operational doc into a balanced entry (no user action). Shown here as reference; the UI only renders the resulting entries in the Journal (accounting mode) and the effect on balances/KPIs (both modes).

| Source event | Dr | Cr |
|---|---|---|
| Sale (credit) | AR | Revenue + VAT payable |
| Sale (cash) | Treasury | Revenue + VAT payable |
| COGS | COGS | Inventory (weighted-avg) |
| Purchase (credit) | Inventory/Expense + input VAT | AP |
| Receipt from customer | Treasury/Bank | AR |
| Payment to supplier | AP | Treasury/Bank |
| Expense (cash) | Expense (by category) | Treasury/Bank |
| Transfer (cash→bank) | Bank | Treasury |
| Payroll run (HR) | Wages expense | Payable / Treasury |

Safety rules (accountant view): every entry balanced (reject otherwise); auto entries locked to direct edit (edit source or adjusting entry); closed-period posting rejected; ETA dual-rhythm send status **does not block** posting.

---

## 4) Screen — Finance dashboard (`/finance/dashboard`)

### 4.1 Purpose
The owner's home: liquidity, what's owed to/by me, expenses, estimated profit — all without accounting jargon.

### 4.2 Components
**KPIs (`KpiCard`):** available liquidity (Σ treasuries+banks+wallets) · net cash flow (today/month) · total AR ("owed to me") · total AP ("I owe") · monthly expenses · estimated profit (simple label "estimated profit"). Western digits, `tabular-nums`.
**Charts/lists:** weekly cash-flow chart (in/out) · top-5 expense categories · overdue receivables list (warning pills).
**Quick actions:** `+ expense` · `collect` · `transfer` (the three the owner uses daily).

### 4.3 Five states
Loading (skeleton KPIs+chart) · **empty (new tenant):** zeroed cards + onboarding card "Start: record opening capital / add a cashbox" linking to §14 · error · no-results (n/a) · **offline:** banner "Offline — figures are as of last sync".

### 4.4 Responsive / Permissions
Desktop 4-col KPIs + chart; mobile single-column cards + quick-action bar. `finance.view_simple` minimum. Accounting users see the same dashboard (it's the operations face).

### 4.5 AR / EN
| key | AR | EN |
|---|---|---|
| finance.dash.liquidity | السيولة المتاحة | Available liquidity |
| finance.dash.cashflow | صافي التدفق النقدي | Net cash flow |
| finance.dash.ar | مستحق ليّا | Owed to me |
| finance.dash.ap | مستحق عليّا | I owe |
| finance.dash.expenses | مصروفات الشهر | Monthly expenses |
| finance.dash.profit | المكسب التقديري | Estimated profit |
| finance.dash.overdue | مستحقات متأخرة | Overdue receivables |
| finance.dash.offline | غير متصل — الأرقام محسوبة حتى آخر مزامنة | Offline — figures are as of last sync |

### 4.6 Acceptance
KPIs aggregate from posted balances; new-tenant empty offers onboarding; no accounting jargon in simple mode.

---

## 5) Screen — Treasuries / Banks / Wallets (`/finance/treasuries`, `/:id`)

### 5.1 Components
Grid of balance cards (cashbox/bank/wallet), each: name, type icon, **current balance** (`tabular-nums`), branch, enter→ledger. `+ treasury` form (name ✱, type, branch, opening note).
**Movement ledger (`/:id`):** `DataTable` (compact) — date · memo · in · out · **running balance** (end). Sticky header, date filter, export. Source-linked rows.

### 5.2 States
Loading (skeleton cards) · empty ("no treasuries — add one") · error · offline (banner). Ledger: skeleton/empty/error.

### 5.3 Permissions
`finance.view_simple`; create treasury `finance.treasury.manage`. Branch scope applies.

### 5.4 AR / EN
`finance.treasury.title`="الخزائن والبنوك"/"Treasuries & Banks", `finance.treasury.balance`="الرصيد الحالي"/"Current balance", `finance.treasury.in`="داخل"/"In", `finance.treasury.out`="خارج"/"Out", `finance.treasury.running`="الرصيد"/"Balance".
**Acceptance:** balance is computed from movements; ledger shows running balance and ties to card balance.

---

## 6) Screen — Expenses (`/finance/expenses`) — most-used owner action

### 6.1 Quick-entry modal (target <15s)
`+ expense` → **icon category grid** (rent/electricity/fuel/petty purchases/marketing/…) → amount (number ✱) → pay method (treasury/bank/wallet ✱) → optional receipt image (camera/upload) → cost_center (hidden unless enabled; defaults to branch) → save → auto-posts (Dr expense / Cr treasury). 
### 6.2 List
Filters: category, period, cost_center. Columns: date · category (icon) · amount · method · attachment · memo. Empty: friendly "record your first expense".
### 6.3 States
All 5; offline (saved local, syncs). **Permissions:** `finance.expense.create`.
### 6.4 AR / EN
`finance.expense.title`="المصروفات"/"Expenses", `finance.expense.new`="مصروف"/"Expense", `finance.expense.category`="الفئة"/"Category", `finance.expense.method`="طريقة الدفع"/"Method", `finance.expense.receipt`="صورة الإيصال"/"Receipt image".
**Acceptance:** expense entry <15s path; auto-posts a balanced entry; receipt attachable.

---

## 7) Screen — Receipt voucher / Collect (`/finance/receipts`, `/new`)

### 7.1 Collect flow
From customer file or Sales "collect": show customer's **AR balance + open invoices**. Enter amount → **auto-allocate oldest-first** (editable manual allocation grid: invoice, amount) → choose receiving treasury → memo → save → **shareable receipt (WhatsApp/print)**. Updates AR + invoice payment pill.
### 7.2 On-account overflow
If amount > total due → offer "advance / on-account" → stored as **customer credit balance**, auto-applied to the next invoice (simplified, no deferred revenue).
### 7.3 Fields
party (customer ✱) · date · amount ✱ · treasury ✱ · allocation grid · on-account remainder · memo · attachment.
### 7.4 States
All 5; **offline (POS cash):** cashier receipt saved local, `local/syncing/synced`; GL shows no revenue before sync (back-office notes "pending cashier X sync").
### 7.5 Permissions
`finance.receipt.create`.
### 7.6 AR / EN
`finance.receipt.title`="سندات القبض"/"Receipt vouchers", `finance.receipt.collect`="تحصيل"/"Collect", `finance.receipt.allocate`="تخصيص على الفواتير"/"Allocate to invoices", `finance.receipt.oldest`="الأقدم أولاً"/"Oldest first", `finance.receipt.on_account`="دفعة مقدّمة (على الحساب)"/"Advance (on account)".
**Acceptance:** allocates oldest-first by default, reduces AR; overflow becomes on-account credit; receipt is shareable.

---

## 8) Screen — Payment voucher (`/finance/payments`, `/new`)

Mirror of §7 on the AP side: supplier/expense, amount, treasury/bank, allocate to supplier invoices, partial + multiple. Updates AP + supplier balance. (Coordinates with Purchasing §9 — same payment concept, posted here.)
**States:** all 5. **Permissions:** `finance.payment.create`.
**AR/EN:** `finance.payment.title`="سندات الصرف"/"Payment vouchers", `finance.payment.pay`="صرف"/"Pay".
**Acceptance:** reduces AP; partial/multiple supported; auto-posts (Dr AP / Cr treasury).

---

## 9) Screen — Transfer (`/finance/transfers`, `/new`)

Move balance between treasury ↔ bank ↔ wallet. Fields: from ✱, to ✱ (≠ from), amount ✱, date, memo. Auto-posts (Dr to / Cr from). Supports the daily "deposit branch cash to bank" scenario.
**List:** date · from → to · amount · memo. **States:** all 5. **Permissions:** `finance.transfer`.
**AR/EN:** `finance.transfer.title`="التحويلات"/"Transfers", `finance.transfer.from`="من"/"From", `finance.transfer.to`="إلى"/"To".
**Acceptance:** from≠to enforced; auto-posts a balanced transfer entry.

---

## 10) Journal + manual entry (accounting mode) (`/finance/journal`, `/new`, `/:id`)

### 10.1 List
Entries table: no (per-branch) · date · memo · total dr · total cr · source. Auto entries carry an **"auto" badge + lock icon** (no direct edit). Filters: date/period, type (auto/manual), account.
### 10.2 Manual entry (`/new`)
Line grid: account (tree-select) · debit · credit · memo · cost_center. **Live balance indicator** (green = balanced, danger = "Dr and Cr differ by X EGP"). **Save disabled until balanced.** Date must be in an `open` period.
### 10.3 Entry view (`/:id`)
Shows lines + source-doc link. Auto entries: read-only with "edit the source document or post an adjusting entry" hint. Reversal action (never delete) for corrections.
### 10.4 States
All 5; **unbalanced** (block + colloquial message); **closed period** (block + suggest open period / request reopen). **Permissions:** `finance.journal.manual` (manual); view needs `finance.view_accounting`.
### 10.5 AR / EN
`finance.journal.title`="دفتر اليومية"/"Journal", `finance.journal.auto`="آلي"/"Auto", `finance.journal.balance_ok`="متوازن"/"Balanced", `finance.journal.unbalanced`="المدين والدائن مش متساويين — الفرق {{x}} ج.م"/"Debit and credit differ by {{x}} EGP", `finance.journal.locked`="القيد الآلي لا يُعدَّل مباشرة — عدّل المستند المصدر أو أنشئ قيد تسوية"/"Auto entries can't be edited directly — edit the source or post an adjusting entry".
**Acceptance:** Σdr=Σcr enforced; auto entries locked (reversal only); closed-period posting rejected.

---

## 11) Chart of accounts + Trial balance (accounting mode)

### 11.1 Chart of accounts (`/finance/coa`)
Egyptian template seeded at onboarding: 5 roots (Assets/Liabilities/Equity/Revenue/Expense), hierarchical. Tree view; add/edit/link sub-accounts (`finance.coa.manage`). Each node: code, name, type, balance. Block delete if the account has postings.
### 11.2 Trial balance (`/finance/trial-balance`)
Per-account table: opening · period dr · period cr · closing. **Balanced totals row** at the bottom; export. Rare "trial balance unbalanced" → red alert + diagnose link (signals data fault).
**States:** all 5. **Permissions:** `finance.view_accounting`.
**AR/EN:** `finance.coa.title`="دليل الحسابات"/"Chart of accounts", `finance.tb.title`="ميزان المراجعة"/"Trial balance", `finance.tb.opening`="رصيد افتتاحي"/"Opening", `finance.tb.closing`="رصيد ختامي"/"Closing".
**Acceptance:** template seeded; trial-balance totals tie; delete blocked for accounts with postings.

---

## 12) Financial statements (`/finance/statements`)

Three statements with a period filter: **P&L** · **Balance Sheet** · **Cash Flow**. Simple↔detailed toggle. Export PDF/Excel. In **simple mode**, only P&L shows, relabeled "Profit & Expenses".
Generated from pre-aggregated balances for any open/closed period.
**States:** loading (skeleton) · empty (period with no data) · error. **Permissions:** simple users see "Profit & Expenses"; full statements need `finance.reports.view` + `finance.view_accounting`.
**AR/EN:** `finance.stmt.pnl`="قائمة الدخل"/"Income statement", `finance.stmt.pnl_simple`="الأرباح والمصروفات"/"Profit & Expenses", `finance.stmt.balance`="الميزانية"/"Balance sheet", `finance.stmt.cashflow`="التدفقات النقدية"/"Cash flow", `finance.stmt.detailed`="تفصيلي"/"Detailed".
**Acceptance:** P&L/BS/CF generate for any period; simple mode shows the reduced P&L only.

---

## 13) Bank reconciliation + Closing (accounting mode)

### 13.1 Bank reconciliation (`/finance/reconciliation`)
Load/import bank statement → auto-match (amount + ~date) → **two-column UI**: "in bank, not in system" / "in system, not in bank". Resolve unmatched (link or create the missing entry). Progress bar ("3 of 18 pending"). Closes when the closing balance ties.
**Permissions:** `finance.reconcile`.
### 13.2 Closing wizard (`/finance/closing`)
Multi-step: **pre-close checklist** (unposted entries? pending reconciliations? old receivables?) → preview statements → confirm. **Soft monthly close** (locks entry, reopenable) / **hard yearly close** (rolls net profit to equity, locks the period). Sensitive → explicit `AlertDialog` confirm. Reopen needs elevated `finance.period.reopen`.
**Period badge** (open/closed) persistent in module header.
**Permissions:** `finance.period.close`; reopen `finance.period.reopen`.
**AR/EN:** `finance.recon.title`="التسوية البنكية"/"Bank reconciliation", `finance.recon.in_bank`="في البنك مش في النظام"/"In bank, not in system", `finance.recon.in_system`="في النظام مش في البنك"/"In system, not in bank", `finance.close.title`="الإقفال المالي"/"Period closing", `finance.close.soft`="إقفال شهري ناعم"/"Soft monthly close", `finance.close.hard`="إقفال سنوي"/"Yearly close", `finance.close.confirm`="الإقفال سيمنع الإدخال في هذه الفترة. متابعة؟"/"Closing will lock entries in this period. Continue?".
**Acceptance:** reconciliation two-column resolve; soft monthly reopenable; hard yearly rolls net to equity (elevated permission).

---

## 14) Opening-balance wizard (`/finance/opening-balances`) — onboarding priority

Steps: treasury/bank balances → customer balances (AR) → supplier balances (AP) → inventory value (integrates with Inventory) → capital / partners' current. The difference posts to an opening-balance suspense account until the **single balanced opening entry** is produced. Supports **CSV import** (migration lever vs competitors).
**States:** loading · error · offline (cached, post on reconnect). **Permissions:** `finance.view_accounting` or admin onboarding.
**AR/EN:** `finance.opening.title`="الأرصدة الافتتاحية"/"Opening balances", `finance.opening.import`="استيراد من Excel"/"Import from Excel", `finance.opening.capital`="رأس المال"/"Capital".
**Acceptance:** wizard produces a single balanced opening entry; CSV import supported.

---

## 15) Module-wide critical states, RTL, performance

- **Unbalanced entry:** block save + colloquial message (Dr/Cr differ by X EGP).
- **Closed period:** block + suggest open period / request reopen.
- **Negative cashbox:** **soft warning** (not blocked by default; tightenable in settings).
- **Offline (POS cash):** receipts saved local → sync; GL never shows revenue before sync; back-office labels "pending cashier X sync".
- Western digits + `tabular-nums`; `ج.م` after the number; EGP only (schema reserves `currency`/`exchange_rate`, no UI v1); dr/cr columns logical alignment; account codes/numbers LTR within RTL.
- **Performance:** posting async/idempotent; ledgers server-side paginated; statements from pre-aggregated balances; reconciliation matching batched.

---

## 16) Permissions (input to FE_08)
`finance.view_simple` · `finance.view_accounting` · `finance.expense.create` · `finance.receipt.create` · `finance.payment.create` · `finance.transfer` · `finance.treasury.manage` · `finance.journal.manual` · `finance.coa.manage` · `finance.reconcile` · `finance.period.close` · `finance.period.reopen` (elevated) · `finance.reports.view`. The `view_simple` vs `view_accounting` split drives the two faces (§1).

## 17) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Dashboard | finance dashboard | ✓ | ✓ | view_simple | ✓ |
| Treasury/Bank/Wallet | grid, ledger | ✓ | ✓ | treasury.manage | ✓ |
| Expense | quick modal, list | ✓ | ✓ | expense.create | ✓ |
| Receipt voucher | collect modal, list | ✓ | ✓ | receipt.create | ✓ |
| Payment voucher | pay modal, list | ✓ | ✓ | payment.create | ✓ |
| Transfer | modal, list | ✓ | ✓ | transfer | ✓ |
| Journal entry | list, manual, view (acct) | ✓ | ✓ | journal.manual / view_accounting | ✓ |
| Chart of accounts | tree (acct) | ✓ | ✓ | coa.manage | ✓ |
| Trial balance | table (acct) | ✓ | ✓ | view_accounting | ✓ |
| Financial statements | P&L/BS/CF | ✓ | ✓ | reports.view | ✓ |
| Bank reconciliation | two-column (acct) | ✓ | ✓ | reconcile | ✓ |
| Fiscal period / closing | wizard + badge | ✓ | ✓ | period.close/reopen | ✓ |
| Opening balance | wizard | ✓ | ✓ | view_accounting | ✓ |

## 18) Module acceptance criteria
1. Every approved operational doc generates a balanced journal entry automatically.
2. Σdr=Σcr enforced; unbalanced entries cannot be saved.
3. Posting into a closed period is rejected; auto entries are not directly editable (reversal only).
4. Customer collection allocates to invoices (oldest-first default) and reduces AR; overflow becomes on-account credit.
5. Trial-balance totals tie; P&L/Balance/Cash Flow generate for any open/closed period.
6. Opening-balance wizard produces a single balanced opening entry.
7. Two faces: owner (simple) sees no accounting jargon; accountant sees full GL; default tenant = simple; everything RTL via i18n keys with all 5 states.

**Fixtures:** `Flexova_FE_04_Accounting.fixtures.json` (Egyptian context — COA template, treasuries/banks/wallets, expenses with icon categories, receipt with allocation + on-account, auto + manual journal entries, trial balance, fiscal periods, bank reconciliation, opening entry).

*End of FE_04 Accounting — version 1.0*
