# Flexova — FE_05 CRM (Customers) (build-ready)

> **Phase 4 — Core module 5.** Central customer record + relationship/collection management (not a sales pipeline). Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — June 2026
> **Source of truth (do not redefine):** `Flexova_SPEC_EN_05_CRM` + `Flexova_UIUX_05_CRM` · `Flexova_FE_00_Foundation` · `Flexova_FE_02_Sales_ETA` (buyer data/TRN → ETA routing) · `Flexova_FE_04_Accounting` (AR/aging/credit — read, not owned).
> **Governing principle — "one record, simple face":** a single shared customer entity consumed by Sales/POS/Accounting/ETA; progressive disclosure (simple card by default); **WhatsApp-first**.
> **Golden rules (carried):** (1) **AR balance/aging is READ from Accounting, never recomputed here.** (2) **Customer type + TRN drive ETA routing** — company + valid TRN → B2B pre-clearance; individual/cash → B2C window queue. (3) Phone = natural dedupe key.
> **Retroactive wiring:** this module is the source for the customer picker that FE_02 §5.2 left as a fixtures stub — Sales now reads CRM customers; FE_02 fixture customers map 1:1 here.

---

## 0) Module scope (recap)

**In v1:** customer master (shared), contacts (B2B), segments/tags, follow-ups, communication log, loyalty (optional, off by default), credit control, AR aging (read), CSV import, walk-in default.
**Out (later):** full leads→opportunities pipeline (services/projects sector), loyalty campaigns, bulk WhatsApp/marketing, B2B self-service portal.

Reads from Accounting (AR/aging/credit/receipts) and Sales (invoice history); feeds ETA (type+TRN routing), POS (offline lookup + loyalty), WhatsApp, HR (salesperson tag → commission base). Data via `lib/mock/client.ts` reading `crm.fixtures.json`.

---

## 1) Routes & IA

Mounts under shell nav `nav.customers`. Secondary **Tabs** below `PageHeader`.

```
/customers                       → redirect → /customers/list
/customers/list                  → Customers list                  [§3]
/customers/new                   → Add customer (full page)        [§5]  (quick-add = modal, §5.4)
/customers/:id                   → Customer 360 hub                [§4]
/customers/:id/edit              → Edit customer                   [§5]
/customers/follow-ups            → Follow-ups board                [§6]
/customers/segments              → Segments / tags                 [§8]
/customers/communications        → Communications + templates      [§9]
/customers/loyalty               → Loyalty (conditional)           [§7]
/customers/import                → Import wizard (onboarding)       [§11]
```

**Secondary tabs:** Customers · Follow-ups · Segments · Communications · (Loyalty — only if `loyalty.enabled`).
**Modals/drawers:** Quick-add customer (modal, §5.4 — reused by Sales/POS) · Credit over-limit (`AlertDialog`, §10) · Merge duplicates (drawer + explicit confirm, §10) · WhatsApp template picker (modal, §9) · Follow-up create (modal, §6).
**i18n namespace:** `crm`. AR default, EN mirror.

---

## 2) Entities (display model)

| Entity | Owner | Notes |
|---|---|---|
| Customer (central) | CRM | type ✱ (individual/company — drives ETA), name ✱, phone ✱ (dedupe), trn + national_id (company → required for B2B), address, price_list (links FE_01 §7), credit_limit, segments[], status |
| Contact (B2B) | CRM | name/role/phone within a company |
| Segment/Tag | CRM | free tags + shards for filter/targeting |
| Follow-up | CRM | note + due date + owner + status open/done; due alert |
| Communication Log | CRM (+auto) | timeline of WhatsApp/calls/notes |
| Loyalty | CRM (optional) | points balance, earn/redeem rules, tiers; **off by default** |
| Credit Limit | set here, applied in Sales | available = limit − balance |
| AR / Aging | **read from Accounting** | balance + buckets (current/1–30/31–60/60+); never recomputed |
| Walk-in | CRM | single default record for fast POS sales (no record creation) |

**Validation:** phone ✱ (Egyptian format, dedupe warn); trn (9 digits, inline red if malformed); company type requires trn before a B2B e-invoice can issue (banner in Sales).

---

## 3) Screen — Customers list (`/customers/list`)

### 3.1 Components
`PageHeader`: `+ customer` (primary) · `import` · `export`. Toolbar: instant search (name/phone); filters: segment, balance (overdue), activity, status. 
**DataTable (compact)** columns: name (+ type badge) · phone (LTR) · **balance** (`tabular-nums`, end; **red if overdue** — read from Accounting) · segment chips · last activity · actions (WhatsApp / invoice / collect / edit).

