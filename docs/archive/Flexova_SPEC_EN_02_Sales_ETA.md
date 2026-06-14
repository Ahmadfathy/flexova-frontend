# Flexova — Sales + ETA Spec (EN, build-ready)

> Layer 2, Core module 2. Compliance core (the wedge).
> Depends on: Design System, Inventory specs. v1.
> Note: exact ETA figures (windows, field counts, status enum) follow current ETA SDK; confirm at build.

## 1. Scope
**In:** quotations, sales invoices, returns (credit notes), debit notes, payment receipts, full **ETA layer** (e-invoice B2B + e-receipt B2C), signing, submission + statuses, rejection/resend, legal cancel/amend, compliance hub.
**Out (on top):** full POS UI (Retail layer — but e-receipt/sign/sync logic defined here is reused); recurring billing; quantity-break tiers.
**Golden rule:** an ETA-accepted invoice is **never deleted/edited** — correct via credit/debit note or cancel within legal window. UI enforces this.

## 2. ETA model (critical)
| | e-invoice (B2B) | e-receipt (B2C) |
|---|---|---|
| Model | **pre-clearance** — not finally valid before ETA acceptance | **post-clearance** — finish sale, submit within window (24–72h, confirm on SDK) |
| Pace | near-real-time clearance | queue within window |
| Buyer | requires **TRN** (+UIN); validate | simplified; national ID only above legal limit |
| Device | — | each POS activated/authenticated with ETA (access token); e-seal signed; structured format only |

## 3. Entities (✱ required)

### 3.1 Sales Invoice (central)
**Header:** invoice_no (per-branch sequence), eta_channel `e-invoice`/`e-receipt` (auto from buyer TRN + manual override), customer✱ (B2B needs TRN+UIN; B2C simplified), date✱, warehouse✱, branch, payment_method (cash/credit/transfer/wallet/Fawry), notes.
**Lines:** item · description · qty · uom (ETA unit code) · price · line_discount · tax_type (T1 VAT…/T2…) · line_total.
- item pulls **eta_code (EGS/GS1)** + tax_type from Inventory. Line without code = submit blocker.
- **price** auto-pulled from customer's **price list** (Inventory 2.3), per-line override.
**Totals:** subtotal · discount · taxable base · tax (by type) · grand total.
**ETA fields (post-issue):** UUID · Long ID · status · accept timestamp · QR/link · Validation Report.

### 3.2 Quotation — invoice-like, no stock/ETA effect; status draft/sent/accepted/rejected/expired; "convert to invoice".
### 3.3 Credit Note (return) — linked to source invoice; returned lines + reason; generates stock **in**; linked ETA note; ≤ source value.
### 3.4 Debit Note — increase on source invoice; linked + submitted.
### 3.5 Payment Receipt — internal payment voucher (distinct from e-receipt tax doc). Fields: invoice/customer, amount, method, treasury/bank, date. Supports partial + multiple.
### 3.6 ETA Document (attached) — type(invoice/credit/debit) · channel · UUID · status · timestamps · errors · signature · environment.
### 3.7 ETA Settings (tenant) — TRN, activity, e-seal/X.509 (HSM/USB token), **environment sandbox↔production**, numbering, send behavior, enabled tax types.

## 4. Flows
- **B2B credit invoice → e-invoice:** pick customer (TRN) → add items → auto discount/tax → ETA readiness panel (shows missing) → **issue & submit** → UUID + status → print/share.
- **B2C cash → e-receipt:** cash customer → items → collect → issue e-receipt → print/QR. (Reused by POS.)
- **Return:** open accepted invoice → create credit note → pick lines/qty + reason → issue → stock-in + linked ETA note.
- **ETA rejection:** invoice shows `rejected` + plain-language reason → "fix & resend" opens offending field.
- **Cancel/amend after acceptance:** no edit; only cancel (within window, B2B w/ buyer approval) OR credit/debit note. UI hides edit, shows correct paths.
- **Offline:** issue + print + deliver offline; enters ETA send queue; per-doc `local/queued/accepted/rejected`. Warn if a B2C doc nears its window.

