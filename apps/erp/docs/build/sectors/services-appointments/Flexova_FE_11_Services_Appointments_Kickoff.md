# Flexova — FE_11 Services/Appointments — Claude Code Kickoff

> Paste the prompt in §2 into a fresh Claude Code session scoped to FE_11 only. Verify §3 before commit. **Backend block is the module's last stage — not now.** v1 = **narrow core** (Calendar/Appointment/Service Ticket/Packages+Subscriptions+renewals); Provider/Service/Package editors deferred.
> Version: 1.0 — July 2026

---

## 0) Files & paths (placement map — read first)

| Delivered file | Goes to (in repo) | Role |
|---|---|---|
| `Flexova_FE_11_Services_Appointments.md` | `docs/build/sectors/services-appointments/FE_11_Services_Appointments.md` | Module build spec |
| `Flexova_FE_11_Services_Appointments_Kickoff.md` | `docs/build/sectors/services-appointments/FE_11_Services_Appointments_Kickoff.md` | This kickoff |
| `Flexova_UIUX_11_Services_Appointments.md` | `docs/reference/UIUX_11_Services_Appointments.md` | UI/UX reference (context) |
| `Flexova_FE_11_Services_Appointments_fixtures.json` | `src/lib/mock/fixtures/svc.fixtures.json` | **Runtime fixtures — keep the short name at this exact path** |

> Specs move into `docs/build/sectors/services-appointments/` freely. The **fixtures must stay** at `src/lib/mock/fixtures/svc.fixtures.json` (mock layer reads by short name).

## 1) Pre-build checklist
- **Foundation + Core + prior sectors built:** FE_00, FE_01–08, **FE_09 (POS)**, **FE_10 (F&B)** — imported; **do not** redefine tokens/components/layouts.
- **Reuse wholesale:** `PosLayout` (top bar), **shift**, **tender modal** (mixed/store-credit/loyalty), **e-receipt/ETA + 80mm + queue/window/resend**, **journal**, **terminal settings**, **product grid**, **per-terminal numbering**, **Check→document** (FE_10), **HR commission engine** (FE_06), CRM client. **Reuse — do not reimplement.**
- **Spec + fixtures placed** per §0. Fixtures cross-reference `pos`/`fnb`/`inventory`/`crm`/`hr` shared IDs.
- **Narrow core only:** no Provider/Service/Package editor screens (catalog is fixtures seed).

## 2) Kickoff prompt (paste this)
> Read `docs/build/sectors/services-appointments/FE_11_Services_Appointments.md` and `src/lib/mock/fixtures/svc.fixtures.json`. The Foundation (FE_00), Core (FE_01–08), **POS (FE_09/FE_09a)**, and **F&B (FE_10)** are implemented — **reuse them wholesale**: import `PosLayout`, shift, tender modal, e-receipt/ETA + 80mm, journal, terminal settings, product grid, per-terminal numbering, **Check→document (FE_10)**, **HR commission engine (FE_06)**, tokens/components/i18n/appearance. **Do not redefine tokens or edit the shell.**
>
> Register Services as a **Sector module** (`moduleFlag:"svc"`, `nav.svc`, permission `svc.access`) running **inside `PosLayout`**. Build the **narrow core**, page by page:
> - **Calendar (`/svc/calendar`)** — day/week toggle, **columns per provider** (HR seed), RTL time axis; appointment **blocks colored by status**; **`New appointment`**; **drag/resize → reschedule with conflict/availability detection**; filters (provider/service/branch).
> - **Appointment (`/svc/appointment/:id`)** — drawer: client (CRM quick-pick/add), service(s) (duration drives the block), provider, start, **package coverage**, notes, **lifecycle buttons** (`booked→confirmed→checked-in→in-service→completed`, + `no-show`/`cancel` with reason ± cancellation fee). Completion opens the Service Ticket; package-covered → **decrement balance** instead of charge.
> - **Service Ticket (`/svc/ticket/:id`)** — service lines (from appointment) + **add products** (reuse FE_09 product grid) + **provider per line** + discount/package + totals; **Settle** via the reused **POS tender modal** → generates **Sales doc/e-receipt** (FE_09/FE_02) → **provider commission via HR**. Full package coverage → settle-by-balance (no cash).
> - **Packages & Subscriptions (`/svc/subscriptions`)** — packages (session balance decremented on use); **subscriptions auto-renew fully modeled**: plan · cycle · **renewal date** · status (`active/past_due/suspended/cancelled`) · **billing-attempt log (modeled channel)** · failure policy (retry→suspend); actions (suspend/resume/cancel). A **renewals dashboard** (upcoming + past-due/failed with retry). Use `subscriptions` + `renewals_dashboard` fixtures.
>
> Honor the invariants: **appointment lives on the calendar; the invoice is generated on completion (Check→document), not on booking; commission is on collected (HR).** Payment vs sync/ETA **independent**; **offline-first** (calendar+appointment work offline; doc queued; B2C window countdown); **flag-don't-block** (`svc_massage` has no eta_code → still sells). **Auto-renew billing = modeled channel** (payment gateway is a deferred stub); self-booking/rooms/complex availability are deferred.
>
> Implement five states (`?mock=loading|empty|error|no_results|offline`), responsive (calendar week→day on small; providers horizontal scroll; ticket bottom sheet), permission gating (`svc.*` via real `can(key,scope)` from FE_08), and AR (default) + EN under the `svc` namespace (+ reused `pos`). RTL logical properties; western digits + `tabular-nums`; `ج.م` after amounts. Then confirm the Module acceptance criteria (FE_11 §11).

## 3) Acceptance gate (verify before commit)
Run FE_11 §11. High-signal checks:
- Runs inside `PosLayout` as `moduleFlag:"svc"`; no shell/token edits; POS shift/tender/journal/e-receipt + HR commission reused.
- Calendar day/week × providers; drag reschedule detects conflicts.
- Appointment lifecycle; completion → Service Ticket; package coverage decrements balance (`apt_5003`/`pkg_7001`).
- Ticket mixes services + products, provider per line; settle reuses tender → doc; **commission via HR** (`tk_svc_9001`).
- Packages decrement; **subscriptions auto-renew modeled** — `sub_8001` active, `sub_8002` past_due+retry, `sub_8003` suspended; renewals dashboard lists upcoming + past-due.
- `svc_massage` (no eta_code) still sells (flag-don't-block); payment vs sync independent; offline works.

## 4) Commit + next
- Commit: `feat(svc): narrow core — calendar + appointment + service ticket + packages/subscriptions (reuses POS/F&B/HR, mock)`.
- Verify `git log --oneline`; push manually.
- **Next after build & pass:** module acceptance checklist (FE_11 §11) → then the **Services Backend block** (last stage): appointment lifecycle, Check→document + commission (HR), packages balance, **subscription renewal engine (modeled channel)** — contracts = these fixtures, reusing the POS/F&B backend blocks.

*End of FE_11 Kickoff — v1.0 (narrow core).*
