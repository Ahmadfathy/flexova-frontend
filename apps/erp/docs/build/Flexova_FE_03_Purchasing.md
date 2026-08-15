# Flexova — FE_03 Purchasing & Suppliers (build-ready)

> **Phase 4 — Core module 3.** Purchasing frontend spec. Closes the inventory cycle (sales = out; purchases = in + weighted-avg cost). Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — June 2026
> **Source of truth (do not redefine):** `Flexova_SPEC_EN_03_Purchasing` + `Flexova_UIUX_03_Purchasing` · `Flexova_ETA_Update_Jun2026` (input-VAT depends on valid supplier e-invoice) · `Flexova_FE_00_Foundation` · `Flexova_FE_01_Inventory` (item/cost/units) · `Flexova_FE_02_Sales_ETA` (ETA patterns, pills, hub conventions reused).
> **Golden rules (carried):** (1) Supplier balance is **computed** from documents, never edited directly. (2) Balances change only via documented **movements** (purchase/receipt → `in`; return → `out`). (3) Input VAT is deductible only against a **valid, matched** supplier e-invoice.
> **Governing principle (radical simplicity):** default flow = **direct purchase** (receive + bill in one doc). Full cycle (PO → receipt → invoice) lives behind an **advanced mode** toggle.

---

## 0) Module scope (recap)

**In v1:** suppliers + statements, purchase orders (advanced), goods receipts (partial supported), purchase invoices (central), purchase returns, supplier payment vouchers, **inbound supplier e-invoice matching (ETA input VAT)**.
**Out (built on top):** customs/complex import (shipments/multi-currency/duties), manufacturing/BOM, advanced landed cost.

Consumes Inventory (generates `in`/`out`, updates weighted-avg cost + last purchase price, multi-unit). Feeds Accounting later (supplier balance, vouchers, treasury). Data via `lib/mock/client.ts` reading `purchasing.fixtures.json`.

**Inbound ETA caveat:** designed assuming an ETA inbound (buyer-side) API; **verify at build**; fallback = manual entry/import of supplier invoices.

---

## 1) Direct vs advanced mode (UI-level switch)

A tenant/user setting `purchasing.mode` = `direct` (default) | `advanced`.
- **direct:** the module foregrounds the Purchase Invoice (receive + bill in one step). PO/Receipt screens hidden from tabs.
- **advanced:** adds Orders + Receipt screens and the full PO → receipt → invoice chain. Toggle in module settings; per-tenant default, per-user override allowed.

---

## 2) Routes & IA

Mounts under shell nav `nav.purchasing`. Secondary **Tabs** below `PageHeader` (tabs shown depend on mode §1).

```
/purchasing                      → redirect → /purchasing/invoices
/purchasing/suppliers            → Suppliers list                      [§4]
/purchasing/suppliers/:id        → Supplier card + statement           [§4]
/purchasing/invoices             → Purchases list                      [§5]
/purchasing/invoices/new         → Purchase invoice editor (3 zones)   [§6]  (accepts ?from=lowstock&ids=)
/purchasing/invoices/:id         → Purchase invoice view               [§6]
/purchasing/invoices/:id/return  → Purchase return editor (linked)     [§8]
/purchasing/orders               → Purchase orders list   (advanced)   [§7]
/purchasing/orders/new           → PO editor             (advanced)    [§7]  (accepts ?from=lowstock&ids=)
/purchasing/orders/:id           → PO view + receive      (advanced)   [§7]
/purchasing/orders/:id/receive   → Goods receipt screen   (advanced)   [§7]
/purchasing/returns              → Purchase returns list               [§8]
/purchasing/returns/:id          → Return view                         [§8]
/purchasing/vouchers             → Payment vouchers list               [§9]
/purchasing/vouchers/new         → Payment voucher                     [§9]
/purchasing/inbound-eta          → Inbound ETA hub                     [§10]
```