## 5. Screens
- **Invoices list:** dual filters **payment status** + **ETA status** (separate); columns no·date·customer·total·pay-pill·eta-pill·actions; compact; row actions (view/print/return/resend/cancel).
- **Invoice editor (central):** 3 zones — header · fast line grid (search/barcode, full keyboard, live tax/totals) · totals + **ETA readiness panel** (lists missing: item eta_code, buyer TRN, e-seal; disables "issue & submit" with reason). Buttons: save draft (always) / issue & submit (gated).
- **Issued invoice:** official view + UUID + QR + ETA status; actions print PDF (AR/EN), share (WhatsApp/email), download, create return, cancel(gated), collect; rejected shows reason + fix&resend.
- **Credit/Debit notes:** linked editor, required reason, shows remaining noteable value.
- **Quotations:** list + editor + convert.
- **Payment receipt:** from invoice or standalone; partial/multiple; updates payment status.
- **ETA hub (compliance/sync):** docs by ETA status (queued/rejected/unsent/accepted); bulk resend; KPIs (acceptance rate, top rejection reasons, docs nearing window); persistent offline indicator.
- **ETA settings:** TRN, e-seal, sandbox/production toggle, numbering, send behavior, tax types; onboarding **wizard** links account + tests on sandbox first.

## 6. States — two orthogonal dimensions (never merged)
- **Payment (pills):** paid(success) · partial(warning) · credit(warning) · returned(neutral).
- **ETA (pills):** draft · unsent · queued · **clearing** (B2B pre-clearance, before acceptance) · valid(success) · rejected(danger) · cancelled(neutral) · buyer-rejected(danger, 72h).
- All 5 data states per Design System §8. Rejection = plain-Arabic reason + offending field + fix action.
- **Submit blocking (this module's rule):** save-as-draft always allowed; **submit blocked** when missing (item eta_code/GS1, tax_type, B2B TRN, e-seal not configured) — explicit readiness panel.

## 7. Send behavior — **Hybrid, two rhythms (locked)**
- **B2B/e-invoice:** near-real-time clearance; not shown "finally valid" before ETA acceptance (`clearing`). Stronger urgency.
- **B2C/e-receipt:** issue+print immediately, background submit within window (24–72h); offline → queue + **red alert** as window nears.
- No scheduled batch. Same path reused in POS.

## 8. Integrations
ETA SDK (e-seal/X.509 HSM/USB; sandbox/prod; EGS/GS1; unit codes; tax types; UUID/QR/Validation Report; TRN/UIN validation). Inventory (out movement, item tax/price). CRM (buyer data). Accounting (collection, journal). Local pay (Fawry/wallets/transfer). Print/share (bilingual PDF + QR + WhatsApp).

## 9. Print template (locked)
Standard bilingual template, **mandatory fields locked** (seller/buyer, item codes, tax breakdown, total, UUID, QR) + **limited per-tenant customization** (logo, trade name, theme colors, footer/notes) without touching mandatory fields. Sizes: **A4** + **80mm thermal roll** (POS).

## 10. Decisions (v1, locked)
- e-invoice vs e-receipt = auto from buyer TRN + manual override.
- Send = hybrid two rhythms (B2B clearance / B2C window queue).
- Invoice numbering = **per-branch sequence** (branch prefix).
- Currency = EGP only.
- Down payments / installment billing = **in core**.
- Print = standard locked template + limited customization + A4/80mm.
- New tenant starts in **sandbox** (persistent "test mode" indicator); switch to production = explicit confirm in ETA settings.

## 11. Acceptance criteria
- Payment status and ETA status are stored and displayed independently.
- "Issue & submit" is disabled whenever any submit blocker exists; the panel names each blocker.
- Accepted invoices cannot be edited or deleted; only cancel(window)/credit/debit available.
- B2C e-receipt issues and prints with zero network; syncs within window; warns before expiry.
- B2B e-invoice is not labeled valid until ETA acceptance returns.
- Rejection reasons render in plain Arabic, never raw codes.
