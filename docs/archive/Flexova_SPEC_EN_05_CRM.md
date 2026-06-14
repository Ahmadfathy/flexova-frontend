# Flexova — CRM (Customers) Spec (EN, build-ready)

> Layer 2, Core module 5. Central customer record + relationship/collection mgmt (not a sales pipeline).
> Depends on: Design System, Sales+ETA, Accounting (AR/credit). v1.

## 1. Scope
**In:** customer master (shared), contacts (B2B), segments/tags, follow-ups, communication log, loyalty (optional), credit control, AR aging (read), CSV import.
**Out (later):** full leads→opportunities pipeline (services/projects sector layer); loyalty campaigns; bulk WhatsApp/marketing; B2B self-service portal.
**Principles:** single shared customer entity across Sales/POS/Accounting/ETA; progressive disclosure (simple card by default); **WhatsApp-first**.

## 2. Entities (✱ required)

### 2.1 Customer (central)
| Field | Type | Req | Notes |
|---|---|---|---|
| type | enum | ✱ | `individual` / `company` — **drives ETA routing** |
| name | string | ✱ | |
| phone | string | ✱ | **natural dedupe key** (warn on duplicate) |
| trn + national_id | string | | required for B2B e-invoice (company) |
| address | object | | |
| price_list | ref | | links to v1 price lists (tiered/wholesale) |
| credit_limit | number | | available = limit − balance |
| segments[] | tags | | VIP/wholesale/overdue… |
| balance / aging | computed | | **read from Accounting (not owned)** |
| status | enum | | active / suspended |

### 2.2 Other entities
- **Contact** — B2B only: name/role/phone within a company customer.
- **Segment/Tag** — free tags + shards for filter/targeting.
- **Follow-up** — note + due date + owner + status `open/done`; alert on due.
- **Communication Log** — timeline of WhatsApp/calls/notes (manual + auto).
- **Loyalty** — points balance, earn/redeem rules, tiers; **off by default** (tenant setting).
- **Walk-in customer** — single default record for fast POS sales (no record creation).

## 3. Flows
- **Quick add (from sale/POS):** name + phone → save → back to invoice (<10s). Default type `individual`; promote to `company` + TRN before first B2B invoice.
- **Customer 360 + act:** search (name/phone) → card → WhatsApp / invoice / collect / follow-up.
- **Follow-up:** +follow-up → note + due + owner → board + due alert → logged on close.
- **WhatsApp:** template (invoice/receipt/collection reminder w/ overdue amount) → open WhatsApp prefilled → auto-logged.
- **Loyalty (if on):** auto-earn on sale; redeem as discount on invoice.
- **Credit over-limit:** credit sale > limit → modal (limit/available/requested) → review or **override (permission)**; override logged.
- **Merge duplicates:** matching phone → suggest merge → preview merged txns/balance → explicit confirm (irreversible).
- **Import (onboarding):** CSV (name/phone/opening balance/TRN) → preview + dedupe → import (ties to Accounting opening entry).

## 4. Screens
- **Customers list:** name · phone · balance(`tabular-nums`, red if overdue) · segment · last-activity; filters, instant search, row actions (WhatsApp/invoice/collect). Empty vs empty-search distinguished.
- **Customer 360 (hub):** header (name/type badge/phone + quick actions) · **financial strip** (AR · available credit · oldest overdue, semantic colors) · tabs (transactions / follow-ups / comms / loyalty / data+contacts). Mobile: sticky bottom action bar.
- **Add/edit customer:** type, name, phone, address, **TRN + national_id** (shown/required by type), price_list, credit_limit, segments, notes. Invalid TRN → inline red. B2B w/o TRN at invoice → banner to complete data.
- **Follow-ups board:** due today/overdue grouped, quick-close.
- **Loyalty (if on):** tenant earn/redeem rules, point balance, point ledger.
- **Segments:** manage tags/shards, counts, export shard.
- **Communications:** unified timeline + configurable WhatsApp templates.

## 5. States
- Customer: active / suspended (suspended blocks credit sales; cash allowed per setting).
- Credit: soft-block + permission override.
- All 5 data states per Design System §8. **Offline (POS):** customer list cached for offline search; new customer created offline (`local/syncing/synced`); loyalty points accrue locally then reconcile.
- **Duplicate phone:** immediate warning + merge suggestion (warn, not block).

## 6. Integrations
Sales (invoice history; start invoice from card; price-list link). Accounting (AR/aging/credit/receipts — **read, not recomputed**). ETA (type + TRN → B2B pre-clearance / B2C window queue; buyer data on e-invoice). POS (offline lookup, balance + loyalty on cashier screen). WhatsApp (invoices/receipts/reminders). HR (salesperson tag on txn → commission base). Reports (segments/overdue/top customers).

## 7. Performance
Server-side paginated/indexed search on phone+name; 360 financial strip from cached AR; loyalty ops idempotent on sync.

## 8. Decisions (v1, locked)
- Single shared customer + 360 view; AR read from Accounting.
- Phone = dedupe key; walk-in default for POS.
- Customer type + TRN drive ETA routing.
- Credit: soft-block + permission override (tightenable to hard).
- WhatsApp-first templates.
- **Loyalty optional, off by default**; lightweight follow-ups/segments in core.
- CSV import in onboarding (ties to opening balances).

## 9. Acceptance criteria
- A customer created once is usable across Sales/POS/Accounting/ETA without re-entry.
- Saving a duplicate phone triggers a merge suggestion.
- Company customers require TRN before a B2B e-invoice can issue.
- AR balance/aging on the card match Accounting exactly (no recomputation).
- Over-limit credit sale is blocked unless overridden with permission (logged).
- Customer 360 loads transactions, follow-ups, comms, and (if enabled) loyalty.