**Secondary tabs:** Suppliers · Purchases · (Orders · Receipts — advanced only) · Returns · Vouchers · Inbound ETA.
**Modals/drawers:** Supplier quick-add (modal) · Item quick-add (reuses FE_01 §5) · Pay supplier (voucher modal, §9) · Additional-costs editor (popover, §6.4) · Accept/Reject inbound (`AlertDialog`, §10) · Match-to-PI (drawer, §10) · Print/share.
**Cross-module deep-link (resolves FE_01 §12):** `…/new?from=lowstock&ids=it_tea,it_soap` pre-fills lines from the low-stock selection with `suggested_qty`.
**i18n namespace:** `purchasing`. AR default, EN mirror.

---

## 3) State systems (three independent pills + receipt status)

- **Receipt status:** `pending` · `partially_received` · `completed`.
- **Payment (pills):** `paid`(success) · `partial`(warning) · `credit`(warning).
- **Inbound ETA (pills):** `pending`(warning + **72h countdown**) · `accepted`(success) · `rejected`(danger) · `unmatched`(neutral).
These are independent and shown in separate columns; never merged.

---

## 4) Screen — Suppliers (`/purchasing/suppliers`, `/:id`)

### 4.1 Purpose
Manage suppliers and view each supplier's running statement; entry to pay.

### 4.2 List
`PageHeader` actions: `+ supplier` (primary) · export. Toolbar: search (name/TRN/code); filters: category (local/imported), status, balance (>0). 
Columns: code · name · TRN (muted, LTR) · payment terms · **balance** (computed, end, `formatMoney`, color: owed=warning) · status pill · actions (view/pay/suspend).

### 4.3 Supplier card (`/:id`)
Header: name, TRN/UIN, contact, terms, **current balance** (computed) + `pay` button. 
**Statement** = `DataTable` timeline: date · doc (purchase invoice / return / payment, linked) · debit · credit · **running balance** (`.num`, end). Filters: date range, doc type. "Pay" opens voucher modal (§9).
Form (create/edit, modal or page): name ✱, code (auto), TRN + UIN, payment_terms (cash / credit + days / credit limit), contact (phone/email/address), category, status.

### 4.4 Five states
Loading (skeleton rows) · empty (EmptyState + add) · error · no-results · offline (banner; reads cache).

### 4.5 Responsive
Desktop table; mobile → supplier cards; statement table → stacked rows on mobile.

### 4.6 Permissions
`purchasing.supplier.view/manage`; `pay` needs `purchasing.payment.create`; balance respects branch scope.

### 4.7 AR / EN
| key | AR | EN |
|---|---|---|
| purchasing.suppliers.title | الموردون | Suppliers |
| purchasing.supplier.new | مورّد جديد | New supplier |
| purchasing.supplier.balance | الرصيد | Balance |
| purchasing.supplier.terms | شروط الدفع | Payment terms |
| purchasing.supplier.statement | كشف الحساب | Statement |
| purchasing.supplier.pay | سند دفع | Pay |

### 4.8 Acceptance
Supplier balance is computed from documents (never an editable field); statement shows running balance with linked docs.

---

## 5) Screen — Purchases list (`/purchasing/invoices`)

### 5.1 Purpose
Browse purchase invoices across three independent axes (receipt, payment, inbound-ETA).

### 5.2 Components
`PageHeader`: `+ purchase invoice` (primary) · (advanced) `+ purchase order` · export.
Toolbar: search (no/supplier/supplier_invoice_no); filters: supplier · payment status · inbound-ETA status · receipt status · date range.
Columns: no · date · supplier · supplier_invoice_no (muted) · total (end) · **receipt status** · **payment pill** · **inbound-ETA pill** · actions (view/print/return/pay/match).

### 5.3 States
Loading · empty (+ CTA, hint to import or low-stock) · error · no-results · offline (banner; entries queue).

### 5.4 Responsive / Permissions
Desktop full table; mobile cards (no + supplier + total + three pills stacked). `purchasing.invoice.view`; create gated; pay/return/match each gated.

