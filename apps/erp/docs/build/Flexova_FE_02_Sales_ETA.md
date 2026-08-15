# Flexova — FE_02 Sales + ETA (build-ready)

> **Phase 4 — Core module 2.** Sales & ETA frontend spec. This is the compliance core (the wedge). Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — June 2026
> **Source of truth (do not redefine):** `Flexova_SPEC_EN_02_Sales_ETA` + `Flexova_UIUX_02_Sales_ETA` + `Flexova_ETA_Update_Jun2026` (regulatory) · `Flexova_FE_00_Foundation` (tokens/components/shell/i18n) · `Flexova_FE_01_Inventory` (item: price/tax/eta_code/units).
> **Two golden rules (carried):** (1) Payment status and ETA status are **independent**, never merged. (2) An ETA-accepted invoice is **never edited or deleted** — correct via credit/debit note or cancel within the legal window. The UI enforces both.
> **Precision note:** exact ETA figures (windows 24–72h, field counts, status enum, penalty amounts) follow the current ETA SDK + Jun-2026 regulatory state; treat them as configurable, confirm at build.

---

## 0) Module scope (recap)

**In v1:** quotations, sales invoices, returns (credit notes), debit notes, payment receipts, full **ETA layer** (e-invoice B2B + e-receipt B2C), signing/e-seal, submission + statuses, rejection/resend, legal cancel/amend, compliance hub, ETA settings + onboarding wizard.
**Out (built on top):** full POS UI (Retail layer — but e-receipt/sign/sync logic here is reused), recurring billing, quantity-break tiers.

Consumes Inventory items via the mock layer (price from customer's price list, tax_type, eta_code, ETA unit code). Missing item ETA data is resolved **here** as a submit blocker. Data via `lib/mock/client.ts` reading `sales.fixtures.json`.

---

## 1) ETA model (the spine — drives the whole UI)

| | e-invoice (B2B) | e-receipt (B2C) |
|---|---|---|
| Model | **pre-clearance** — not finally valid before ETA acceptance | **post-clearance** — finish sale, submit within window (24–72h) |
| UI consequence | never labeled "valid" before acceptance → state `clearing` | issue + print immediately; background submit; **window countdown** |
| Pace | near-real-time clearance, higher urgency | queue within window |
| Buyer | requires **TRN** (9 digits) + UIN; validate | simplified; national ID only above legal limit |
| Device | — | each POS activated/authenticated with ETA (access token) + e-seal (POS layer; base in ETA settings) |

**Channel auto-detection:** buyer has a valid TRN → `e-invoice (B2B)`; cash/no TRN → `e-receipt (B2C)`. Manual override available in the header.

---

## 2) Routes & IA

Mounts under shell nav `nav.sales`. Secondary **Tabs** below `PageHeader`.

```
/sales                          → redirect → /sales/invoices
/sales/invoices                 → Invoices list                       [§4]
/sales/invoices/new             → Invoice editor (3 zones)            [§5]
/sales/invoices/:id             → Issued invoice (or editor if draft) [§6]
/sales/invoices/:id/return      → Credit note editor (linked)        [§7]
/sales/quotations               → Quotations list                     [§9]
/sales/quotations/new           → Quotation editor                    [§9]
/sales/quotations/:id           → Quotation view                      [§9]
/sales/credit-notes             → Credit notes list                   [§7]
/sales/credit-notes/:id         → Credit note view                    [§7]
/sales/debit-notes              → Debit notes list                    [§7]
/sales/debit-notes/new          → Debit note editor                   [§7]
/sales/receipts                 → Payment receipts list               [§8]
/sales/receipts/new             → Payment receipt                     [§8]
/sales/eta-hub                  → ETA compliance & sync hub           [§10]
/sales/settings/eta             → ETA settings + onboarding wizard    [§11]
```

**Secondary tabs:** Invoices · Quotations · Credit notes · Debit notes · Receipts · ETA hub. (ETA settings lives under admin/gear, gated by permission.)
**Modals/drawers:** Customer quick-pick + quick-add (modal) · Item quick-add (reuses FE_01 §5) · Collect payment (modal, §8) · Cancel invoice (`AlertDialog`, gated) · Fix & resend (drawer focusing the offending field, §6.4) · Print preview (modal, A4/80mm toggle, §12) · Share (WhatsApp/email, modal).
**i18n namespace:** `sales`. AR default, EN mirror — strings tabled per section.

---

## 3) Two orthogonal state systems (never merged) — used everywhere

**A) Payment status (`StatusPill`):** `paid`(success) · `partial`(warning) · `credit`(warning) · `returned`(neutral).