### 3.2 Five states
Loading (skeleton) · **empty:** "no customers yet" + `add first customer` + `import from file` · error · **no-results:** distinct, echoes query · offline (banner; **list cached for POS offline search**).

### 3.3 Responsive / Permissions
Desktop table; mobile → customer cards (name + phone + balance + WhatsApp/actions). `crm.customer.view`; create/edit/export gated. Balance respects scope; overdue color from Accounting aging.

### 3.4 AR / EN
| key | AR | EN |
|---|---|---|
| crm.customers.title | العملاء | Customers |
| crm.customer.new | عميل جديد | New customer |
| crm.customer.balance | الرصيد | Balance |
| crm.customer.last_activity | آخر تعامل | Last activity |
| crm.customers.empty | لا عملاء بعد | No customers yet |
| crm.type.individual | فرد | Individual |
| crm.type.company | شركة | Company |

### 3.5 Acceptance
Balance/overdue mirror Accounting exactly; empty vs no-results distinct; list cached for offline search.

---

## 4) Screen — Customer 360 hub (`/customers/:id`) — central screen

### 4.1 Purpose
Everything about one customer, ordered for the owner: identity → money → history/relationship.

### 4.2 Layout
- **Header:** name + type badge (individual/company) + phone + **quick actions** (WhatsApp · call · `+ invoice` · `collect`).
- **Financial strip (most prominent):** AR ("owed") · available credit (limit − balance) · oldest overdue — semantic colors (success/warning/danger). **All read from Accounting.**
- **Tabs:** Transactions (invoices/payments, linked to Sales/Accounting) · Follow-ups · Communications · Loyalty (if on) · Data + Contacts (B2B).

### 4.3 Interactions
`+ invoice` deep-links to Sales editor (FE_02 §5) with this customer pre-selected (resolves the FE_02 picker). `collect` opens the Accounting receipt voucher (FE_04 §7) for this customer. WhatsApp opens the template picker (§9).

### 4.4 Five states
Loading (skeleton header+strip+tabs) · empty-ish (new customer: zeroed strip, "no transactions yet") · error · offline (strip "as of last sync"; actions queue where possible).

### 4.5 Responsive
Desktop two-column (identity/strip on `start`, tabs on `end`); **mobile:** sticky bottom action bar (WhatsApp/invoice/collect); tabs as horizontal scroller.

### 4.6 Permissions
`crm.customer.view`; quick actions gated by their target modules (`sales.invoice.create`, `finance.receipt.create`, `crm.communicate`).

### 4.7 AR / EN
| key | AR | EN |
|---|---|---|
| crm.360.owed | عليه | Owed |
| crm.360.available_credit | المتاح من الائتمان | Available credit |
| crm.360.oldest_overdue | أقدم متأخر | Oldest overdue |
| crm.360.tab_transactions | المعاملات | Transactions |
| crm.360.tab_followups | المتابعات | Follow-ups |
| crm.360.tab_comms | التواصل | Communications |
| crm.360.tab_data | البيانات | Data |
| crm.360.whatsapp | واتساب | WhatsApp |
| crm.360.collect | حصّل | Collect |

### 4.8 Acceptance
360 loads transactions, follow-ups, comms, and (if enabled) loyalty; financial strip equals Accounting; quick actions deep-link correctly.

---

## 5) Add / edit customer (`/customers/new`, `/:id/edit`) + quick-add modal

### 5.1 Fields
type ✱ (individual/company — segmented) · name ✱ · phone/WhatsApp ✱ · address · **trn + national_id** (shown/required per type — required for B2B e-invoice) · price_list (FE_01 §7) · credit_limit · segments (tag input) · notes. B2B reveals a **Contacts** repeater (name/role/phone).

### 5.2 Validation & ETA tie
Malformed TRN → inline red (plain text, no code). A **company** without TRN can be saved, but a banner warns it will block B2B e-invoicing until completed (prevents an ETA submit failure downstream). Phone duplicate → immediate warn + merge suggestion (§10).

### 5.3 Five states
Loading (edit) · error (save → toast) · offline (created local, `local/syncing/synced`). 

### 5.4 Quick-add modal (from sale/POS, <10s)
Fields: name ✱ + phone ✱ → save → returns to invoice. Default type `individual`; "promote to company + TRN" prompted before the first B2B invoice. Reused by Sales/POS.

