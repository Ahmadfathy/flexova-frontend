# Flexova — Purchasing & Suppliers Spec (EN, build-ready)

> Layer 2, Core module 3. Closes the inventory cycle (sales=out, purchases=in + weighted-avg cost).
> Depends on: Design System, Inventory, Sales+ETA specs. v1.

## 1. Scope
**In:** suppliers + statements, purchase orders, goods receipts, purchase invoices, purchase returns, supplier payment vouchers, **inbound supplier e-invoice matching (ETA input VAT)**.
**Out (on top):** customs/complex import (shipments/multi-currency/duties); manufacturing/BOM; advanced landed cost.
**Default mode (radical simplicity):** **direct purchase** (receive + bill in one doc) for SMEs. Full cycle (requisition→PO→receipt→invoice) behind advanced mode (requisition deferred — see decisions).

## 2. Entities (✱ required)

### 2.1 Supplier
| Field | Type | Req | Notes |
|---|---|---|---|
| name | string | ✱ | |
| code | string | | auto |
| trn + uin | string | | match supplier e-invoices, input VAT |
| payment_terms | enum/number | | cash / credit (days) / credit limit |
| contact | object | | phone/email/address |
| category | enum | | local/imported, group |
| balance | computed | | from invoices/returns/payments (not editable) |
| status | enum | | active/suspended |

### 2.2 Purchase Order (advanced) — header: supplier, date, expected_delivery, receiving warehouse, status (`draft→sent→partially_received→completed→cancelled`). Lines: item, qty, uom, price, line_total.
### 2.3 Goods Receipt — linked to PO (or direct); lines = **received qty** (may be partial); warehouse. Generates **in** movement + updates cost.
### 2.4 Purchase Invoice (central) — header: supplier, supplier_invoice_no, date, warehouse, payment_method, **inbound ETA UUID link** (2.7). Lines: item·qty·uom·purchase_price·line_discount·tax_type·line_total. Totals: subtotal·discount·tax(input)·**additional costs (optional, distributed)**·grand total. Updates last purchase price + **weighted-avg cost** + **supplier balance**.
### 2.5 Purchase Return — linked to purchase invoice; returned lines + **required reason**; generates **out** movement + reduces supplier balance; ETA note if needed.
### 2.6 Payment Voucher — supplier/invoice, amount, method, treasury/bank; **partial + multiple**; updates balance + pay status.
### 2.7 Inbound e-Invoice (ETA buyer-side) — UUID · supplier · value · tax · status (`pending/accepted/rejected`) · 72h response window. Accept/reject within window + match to internal purchase invoice = condition for input VAT credit.

## 3. Flows
- **Direct purchase (default):** +purchase invoice → supplier → add items + qty/price → save → **stock-in + cost update + supplier balance** in one step.
- **Full cycle (advanced):** PO → receipt (may be partial) → purchase invoice (simple match to received).
- **Purchase return:** open invoice → create return → pick lines + reason → out + reduce balance.
- **Pay supplier:** from statement/invoice → voucher (partial/full) → update balance/status.
- **Inbound ETA match:** inbound hub → review supplier invoice → **accept/reject within 72h** → match to (or create) purchase invoice → counts toward input VAT.

## 4. Screens
- **Suppliers:** list + supplier card with **statement** (invoices/returns/payments + running balance) + "pay" button.
- **Purchases list:** columns no·date·supplier·total·receipt-status·pay-pill·inbound-ETA-pill·actions; filters supplier/pay/ETA/date.
- **Purchase invoice editor (central):** header (supplier/date/warehouse/supplier_invoice_no/ETA link) · fast line grid (search/barcode, full keyboard, live calc) · totals + **optional additional-costs**. Buttons: save draft / approve (generates in + cost update).
- **PO + receipt:** PO editor (advanced) + receipt screen supporting **partial received qty** vs PO.
- **Purchase return:** linked editor, required reason, shows stock + balance effect.
- **Payment voucher:** from supplier/invoice; partial/multiple.
- **Inbound ETA hub (differentiator):** supplier invoices by status (`pending` w/ 72h countdown / accepted / rejected / unmatched); actions accept/reject, match/create-PI; KPIs (deductible input VAT value, invoices nearing window end).

## 5. States
- Receipt: `pending` / `partially_received` / `completed`.
- Payment (pills): paid / partial / credit.
- Inbound ETA (pills): pending(warning + countdown) / accepted(success) / rejected(danger) / unmatched(neutral).
- All 5 data states per Design System §8. **Offline:** receipt/PI entry works locally then syncs (`local/syncing/synced`); inbound ETA matching needs connection (state shown clearly on return).

## 6. Integrations
Inventory (in/out + weighted-avg cost + multi-unit). **ETA buyer-side** (receive supplier invoices, accept/reject 72h, link UUID for input VAT — *depends on ETA inbound API; verify at build; fallback = manual entry/import*). Accounting (supplier balance, vouchers, treasury/bank). Local pay (transfer/wallets).

## 7. Performance
Fast line grid; server-side pagination for purchases/suppliers; inbound ETA matching async (non-blocking).

## 8. Decisions (v1, locked)
- **Additional costs / landed cost:** simple optional field on PI, distributed to item cost **by value**; complex customs/import deferred.
- **Requisition:** not in v1 (PO only); added later if a sector needs it.
- **Matching:** simple link (invoice↔receipt) + show discrepancies; no heavy 3-way match.
- **Partial/multiple receipts:** supported; PO stays open until complete.
- **ETA buyer-side:** design assuming inbound API; verify at build; manual fallback.

## 9. Acceptance criteria
- A purchase invoice (or goods receipt) creates an `in` movement and updates weighted-avg cost.
- Supplier balance is computed from documents, never edited directly.
- Additional costs (when entered) distribute across lines proportionally by value into item cost.
- A PO supports multiple partial receipts and only `completed` when fully received.
- Inbound supplier e-invoices can be accepted/rejected within 72h and linked to a purchase invoice for input-VAT credit.