**B) ETA status (`StatusPill` / `EtaBadge` family):**
| key | pill tone | meaning |
|---|---|---|
| `draft` | neutral | not issued |
| `unsent` | neutral | issued, not yet submitted |
| `queued` | warning | in send queue (offline/B2C window) |
| `clearing` | brand | B2B submitted, awaiting acceptance — **not valid yet** |
| `valid` | success | ETA accepted |
| `rejected` | danger | ETA rejected — needs fix & resend |
| `cancelled` | neutral | legally cancelled within window |
| `buyer_rejected` | danger | buyer rejected within 72h |

Invoices list shows **two separate pill columns** and **two separate filters**. A doc can be `paid` + `rejected` simultaneously — both shown, never collapsed into one "status".

**Submit blocking (module rule):** save-as-draft **always** allowed; **issue & submit blocked** when any blocker exists: item missing `eta_code`/GS1, missing `tax_type`, B2B missing buyer TRN, e-seal not configured, environment not set. A readiness panel names each blocker (§5.4).

---

## 4) Screen — Invoices list (`/sales/invoices`)

### 4.1 Purpose
Browse/search/filter invoices on **two independent axes** (payment + ETA); entry to create, view, print, return, resend, cancel.

### 4.2 Layout
Shell `main`. `PageHeader` (title + actions) → secondary Tabs → toolbar (search + **dual filters**) → `DataTable`.

### 4.3 Components
**PageHeader actions:** `+ sales.invoice.new` (primary) · `export` · `print`.
**Toolbar:** SearchInput (no/customer/TRN); **Payment-status filter** (select: all/paid/partial/credit/returned); **ETA-status filter** (select: all/draft/unsent/queued/clearing/valid/rejected/cancelled/buyer_rejected); date range; branch; customer. Active filters as removable chips.
**DataTable columns** (start→end): select · no (per-branch, `.num`, LTR) · date · customer (name + TRN muted) · channel chip (B2B/B2C) · total (`formatMoney`, end) · **payment pill** · **ETA pill** · actions menu.
- Row click → invoice view. Row actions: `view` · `print` · `collect` (if not fully paid) · `return` (if accepted) · `resend` (if rejected/queued) · `cancel` (gated, within window). Accepted invoices: **no edit/delete** in menu.
- Bulk bar: print · export · **bulk resend** (queued/rejected only).

### 4.4 Five states
- **Loading:** skeleton rows. **Empty:** EmptyState + `+ new invoice` + (if no ETA setup) hint linking to onboarding. **Error:** ErrorState + retry. **No results:** distinct, echoes filters. **Offline:** persistent `OfflineBanner`; ETA pill shows `queued` with a sync chip; **B2C docs nearing window** get a red countdown chip.

### 4.5 Responsive
Desktop full table; tablet hides channel/branch; mobile → card list (no + customer + total + both pills stacked + actions). Filters → popover.

### 4.6 Permissions (`sales.invoice.*`)
No `view` → module hidden. No `create` → hide new. No `submit` → can save drafts but "issue & submit" hidden. No `cancel` → hide cancel. No `collect` → hide collect. Resend needs `sales.eta.resend`. Branch scope filters list + numbering.