### 5.5 Permissions
`crm.customer.create` / `crm.customer.edit`; credit_limit needs `crm.credit.set`.

### 5.6 AR / EN
| key | AR | EN |
|---|---|---|
| crm.form.type | النوع | Type |
| crm.form.phone | التليفون / واتساب | Phone / WhatsApp |
| crm.form.trn | الرقم الضريبي | Tax Reg. No. |
| crm.form.national_id | الرقم القومي | National ID |
| crm.form.credit_limit | حد الائتمان | Credit limit |
| crm.form.company_no_trn | عميل شركة بلا رقم ضريبي — أكمل البيانات قبل أول فاتورة B2B | Company without TRN — complete before the first B2B invoice |
| crm.quickadd.title | عميل سريع | Quick customer |

### 5.7 Acceptance
A customer created once is usable across Sales/POS/Accounting/ETA without re-entry; company requires TRN before a B2B e-invoice issues; duplicate phone triggers merge suggestion.

---

## 6) Follow-ups board (`/customers/follow-ups`)

Grouped by due today / overdue / upcoming; each: customer, note, due, owner, quick-close. `+ follow-up` (modal: note + due + owner). Due alerts surface in the board (and shell notifications). Closing logs to the communication timeline.
**States:** all 5; empty ("no follow-ups due", positive). **Permissions:** `crm.followup.manage`.
**AR/EN:** `crm.followup.title`="المتابعات"/"Follow-ups", `crm.followup.due_today`="مستحقة اليوم"/"Due today", `crm.followup.overdue`="متأخرة"/"Overdue", `crm.followup.close`="إغلاق"/"Close".
**Acceptance:** due/overdue grouping; close logs to comms.

---

## 7) Loyalty (`/customers/loyalty`) — conditional, off by default

Only visible if `loyalty.enabled` (tenant setting). Tenant earn/redeem rules, per-customer point balance, point ledger. Auto-earn on sale; redeem as invoice discount (Sales). Balance shows on the 360 card and cashier screen (POS).
**States:** all 5; offline (points accrue locally, reconcile on sync). **Permissions:** `crm.loyalty.manage`.
**AR/EN:** `crm.loyalty.title`="برنامج الولاء"/"Loyalty", `crm.loyalty.points`="رصيد النقاط"/"Points balance", `crm.loyalty.earn`="كسب"/"Earn", `crm.loyalty.redeem`="استبدال"/"Redeem".
**Acceptance:** off by default; when on, points earn/redeem and accrue offline.

---

## 8) Segments / tags (`/customers/segments`)

Manage free tags + shards (VIP/wholesale/overdue…); show customer count per shard; filter + export shard (basis for later targeting).
**States:** all 5. **Permissions:** `crm.customer.edit` (tagging); export `crm.export`.
**AR/EN:** `crm.segments.title`="التصنيفات"/"Segments", `crm.segments.count`="{{n}} عميل"/"{{n}} customers", `crm.segments.export`="تصدير الشريحة"/"Export shard".
**Acceptance:** tags assignable; shard counts accurate; export works.

---

## 9) Communications (`/customers/communications`) — WhatsApp-first

Unified timeline of all customer comms (WhatsApp/calls/notes, manual + auto). Configurable **WhatsApp templates** (greeting / collection reminder with overdue amount / invoice / receipt). Sending opens WhatsApp prefilled and **auto-logs** the message.
**States:** all 5. **Permissions:** `crm.communicate`. (Bulk/marketing deferred.)
**AR/EN:** `crm.comms.title`="التواصل"/"Communications", `crm.comms.template`="قالب"/"Template", `crm.comms.reminder`="تذكير تحصيل"/"Collection reminder", `crm.comms.send_wa`="إرسال واتساب"/"Send WhatsApp".
**Acceptance:** template opens prefilled WhatsApp; message auto-logged to the timeline.

---

## 10) Credit control + Merge (critical module flows)

### 10.1 Credit over-limit (`AlertDialog`)
On a credit sale exceeding `available = limit − balance`: modal shows limit / available / requested → `review` or **`override`** (needs `crm.credit.override`; logged to comms). Default = **soft block** (tightenable to hard at customer/tenant level). Consistent with Accounting's negative-cashbox soft warning. A **suspended** customer blocks credit sales (cash allowed per setting).

### 10.2 Merge duplicates
Matching phone → suggest merge → drawer **preview** (merged transactions + balance into one record) → explicit confirm (sensitive, not auto-reversible). Warn, never silently block creation.