### 5.5 AR / EN
| key | AR | EN |
|---|---|---|
| purchasing.purchases.title | المشتريات | Purchases |
| purchasing.invoice.new | فاتورة شراء | Purchase invoice |
| purchasing.order.new | أمر شراء | Purchase order |
| purchasing.receipt.pending | بانتظار الاستلام | Pending |
| purchasing.receipt.partial | مستلم جزئياً | Partially received |
| purchasing.receipt.completed | مكتمل | Completed |
| purchasing.pay.paid | مدفوعة | Paid |
| purchasing.pay.partial | مدفوعة جزئياً | Partially paid |
| purchasing.pay.credit | آجلة | Credit |
| purchasing.inbound.pending | بانتظار الرد | Pending response |
| purchasing.inbound.accepted | مقبولة | Accepted |
| purchasing.inbound.rejected | مرفوضة | Rejected |
| purchasing.inbound.unmatched | غير مطابقة | Unmatched |

### 5.6 Acceptance
Three statuses stored/displayed independently with separate filters; all 5 states reachable.

---

## 6) Screen — Purchase invoice editor (`/purchasing/invoices/new`) — central

### 6.1 Purpose
The default direct-purchase workflow: receive + bill in one document; on approve → `in` movement + weighted-avg cost update + supplier balance increase.

### 6.2 Layout — 3 zones
- **Zone 1 Header:** supplier ✱ (picker + quick-add) · supplier_invoice_no · date ✱ · warehouse ✱ · payment_method · **inbound ETA link** (attach a received UUID, §10) · notes.
- **Zone 2 Line grid:** add by search / sequential **barcode scan**; columns item · qty · uom (multi-unit; buy in carton, store in base) · purchase_price · line_discount · tax_type (input VAT) · line_total. Full keyboard; live recompute. Pre-filled when `?from=lowstock`.
- **Zone 3 Totals + additional costs:** subtotal · discount · tax (input) · **additional costs** (optional, §6.4) · grand total. Buttons: `save draft` (always) · `approve` (generates `in` + cost update + balance).

### 6.3 Field rules
- purchase_price defaults to last purchase price (editable). On approve, weighted-avg cost recomputes per affected item (shown post-approve in the item ledger, FE_01 §4.6).
- Approve is the commit point; draft has no stock/cost/balance effect.

### 6.4 Additional costs (distributed by value)
Optional field (freight, handling). When entered, distributed across lines **proportionally by line value** into item cost (true landed cost, simple). A popover shows the per-line distribution preview before approve. Complex customs/import deferred.

### 6.5 Five states
Loading (skeleton) · empty (= fresh editor) · error (save/approve → toast, keep data) · offline (entry works locally, `local/syncing/synced`; approve queues; cost/balance reconcile on sync) · readiness (approve disabled if no lines or missing supplier/warehouse — named inline).

### 6.6 Responsive / Permissions
Desktop 3 zones; mobile header accordion → grid cards → sticky totals + approve. `purchasing.invoice.create`; approve needs `purchasing.invoice.approve`; price/cost editable with create; warehouse scoped.

### 6.7 AR / EN
| key | AR | EN |
|---|---|---|
| purchasing.editor.supplier | المورّد | Supplier |
| purchasing.editor.supplier_inv_no | رقم فاتورة المورد | Supplier invoice no. |
| purchasing.editor.eta_link | ربط فاتورة ETA واردة | Link inbound e-invoice |
| purchasing.editor.additional_costs | تكاليف إضافية | Additional costs |
| purchasing.editor.distribute_hint | تُوزَّع على الأصناف بالتناسب بالقيمة | Distributed across items proportionally by value |
| purchasing.editor.save_draft | حفظ كمسودة | Save draft |
| purchasing.editor.approve | اعتماد | Approve |

### 6.8 Acceptance
Approving a purchase invoice (or receipt) creates an `in` movement and updates weighted-avg cost; additional costs distribute by value into item cost; supplier balance updates; draft has no effect.

---