### 4.7 AR / EN
| key | AR | EN |
|---|---|---|
| sales.invoices.title | الفواتير | Invoices |
| sales.invoice.new | فاتورة جديدة | New invoice |
| sales.filters.payment | حالة الدفع | Payment status |
| sales.filters.eta | حالة الفاتورة الإلكترونية | E-invoice status |
| sales.pay.paid | مدفوعة | Paid |
| sales.pay.partial | مدفوعة جزئياً | Partially paid |
| sales.pay.credit | آجلة | Credit |
| sales.pay.returned | مرتجعة | Returned |
| sales.eta.draft | مسودة | Draft |
| sales.eta.unsent | غير مُرسَلة | Unsent |
| sales.eta.queued | في الطابور | Queued |
| sales.eta.clearing | قيد الاعتماد | Clearing |
| sales.eta.valid | مقبولة | Valid |
| sales.eta.rejected | مرفوضة | Rejected |
| sales.eta.cancelled | ملغاة | Cancelled |
| sales.eta.buyer_rejected | رفضها المشتري | Buyer rejected |

### 4.8 Acceptance
Payment and ETA stored/displayed independently with two filters and two columns; accepted invoices expose no edit/delete; all 5 states reachable.

---

## 5) Screen — Invoice editor (`/sales/invoices/new`) — central screen

### 5.1 Purpose
Build an invoice fast (search/barcode, full keyboard), see live tax/totals, and only allow submit when ETA-ready.