**AR/EN:** `crm.credit.over_title`="تجاوز حد الائتمان"/"Credit limit exceeded", `crm.credit.limit`="الحد"/"Limit", `crm.credit.available`="المتاح"/"Available", `crm.credit.requested`="المطلوب"/"Requested", `crm.credit.override`="تجاوز بصلاحية"/"Override", `crm.merge.title`="دمج عملاء مكرّرين"/"Merge duplicates", `crm.merge.confirm`="الدمج لا يمكن التراجع عنه تلقائياً. متابعة؟"/"Merge can't be auto-undone. Continue?", `crm.dup.warn`="تليفون مكرّر — هل تريد الدمج؟"/"Duplicate phone — merge?".
**Acceptance:** over-limit credit sale blocked unless overridden with permission (logged); duplicate phone suggests merge; merge requires explicit confirm.

---

## 11) Import wizard (`/customers/import`) — onboarding

Steps: download template → upload CSV (name/phone/opening balance/TRN) → preview + **dedupe by phone** → import. Opening balances tie to the Accounting opening entry (FE_04 §14). Migration lever vs competitors.
**States:** parsing/validation/error/offline (queue). **Permissions:** `crm.import`.
**AR/EN:** `crm.import.title`="استيراد العملاء"/"Import customers", `crm.import.dedupe`="كشف التكرار بالتليفون"/"Dedupe by phone".
**Acceptance:** dedupes by phone; opening balances integrate with the Accounting opening entry.

---

## 12) Module-wide states, RTL, integrations, performance

- **Suspended** customer: clearly flagged, blocks credit sales (cash per setting).
- **Offline (POS):** customer list cached for offline search; new customer created offline (`local/syncing/synced`); loyalty accrues locally then reconciles.
- **Duplicate phone:** immediate warn + merge suggestion (warn, not block).
- Western digits + `tabular-nums`; `ج.م`; phone/TRN/national_id LTR within RTL (bidi tested); arrows mirror.
- **Integrations:** Sales (history, start invoice, price-list link), Accounting (AR/aging/credit — read only), ETA (type+TRN routing), POS (offline lookup + loyalty), WhatsApp (templates), HR (salesperson tag → commission base), Reports (segments/overdue/top customers).
- **Performance:** server-side paginated/indexed search on phone+name; 360 strip from cached AR; loyalty ops idempotent on sync.

## 13) Permissions (input to FE_08)
`crm.customer.view/create/edit` · `crm.customer.merge` (sensitive) · `crm.credit.set` · `crm.credit.override` · `crm.followup.manage` · `crm.loyalty.manage` · `crm.communicate` · `crm.export` · `crm.import`.

## 14) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Customer | list, 360 hub, add/edit, quick-add | ✓ | ✓ | customer.* | ✓ |
| Contact (B2B) | within form/360 | ✓ | ✓ | customer.edit | ✓ |
| Segment/Tag | segments | ✓ | ✓ | customer.edit/export | ✓ |
| Follow-up | board, modal | ✓ | ✓ | followup.manage | ✓ |
| Communication | timeline, templates | ✓ | ✓ | communicate | ✓ |
| Loyalty | loyalty (conditional) | ✓ | ✓ | loyalty.manage | ✓ |
| Credit | over-limit modal | ✓ | ✓ | credit.set/override | ✓ |
| AR/Aging | read in list + 360 | read-only | ✓ | customer.view | ✓ |
| Import | wizard | ✓ | ✓ | import | ✓ |

## 15) Module acceptance criteria
1. A customer created once is usable across Sales/POS/Accounting/ETA without re-entry.
2. Saving a duplicate phone triggers a merge suggestion.
3. Company customers require TRN before a B2B e-invoice can issue.
4. AR balance/aging on the card match Accounting exactly (no recomputation).
5. Over-limit credit sale is blocked unless overridden with permission (logged).
6. Customer 360 loads transactions, follow-ups, comms, and (if enabled) loyalty.
7. Everything RTL via i18n keys with all 5 states; list cached for offline POS search.

**Fixtures:** `Flexova_FE_05_CRM.fixtures.json` (Egyptian context — individuals + companies w/ and w/o TRN, walk-in, segments, follow-ups, comms timeline, loyalty sample, AR/aging read-values matching Sales/Accounting, a duplicate-phone pair, credit-limit cases).

*End of FE_05 CRM — version 1.0*
