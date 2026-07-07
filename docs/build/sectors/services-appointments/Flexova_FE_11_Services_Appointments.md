# Flexova — FE_11 Services / Appointments (build-ready)

> **Phase 5 — Sector 3.** Appointment-based services frontend: the **calendar/appointment/subscription layer on top of the POS core (FE_09) + F&B patterns (FE_10) + HR commission engine.** Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — July 2026 · **v1 = narrow core** (Calendar + Appointment + Service Ticket + Packages/Subscriptions + renewals dashboard). **Provider/Service/Package editors deferred** (catalog arrives as fixtures seed).
> **Source of truth (do not redefine):** `Flexova_UIUX_11_Services_Appointments` · `Flexova_FE_00_Foundation` · **`Flexova_FE_09_Retail_POS` + `Flexova_FE_09a_POS_Layout` + `Flexova_FE_10_FnB` — reused wholesale: `PosLayout`, shift, tender modal (mixed/store-credit/loyalty), e-receipt/ETA + 80mm, journal, terminal settings, product grid, per-terminal numbering, Check→document** · `Flexova_FE_06_HR_Payroll` (**commission engine — reused for providers**) · `Flexova_FE_05_CRM` (client/loyalty) · `Flexova_FE_01_Inventory` (products on the same invoice) · `Flexova_FE_02_Sales_ETA`.
> **Golden rule (carried):** the **appointment lives on the calendar; the invoice is generated on completion; commission is on collected.** The appointment is operational (scheduling/availability); the Sales doc/e-receipt is generated at settle via the FE_09/FE_02 path. **Subscriptions renew via a modeled billing channel** (payment-gateway integration deferred). **ETA-accepted docs are never edited.**

---

## 0) Module scope (v1 — narrow core)

**In v1:** operational **Calendar** (day/week + per-provider columns + drag reschedule + conflict/availability), **Appointment** lifecycle → **Service Ticket** (services + products on one invoice, provider per line) → settle via reused tender → Sales doc/e-receipt → **provider commission** (reuse HR), **Packages** (session balance) + **auto-renew Subscriptions (fully modeled)** + a **renewals dashboard**.
**Deferred (extension points, seeded via fixtures):** Provider/Service/Package **editor** screens, client **self-booking**, complex provider availability (overlapping shifts), rooms/resources, real payment-gateway for renewals, real SMS/WhatsApp notifications.

Consumes CRM clients + HR providers/commission + Inventory products + reuses the POS/F&B core through `lib/mock/client.ts` reading `svc.fixtures.json` (cross-references `pos`, `fnb`, `inventory`, `crm`, `hr` fixtures — shared IDs). Settle reuses Check→document + FE_02 submission.

---

## 1) Services model (the spine)

| Aspect | Behavior |
|---|---|
| **Appointment** | Independent, lifecycle `booked→confirmed→checked-in→in-service→completed` (+ `no-show`/`cancelled`); **generates a Service Ticket → Sales doc on completion** (reuses Check→document). |
| **Book vs Settle** | Booking occupies calendar time; finance/e-receipt generated on **settle** — two independent moments. |
| **Provider** | An **HR employee** who performs services; **commission runs through the HR engine** (on collected). |
| **Package** | Session balance decremented on use (e.g. 10 sessions); validity. |
| **Subscription (auto-renew)** | **Fully modeled:** plan · cycle · renewal date · status `active/past_due/suspended/cancelled` · **billing attempt via a modeled channel** · failure policy (retry→suspend). Gateway integration is a deferred stub. |
| **Reuse POS/F&B** | `PosLayout`, shift, tender, journal, numbering, e-receipt, product grid, Check→document — inherited, not rebuilt. |

---

## 2) Routes & IA

Runs inside **`PosLayout`** (FE_09a). Mounts as a **Sector module** (`moduleFlag:"svc"`, `nav.svc`, permission `svc.access`).