### 5.2 Layout — 3 zones
- **Zone 1 Header** (top): customer ✱ (CRM picker or "cash customer"; B2B reveals TRN+UIN, validated) · channel (auto + override chip) · date ✱ · warehouse ✱ · branch · payment_method (cash/credit/transfer/wallet/Fawry) · notes.
- **Zone 2 Line grid** (center, dominant): add by search or sequential **barcode scan**; columns item · description · qty · uom (ETA unit code) · price (auto from customer's price list, per-line override) · line_discount · tax_type · line_total. Full keyboard entry; live recompute.
- **Zone 3 Totals + ETA readiness panel** (`end` rail on desktop, below on mobile): subtotal · discount · taxable base · tax (broken down by type) · grand total; then the **readiness panel** (§5.4). Buttons: `save draft` (always) · `issue & submit` (gated).

### 5.3 Field rules
- TRN: 9 digits, validated (mock check); invalid → blocks B2B submit, surfaces in panel.
- Price defaults from customer's price list (FE_01 §7); per-line override allowed and flagged.
- Line without item `eta_code` → blocker; the line shows a danger marker + panel entry.
- Down payment supported (collect a partial against the invoice on issue).

### 5.4 ETA readiness panel (the gate)
Lists every blocker as a plain-language item with a "fix" link that focuses the offending control:
- "Item «X» has no EGS/GS1 code" → opens item quick-edit.
- "Buyer TRN missing/invalid" → focuses TRN.
- "Tax type missing on line N" → focuses that cell.
- "E-seal not configured" / "Environment not set" → links to ETA settings.
When the list is empty → `issue & submit` enabled and shows the channel + environment (e.g. "will submit as e-invoice · sandbox").

### 5.5 Issue behavior (hybrid, two rhythms)
- **B2B:** on submit → state `clearing`, panel shows "awaiting ETA acceptance"; **not** shown valid until acceptance returns (then `valid` + UUID/QR). If acceptance fails → `rejected` (§6.4).
- **B2C:** on issue → immediately printable/shareable; ETA submitted in background within the window; state `queued` → `valid`. If offline → stays `queued` with a **window countdown** that escalates visually as it nears expiry; red alert near the deadline.
- Online B2C still submits near-immediately but never blocks the UI (async, progress indicator).

### 5.6 Five states
Loading (skeleton header+grid) · empty (= fresh editor) · error (save/submit → toast, keep data) · offline (issue/print work; submit queued; countdown for B2C) · readiness-incomplete (submit disabled with named blockers).

### 5.7 Responsive
Desktop: 3 columns (header full width, grid + rail). Tablet: rail collapses under grid. Mobile: header accordion → grid (card rows) → sticky totals bar with `issue & submit`; barcode scan via camera.

### 5.8 Permissions
`sales.invoice.create` to build; `sales.invoice.submit` to issue (else only draft); price override may need `sales.price.override`; warehouse/branch scoped.

### 5.9 AR / EN
| key | AR | EN |
|---|---|---|
| sales.editor.customer | العميل | Customer |
| sales.editor.cash_customer | عميل نقدي | Cash customer |
| sales.editor.trn | الرقم الضريبي | Tax Reg. No. (TRN) |
| sales.editor.channel_auto | يُحدَّد آلياً | Auto-detected |
| sales.editor.save_draft | حفظ كمسودة | Save draft |
| sales.editor.issue | إصدار وإرسال | Issue & submit |
| sales.readiness.title | جاهزية الفاتورة الإلكترونية | E-invoice readiness |
| sales.readiness.ready | جاهزة للإرسال | Ready to submit |
| sales.readiness.no_eta_code | الصنف «{{item}}» بدون كود EGS/GS1 | Item "{{item}}" has no EGS/GS1 code |
| sales.readiness.no_trn | الرقم الضريبي للعميل ناقص أو غير صحيح | Buyer TRN is missing or invalid |
| sales.readiness.no_seal | الختم الإلكتروني غير مُهيّأ | E-seal is not configured |
| sales.editor.will_submit | سيتم الإرسال كـ {{channel}} · {{env}} | Will submit as {{channel}} · {{env}} |

### 5.10 Acceptance
"Issue & submit" disabled whenever a blocker exists; panel names each blocker. B2B never labeled valid pre-acceptance. B2C issues/prints with zero network and queues with a countdown. Price defaults from price list, overridable per line.

---

## 6) Screen — Issued invoice view (`/sales/invoices/:id`)

### 6.1 Purpose
Official record + ETA evidence + lifecycle actions. (Drafts open the editor instead.)

### 6.2 Layout
Two-pane: official invoice preview (`start`) + side panel (`end`) with: ETA block (channel, **UUID**, **Long ID**, **status pill**, accept timestamp, **QR**, Validation Report link), payment block (status, collected, balance), and actions.

### 6.3 Actions
`print` (PDF, AR/EN, A4/80mm) · `share` (WhatsApp/email) · `download` · `collect` (if balance>0) · `create return` (credit note, if `valid`) · `cancel` (gated: within window; B2B requires buyer approval) · `resend` (if `rejected`/`queued`). **No edit/delete** for accepted invoices — those affordances are absent, replaced by return/debit/cancel.

### 6.4 Rejection handling
`rejected` → banner with **plain-Arabic reason** (never raw codes, e.g. "الرقم الضريبي للعميل غير صحيح" not "Error 422") + the offending field + **Fix & resend** button → opens a focused drawer on that field → resubmit. Repeated rejections keep the reason history.

### 6.5 States
Loading (skeleton preview) · error · offline (`queued`/countdown for B2C; actions print/share work) · rejected (above) · cancelled (read-only, watermark). No empty/no-results here.

### 6.6 Responsive
Desktop two-pane; mobile → preview first, ETA/actions in a bottom sheet; QR enlarges on tap.

### 6.7 Permissions
`view`; `cancel` gated by `sales.invoice.cancel` + window; `resend` by `sales.eta.resend`; `collect` by `sales.payment.collect`.

### 6.8 AR / EN
| key | AR | EN |
|---|---|---|
| sales.issued.uuid | المعرّف الإلكتروني (UUID) | UUID |
| sales.issued.long_id | المعرّف الطويل | Long ID |
| sales.issued.qr | رمز QR | QR code |
| sales.issued.validation | تقرير التحقق | Validation report |
| sales.issued.cancel | إلغاء الفاتورة | Cancel invoice |
| sales.issued.cancel_confirm | الإلغاء متاح خلال المهلة القانونية فقط وقد يتطلب موافقة المشتري. متابعة؟ | Cancellation is only allowed within the legal window and may require buyer approval. Continue? |
| sales.issued.fix_resend | صحّح وأعد الإرسال | Fix & resend |
| sales.issued.no_edit | الفواتير المقبولة لا تُعدَّل — استخدم إشعار دائن/مدين أو الإلغاء | Accepted invoices can't be edited — use a credit/debit note or cancel |

### 6.9 Acceptance
Accepted invoices cannot be edited/deleted; only cancel(window)/credit/debit. UUID+QR+status displayed. Rejection renders plain Arabic with a fix path.

---

## 7) Credit notes / Debit notes (`/sales/credit-notes`, `/sales/debit-notes`)

**Credit note (return):** opened from a `valid` invoice (`/:id/return`). Linked to source; pick lines + qty + **required reason**; shows **remaining noteable value** (≤ source). On issue → stock **in** movement (FE_01 ledger) + linked ETA note submitted. 
**Debit note:** increase on a source invoice (price diff/fees); linked + submitted.
**Lists:** no · date · linked invoice · customer · value · ETA pill · actions.
**States:** all 5; offline → queued. **Permissions:** `sales.creditnote.create` / `sales.debitnote.create`.
**AR/EN:** `sales.credit.title`="المرتجعات وإشعارات الدائن"/"Returns & credit notes", `sales.credit.reason`="سبب الإرجاع"/"Return reason", `sales.credit.remaining`="القيمة المتبقية القابلة للإشعار"/"Remaining noteable value", `sales.debit.title`="إشعارات المدين"/"Debit notes".
**Acceptance:** credit ≤ source value; reason required; stock-in generated; ETA note linked to source.

---

## 8) Payment receipt (`/sales/receipts`, `/new`) + Collect modal

**Distinct from e-receipt:** an internal payment voucher, not an ETA tax doc — never conflated in UI copy.
**Collect modal (from invoice):** amount (default = balance), method (cash/transfer/wallet/Fawry), treasury/bank (select), date. Supports **partial + multiple**; updates the invoice **payment** pill (not ETA).
**Standalone receipt:** pick customer + open invoices to apply against.
**List:** no · date · customer · invoice(s) · amount · method · treasury.
**States:** all 5. **Permissions:** `sales.payment.collect`.
**AR/EN:** `sales.receipt.title`="سندات التحصيل"/"Payment receipts", `sales.receipt.amount`="المبلغ"/"Amount", `sales.receipt.method`="طريقة الدفع"/"Method", `sales.receipt.treasury`="الخزينة/البنك"/"Treasury/Bank", `sales.receipt.partial`="تحصيل جزئي"/"Partial payment".
**Acceptance:** partial/multiple supported; updates payment status only; feeds Accounting later.

---

## 9) Quotations (`/sales/quotations`, `/new`, `/:id`)

Invoice-like editor with **no stock/ETA effect**. Status: `draft`/`sent`/`accepted`/`rejected`/`expired`. **Convert to invoice** button carries lines/customer into a new invoice editor.
**List:** no · date · customer · total · status · valid-until · actions (view/convert/duplicate).
**States:** all 5. **Permissions:** `sales.quotation.*`.
**AR/EN:** `sales.quote.title`="عروض الأسعار"/"Quotations", `sales.quote.convert`="تحويل لفاتورة"/"Convert to invoice", statuses "مسودة|مرسَل|مقبول|مرفوض|منتهي"/"Draft|Sent|Accepted|Rejected|Expired".
**Acceptance:** no stock/ETA effect before conversion; convert pre-fills an invoice.

---

## 10) Screen — ETA hub (`/sales/eta-hub`) — "compliance as protection"

### 10.1 Purpose
Not just a sync board — a **protection tool** against the tiered penalty system (Jun-2026 update): surface flag/tier status, late docs, acceptance rate, and proactive warnings.

### 10.2 Layout
KPI row → alerts band → queues table.
**KPIs (`KpiCard`):** acceptance rate (%) · docs nearing window (count, with min remaining) · rejected (count) · **compliance tier/flag** (warning over a 12-month window: tier 1 warning / tier 2 / tier 3).
**Alerts band:** proactive, escalating: "You have {n} B2C docs nearing the submission window" · "You're at tier 2 — correct within {x} days" · "{n} rejected docs need attention". Each links to the filtered queue.
**Queues table:** docs grouped/filterable by ETA status (queued/rejected/unsent/clearing/valid); columns no · type (invoice/credit/debit) · channel · status · **window remaining** (B2C, countdown, escalating color) · reason (if rejected). Bulk **resend**.
**Environment indicator:** persistent **sandbox/test-mode** badge when not in production. Persistent offline indicator.

### 10.3 States
Loading (skeleton KPIs+rows) · empty ("everything submitted — you're compliant", positive) · error · offline (queue grows; countdowns active). 

### 10.4 Window countdown (critical feature, not enhancement)
Per B2C queued doc: remaining time vs its 24–72h window; color escalates muted→warning→danger as it nears; danger triggers an alert-band entry. Drives the "we protect you from penalties" value.

### 10.5 Permissions
`sales.eta.hub.view`; bulk resend `sales.eta.resend`; settings link gated by `sales.eta.settings`.

### 10.6 AR / EN
| key | AR | EN |
|---|---|---|
| sales.hub.title | مركز الفاتورة الإلكترونية | E-invoice hub |
| sales.hub.acceptance | نسبة القبول | Acceptance rate |
| sales.hub.nearing | مستندات قاربت نافذة الإرسال | Docs nearing submission window |
| sales.hub.rejected | مستندات مرفوضة | Rejected docs |
| sales.hub.tier | مستوى الالتزام | Compliance tier |
| sales.hub.tier2_warn | أنت في المستوى الثاني — صحّح خلال {{x}} يوم | You're at tier 2 — correct within {{x}} days |
| sales.hub.window_left | متبقٍّ {{t}} على نافذة الإرسال | {{t}} left in submission window |
| sales.hub.bulk_resend | إعادة إرسال المحدد | Resend selected |
| sales.hub.test_mode | وضع تجربة (sandbox) | Test mode (sandbox) |

### 10.7 Acceptance
Hub shows acceptance rate, rejection reasons, docs nearing window with live countdown, and compliance tier with proactive alerts; bulk resend works; persistent sandbox indicator when applicable.

---

## 11) ETA settings + onboarding wizard (`/sales/settings/eta`)

**Settings:** business TRN + activity · **e-seal/X.509** (HSM or USB token) · **environment toggle sandbox↔production** · numbering (per-branch prefix/sequence) · send behavior (per channel, defaults locked to hybrid) · enabled tax types · (POS device activation/access-token management — base here, used by POS layer).
**Onboarding wizard (first run):** steps — (1) enter TRN/activity, (2) connect e-seal, (3) **test on sandbox** (issue a test doc, confirm acceptance), (4) go live → explicit confirm to switch to production. New tenant **starts in sandbox** with a persistent test-mode indicator everywhere.
**Going to production:** explicit `AlertDialog` confirm; irreversible per session; the test-mode badge disappears.
**States:** loading · error (connection test failure → plain message) · offline (settings cached, test deferred). **Permissions:** `sales.eta.settings` (admin).
**AR/EN:** `sales.settings.title`="إعدادات الفاتورة الإلكترونية"/"E-invoice settings", `sales.settings.env`="البيئة"/"Environment", `sales.settings.sandbox`="تجربة"/"Sandbox", `sales.settings.production`="إنتاج"/"Production", `sales.settings.go_live`="التحويل للإنتاج"/"Switch to production", `sales.settings.go_live_confirm`="ستبدأ بإصدار فواتير حقيقية معتمدة من المصلحة. متأكد؟"/"You'll start issuing real, tax-cleared invoices. Are you sure?", `sales.settings.eseal`="الختم الإلكتروني"/"E-seal".
**Acceptance:** tenant starts in sandbox; production switch is an explicit confirm; sandbox indicator persistent until live.

---

## 12) Print template (locked, bilingual) — Print preview modal

**Mandatory fields locked** (cannot be hidden/edited): seller (name + TRN), buyer (name + TRN if B2B), item lines with **EGS/GS1 codes**, tax breakdown by type, totals, **UUID**, **QR**. 
**Limited per-tenant customization:** logo, trade name, theme colors (from Appearance), footer/notes — without touching mandatory fields.
**Sizes:** **A4** (full) + **80mm thermal roll** (POS receipt) — toggle in preview.
**Bilingual:** Arabic primary, English mirror; numbers western + `tabular-nums`; UUID/QR/codes render LTR within RTL.
**Acceptance:** mandatory fields always present and uneditable; only allowed customizations exposed; both sizes render.

---

## 13) Module-wide RTL, numbers, offline, performance

- Official doc bilingual; western digits + `tabular-nums`; `ج.م` after the number; tax/totals logical alignment; TRN/UUID/codes LTR within RTL (bidi tested).
- **Offline:** issue + print + deliver work; submission enters the ETA queue; per-doc `local/queued/accepted/rejected`; **B2C window countdown** warns before expiry; conflicts surfaced (never silent).
- **Performance:** line grid handles dozens of rows with live entry, no jank; large invoice list = server-side pagination; ETA send queue is async with a progress indicator and never blocks the UI.

---

## 14) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Sales invoice | list, editor(3-zone), issued view | ✓ | ✓ | invoice.* + submit/cancel | ✓ |
| Quotation | list, editor, view | ✓ | ✓ | quotation.* | ✓ |
| Credit note | linked editor, list, view | ✓ | ✓ | creditnote.create | ✓ |
| Debit note | editor, list, view | ✓ | ✓ | debitnote.create | ✓ |
| Payment receipt | collect modal, list, standalone | ✓ | ✓ | payment.collect | ✓ |
| ETA document | embedded (issued view) + hub | ✓ | ✓ | eta.hub/resend | ✓ |
| ETA settings | settings + wizard | ✓ | ✓ | eta.settings | ✓ |
| Print template | preview modal (A4/80mm) | n/a | ✓ | view | ✓ |

## 15) Module acceptance criteria
1. Payment status and ETA status stored/displayed independently (two filters, two columns, never merged).
2. "Issue & submit" disabled whenever any submit blocker exists; readiness panel names each blocker.
3. Accepted invoices cannot be edited or deleted; only cancel(window)/credit/debit available.
4. B2C e-receipt issues and prints with zero network; syncs within the window; warns before expiry (live countdown).
5. B2B e-invoice is not labeled valid until ETA acceptance returns (state `clearing`).
6. Rejection reasons render in plain Arabic, never raw codes; fix & resend focuses the offending field.
7. New tenant starts in sandbox with a persistent test-mode indicator; production switch is an explicit confirm.
8. Invoice numbering is per-branch; print template keeps mandatory fields locked across A4/80mm; everything RTL via i18n keys.

**Fixtures:** `Flexova_FE_02_Sales_ETA.fixtures.json` (Egyptian context — B2B/B2C customers with/without TRN, invoices across all payment×ETA combos incl. rejected-with-plain-reason, clearing, queued-with-countdown, credit note, quotation, receipts, ETA settings sandbox).

*End of FE_02 Sales + ETA — version 1.0*