## 7) PO + Goods receipt (advanced mode) (`/purchasing/orders*`)

**PO editor:** supplier ✱, date, expected_delivery, receiving warehouse ✱, lines (item, qty, uom, price, line_total). Status `draft → sent → partially_received → completed → cancelled`. Pre-fillable from low-stock.
**PO list:** no · supplier · date · expected · receipt status · total · actions (view/receive/cancel).
**Goods receipt (`/:id/receive`):** lines show ordered qty + **received qty** input (may be partial). On post → `in` movement + cost update for received lines. PO stays open (`partially_received`) until fully received → `completed`.
**Matching:** simple link invoice ↔ receipt with discrepancy display; no heavy 3-way match.
**States:** all 5; offline → receipt entry queues. **Permissions:** `purchasing.order.create`, `purchasing.receipt.create`.
**AR/EN:** `purchasing.orders.title`="أوامر الشراء"/"Purchase orders", `purchasing.po.expected`="التوريد المتوقّع"/"Expected delivery", `purchasing.receipt.title`="استلام البضاعة"/"Goods receipt", `purchasing.receipt.ordered`="المطلوب"/"Ordered", `purchasing.receipt.received`="المستلَم"/"Received".
**Acceptance:** PO supports multiple partial receipts; only `completed` when fully received; each receipt writes an `in` movement.

---

## 8) Purchase return (`/purchasing/invoices/:id/return`, `/purchasing/returns`)

Linked to a source purchase invoice. Pick lines + qty + **required reason**; generates `out` movement + reduces supplier balance; ETA note if needed. Shows stock + balance effect and remaining returnable qty (≤ source).
**List:** no · date · source invoice · supplier · value · reason · actions.
**States:** all 5. **Permissions:** `purchasing.return.create`.
**AR/EN:** `purchasing.return.title`="مرتجعات الشراء"/"Purchase returns", `purchasing.return.reason`="سبب الإرجاع"/"Return reason", `purchasing.return.effect`="أثر المخزون والرصيد"/"Stock & balance effect".
**Acceptance:** return ≤ source qty; reason required; writes `out` + reduces supplier balance.

---

## 9) Payment voucher (`/purchasing/vouchers`, `/new`) + Pay modal

From supplier statement or invoice. Fields: supplier/invoice(s), amount (default = balance), method (cash/transfer/wallet), treasury/bank, date. Supports **partial + multiple**; updates supplier balance + payment pill.
**List:** no · date · supplier · invoice(s) · amount · method · treasury.
**States:** all 5. **Permissions:** `purchasing.payment.create`.
**AR/EN:** `purchasing.voucher.title`="سندات الدفع"/"Payment vouchers", `purchasing.voucher.amount`="المبلغ"/"Amount", `purchasing.voucher.method`="طريقة الدفع"/"Method", `purchasing.voucher.treasury`="الخزينة/البنك"/"Treasury/Bank".
**Acceptance:** partial/multiple supported; updates balance + pay status; feeds Accounting later.

---

## 10) Screen — Inbound ETA hub (`/purchasing/inbound-eta`) — differentiator

### 10.1 Purpose
Receive supplier e-invoices from ETA, **accept/reject within 72h**, and **match** to (or create) an internal purchase invoice — the condition for input-VAT credit. Mirrors the protection framing of the Sales ETA hub.

### 10.2 Layout
KPI row → alerts → inbound table.
**KPIs (`KpiCard`):** **deductible input VAT** (value of accepted+matched) · invoices nearing 72h window (count + min remaining) · pending (count) · rejected (count).
**Alerts band:** "You have {n} supplier invoices nearing the 72h response window" (escalating), each linking to the filtered list.
**Inbound table:** UUID (LTR) · supplier · value · tax · status pill · **window remaining** (72h countdown, escalating color) · matched-to (PI link or "unmatched"). Actions per row: `accept` / `reject` (`AlertDialog`), `match to PI` (drawer: pick existing PI or **create PI from this** → pre-fills editor §6), `view`.