```
/svc                        → shift gate → /svc/calendar (or /pos/shift/open)
/svc/calendar               → Calendar (day/week, per-provider)          [§4]
/svc/appointment/:id        → Appointment drawer/details (lifecycle)     [§5]
/svc/ticket/:id             → Service Ticket (services + products)       [§6]
/svc/subscriptions          → Packages & Subscriptions + renewals        [§7]
  (reused from POS) /pos/* shift · journal · settings · tender · e-receipt
```
**Overlays/modals:** New appointment · Client quick-pick/add (FE_05) · Service picker (duration→block) · Reschedule (drag) · Cancel/No-show (reason) · Tender modal (reused) · Sell package/subscription.
**i18n namespace:** `svc` (+ reused `pos`). AR default, EN mirror.

---

## 3) State systems (new + reused) — never merged
**A) Appointment status:** `booked · confirmed · checked-in · in-service · completed` (success) · `no-show`/`cancelled` (neutral/danger).
**B) Subscription status:** `active` (success) · `past_due` (warning) · `suspended`/`cancelled` (danger/neutral).
**C) Package:** remaining balance + `active/expired/used-up`.
**D) Payment + ETA (reused, independent):** payment `paid/partial` · sync `local/queued/valid/rejected`.

**Five states** per data screen (loading/empty/error/no_results/**offline**) — calendar + appointment work offline; settle respects the legal window. **Flag-don't-block** carried.

---

## 4) Screen — Calendar (`/svc/calendar`) — central
**Purpose:** see the schedule, book/reschedule, avoid conflicts.
**Layout:** inside `PosLayout`; **day/week** toggle; **columns per provider** (from HR seed); time axis (RTL: time descends, providers across); appointment **blocks** colored by status; **`New appointment`** action; filters (provider/service/branch).
**Interactions:** tap empty slot → New appointment (§5); **drag/resize** a block → reschedule (with **conflict/availability detection**); tap a block → appointment drawer.
**Five states:** loading (grid skeleton) · empty (no appointments → prompt to book) · error+retry · no-results (filter) · offline (works; syncs). **Responsive:** week→day on small screens; providers as a horizontal scroll/selector. **Permissions:** `svc.calendar.view`, `svc.appointment.book`. **AR/EN:** `svc.calendar.title`="التقويم"/"Calendar", `svc.new_appointment`="حجز جديد"/"New appointment". RTL time/provider axes.

## 5) Screen — Appointment (`/svc/appointment/:id`) — drawer/details
**Fields:** client (CRM quick-pick/add) · service(s) (duration drives the block) · provider · start time · **package coverage?** · notes · **lifecycle buttons** (confirm/check-in/start/complete/no-show/cancel with reason).
**Flow:** booked→confirmed→checked-in→in-service→**completed** → opens the Service Ticket (§6). If package-covered → **decrement balance** instead of charge.
**States/edges:** availability conflict on book/reschedule, no-show/cancel (± cancellation fee, config), offline. **Permissions:** `svc.appointment.book/edit/cancel`. **AR/EN:** lifecycle labels; `svc.coverage`="مغطّى بباقة"/"Package-covered".

## 6) Screen — Service Ticket (`/svc/ticket/:id`) — reuses POS core
**Layout:** service lines (from the appointment) + **add products** (reuse FE_09 product grid) + **provider per line** + discount/package + totals. **Settle** opens the reused **POS tender modal** (mixed/store-credit/loyalty) → generates **Sales doc + e-receipt** (FE_09/FE_02) → provider **commission** (HR). Full package coverage → settle-by-balance with no cash tender.
**States + offline** (settle works; doc queued). **Permissions:** `svc.ticket.settle`, `svc.discount.override`. **AR/EN:** `svc.service`="خدمة"/"Service", `svc.provider`="مقدّم الخدمة"/"Provider".
**Acceptance:** mixes services + products on one invoice with a provider per line; settle reuses tender + generates the doc; commission computed via HR; package coverage settles by balance.

## 7) Screen — Packages & Subscriptions (`/svc/subscriptions`)
**Packages:** sell a session package (balance + validity); balance decrements on use; shown on the client.
**Subscriptions (auto-renew, modeled):** plan · cycle (monthly/yearly) · **renewal date** · status (`active/past_due/suspended/cancelled`) · **billing-attempt log** (modeled channel) · actions (suspend/resume/cancel). A **renewals panel**: upcoming renewals + **past-due/failed** with retry.
**Flow:** the renewal engine (backend) produces a cycle → **billing attempt (modeled channel)** → success (renew) / failure (`past_due`→retry→`suspended`). All visible on the client + this dashboard.
**States/edges:** failed attempt, suspended, near-renewal, offline. **Permissions:** `svc.subscription.manage`. **AR/EN:** `svc.subscription`="اشتراك"/"Subscription", `svc.renewal`="تجديد"/"Renewal", `svc.past_due`="متعثّر"/"Past due", `svc.retry`="إعادة المحاولة"/"Retry".
**Acceptance:** package balance decrements on use; subscription shows plan/cycle/renewal-date/status + attempt log; renewals dashboard lists upcoming + past-due with retry; renewal is a **modeled channel** (gateway deferred).

## 8) Reused from POS/F&B/HR (no rebuild)
Shift (open/close/Z + treasury), journal, terminal settings, e-receipt 80mm, tender modal, product grid, offline queue, per-terminal numbering, top bar (logo/clock/tooltips/dashboard/exit), **Check→document**, **HR commission engine**. **Auto-renew billing** = modeled channel; payment gateway = deferred extension point.

## 9) Module-wide RTL, offline, performance
- RTL-native calendar (time/provider axes), appointment, ticket, subscriptions; western digits + `tabular-nums`; `ج.م` after amounts; barcode/UUID LTR-in-RTL.
- **Offline-first:** calendar + appointment local; non-blocking sync; e-receipt legal-window respected. **Renewal engine runs server-side.**
- **Performance:** virtualized calendar (day/week × providers); instant service picker.

## 10) Coverage matrix
| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Appointment | calendar, appointment | ✓ | ✓ | svc.appointment.* | ✓ |
| Service (seed) | ticket, appointment | ✓ | ✓ | svc.ticket | ✓ |
| Provider (HR) | calendar cols, ticket | ✓ | ✓ | svc.calendar.view | ✓ |
| Service Ticket | ticket | ✓ | ✓ | svc.ticket.settle | ✓ |
| Package | subscriptions, ticket | ✓ | ✓ | svc.subscription.manage | ✓ |
| Subscription (auto-renew) | subscriptions | ✓ | ✓ | svc.subscription.manage | ✓ |
| Commission (HR) | (via HR) | — | — | (hr) | ✓ |

## 11) Module acceptance criteria
1. Runs inside `PosLayout` as `moduleFlag:"svc"`; no shell/token edits; reuses POS shift/tender/journal/e-receipt + HR commission.
2. Calendar shows day/week × providers with status-colored blocks; book on empty slot; **drag reschedule with conflict/availability detection**.
3. Appointment lifecycle (`booked→…→completed`, +no-show/cancel); completion opens the Service Ticket; package coverage decrements balance.
4. Service Ticket mixes **services + products** on one invoice with **provider per line**; settle reuses the POS tender modal → Sales doc/e-receipt; **commission via HR**.
5. Packages decrement on use; **Subscriptions auto-renew is fully modeled** (cycle/renewal-date/status/attempt-log/failure→suspend); renewals dashboard lists upcoming + past-due with retry.
6. Payment vs sync/ETA independent; offline-first (calendar/appointment work offline; doc queued, window countdown); flag-don't-block carried.
7. Renewal billing is a **modeled channel** (payment gateway is a deferred stub); self-booking/rooms/complex availability are deferred extension points.

**Fixtures:** `src/lib/mock/fixtures/svc.fixtures.json` (delivered as `Flexova_FE_11_Services_Appointments_fixtures.json`; place at the standard mock path as `svc.fixtures.json`). Egyptian context — providers (from HR seed) with services + commission; a day/week of appointments across statuses (booked/confirmed/checked-in/completed/no-show); a service+product ticket; packages (session balance) and **subscriptions** across statuses (active/past_due/suspended) with a **billing-attempt log** and upcoming/failed renewals. Cross-references `pos`, `fnb`, `inventory`, `crm`, `hr` fixtures (shared IDs).

*End of FE_11 Services/Appointments — v1.0 (narrow core).*