### 10.3 Window countdown
Per `pending` invoice: remaining time vs 72h; color muted→warning→danger; danger surfaces in the alert band. Drives "we protect your input-VAT deduction" value.

### 10.4 States
Loading (skeleton) · empty ("no inbound invoices", positive) · error · **offline** (matching/accept/reject require connection → actions disabled with a clear "needs connection" note; state shown on return).
**Permissions:** `purchasing.inbound.view`; accept/reject `purchasing.inbound.respond`; create-PI needs `purchasing.invoice.create`.

### 10.5 AR / EN
| key | AR | EN |
|---|---|---|
| purchasing.inbound.title | فواتير ETA الواردة | Inbound e-invoices |
| purchasing.inbound.deductible | ضريبة مدخلات قابلة للخصم | Deductible input VAT |
| purchasing.inbound.nearing | فواتير قاربت نافذة الرد | Invoices nearing response window |
| purchasing.inbound.window_left | متبقٍّ {{t}} على نافذة الرد | {{t}} left to respond |
| purchasing.inbound.accept | قبول | Accept |
| purchasing.inbound.reject | رفض | Reject |
| purchasing.inbound.match | مطابقة بفاتورة شراء | Match to purchase invoice |
| purchasing.inbound.create_pi | إنشاء فاتورة شراء منها | Create purchase invoice from it |
| purchasing.inbound.needs_connection | المطابقة تتطلب اتصالاً بالإنترنت | Matching requires an internet connection |

### 10.6 Acceptance
Inbound supplier e-invoices can be accepted/rejected within 72h (live countdown) and matched to/created as a purchase invoice; accepted+matched value feeds the deductible input-VAT KPI; matching requires connection.

---

## 11) Module-wide RTL, numbers, offline, performance

- Western digits + `tabular-nums`; `ج.م` (EGP only v1); TRN/UUID LTR within RTL (bidi tested); return/transfer arrows mirror.
- **Offline:** receipt + purchase-invoice entry work locally then sync (`local/syncing/synced`) — less critical than POS but same principle; **inbound ETA matching needs connection** and shows state clearly on return; conflicts surfaced, never silent.
- **Performance:** fast line grid (dozens of lines, no jank); server-side pagination for purchases/suppliers; inbound ETA matching async (non-blocking).

---

## 12) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Supplier | list, card+statement | ✓ | ✓ | supplier.* | ✓ |
| Purchase invoice | list, editor(3-zone), view | ✓ | ✓ | invoice.create/approve | ✓ |
| Purchase order | list, editor, view (advanced) | ✓ | ✓ | order.create | ✓ |
| Goods receipt | receive screen (advanced) | ✓ | ✓ | receipt.create | ✓ |
| Purchase return | linked editor, list, view | ✓ | ✓ | return.create | ✓ |
| Payment voucher | pay modal, list | ✓ | ✓ | payment.create | ✓ |
| Inbound e-invoice | inbound hub | ✓ | ✓ | inbound.view/respond | ✓ |

## 13) Module acceptance criteria
1. A purchase invoice (or goods receipt) creates an `in` movement and updates weighted-avg cost.
2. Supplier balance is computed from documents, never edited directly.
3. Additional costs distribute across lines proportionally by value into item cost.
4. A PO supports multiple partial receipts and is `completed` only when fully received.
5. Inbound supplier e-invoices can be accepted/rejected within 72h and matched to a purchase invoice for input-VAT credit.
6. Default flow is direct purchase; full PO→receipt→invoice chain appears only in advanced mode.
7. Low-stock deep-link pre-fills a PO/PI from the selected items; every data screen has all 5 states; everything RTL via i18n keys.

**Fixtures:** `Flexova_FE_03_Purchasing.fixtures.json` (Egyptian context — suppliers with/without TRN, statements, direct + advanced purchases, partial receipt, return, vouchers, inbound e-invoices with 72h countdown incl. nearing-window + unmatched).

*End of FE_03 Purchasing — version 1.0*
