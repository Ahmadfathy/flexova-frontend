# Flexova — Reports & Dashboards Spec (EN, build-ready)

> Layer 2, Core module 7. Consumption/aggregation layer over all core modules (owns definitions, not transactions).
> Depends on: Design System + all core modules (data source). v1.

## 1. Scope
**In:** role-based dashboards, ready report library (per module), guided custom report builder, saved reports/views, scheduled delivery (WhatsApp/PDF), ETA/tax compliance dashboard, shift (Z) report, export PDF/Excel.
**Out (later):** advanced pivot/cross-tab; external BI/API/Sheets export; deep multi-branch consolidation.
**Principles:** two faces (ready vs builder); **performance first** (pre-computed aggregates/cache); **drill-down everywhere**; proactive delivery (daily WhatsApp summary). **Never recomputes** numbers owned by source modules.

## 2. Entities (✱ required)
- **Report Definition** — system library report: source✱, columns, default filters.
- **Saved Report** — user-built: columns/filters/grouping/sort persisted.
- **Dashboard** — ordered widget set; role/archetype defaults.
- **Widget** — KPI card / chart / list / mini-table within a dashboard.
- **Saved View/Filter** — reusable period/filter.
- **Scheduled Delivery** — report/dashboard + cadence + recipients + channel (WhatsApp/PDF).
- **Aggregates/Cache** — pre-computed layer (behind the scenes) for performance.
> No transaction data owned; everything **read** from other modules.

## 3. Report library (by source)
Sales (period/branch/cashier/product/customer · top sellers · margin · returns) · Inventory (balances · item ledger · slow/fast · below-min · **weighted-avg valuation** · count variances) · Purchasing (by supplier/period · supplier balances) · Finance (P&L · Balance · Cash Flow · expenses by category · liquidity — *sourced from Accounting*) · CRM (**AR aging** · top/overdue customers · segments) · HR (labor cost · commissions · attendance) · ETA (send status · VAT payable/deductible → return · **Sandbox/Production** flag) · POS (**Z-report** · expected vs actual cash · variance).

## 4. ETA/tax dashboard (compliance differentiator)
Two queues — **B2B (pre-clearance, near-real-time)** and **B2C (window queue 24–72h)** — each doc status (`pending/accepted/rejected/sending`), **resend** for rejected + colloquial reason, VAT return summary, clear **Sandbox vs Production** distinction.

## 5. Flows
- **Dashboard + drill-down:** role default dashboard → KPIs/charts → click any number → detail → source docs.
- **Ready report:** library → report → set period/branch/filters → table+chart → export/WhatsApp.
- **Custom builder (guided, no SQL):** source → columns → filters → group/sort → preview → save.
- **Schedule daily summary:** report/dashboard → cadence (e.g. daily 9am) → recipients → channel → save.
- **Customize dashboard:** edit mode → add/remove/reorder widgets (RTL drag-drop) → save per user.
- **Z-report (offline):** close shift → sales/payment methods/expected cash → enter actual → variance. **Works fully offline**, then syncs.

## 6. Screens
- **Dashboard home:** role/archetype default; KPI cards + light CSS charts; refresh button + last-updated stamp. Loading=skeletons; empty=guidance widgets.
- **Report library:** grouped grid (§3), search, favorites, recents; saved reports separate.
- **Report viewer:** compact table (`tabular-nums`, sticky header, sort) + optional chart; top filter bar; export; cell drill-down. Empty-filter distinct from empty; heavy compute = non-blocking “preparing…”.
- **Custom builder:** guided steps + live preview + save/share.
- **ETA/tax dashboard:** §4.
- **Z-report:** offline-capable, sync state visible.
- **Scheduling:** schedule list + create/edit + channels + send log.

## 7. States
- **Offline:** “numbers as of last sync” banner; Z-report fully local.
- **Staleness:** “updated X min ago” stamp + instant manual refresh.
- **Unauthorized scope:** out-of-scope reports/branches hidden (not error).
- **Large data:** pagination/progressive load (no UI freeze).
- All 5 data states per Design System §8.

## 8. Integrations
All core modules (read-only source; **no recomputation**). ETA (send status + VAT summary + Sandbox/Production). WhatsApp/email (scheduled delivery). Export PDF/Excel. Permissions (**row/branch scope governs every report and dashboard**).

## 9. Performance
Pre-computed aggregates/cache; near-real-time + manual refresh; light CSS charts (no heavy images); paginated; heavy reports async/non-blocking.

## 10. Decisions (v1, locked)
- Two faces: ready dashboards/reports + guided builder (no SQL).
- **Pre-computed aggregates** + near-real-time + manual refresh (performance).
- Drill-down from any number to source.
- **Daily WhatsApp summary** (proactive delivery).
- ETA dashboard with B2B/B2C queues + Sandbox/Production flag.
- **Z-report offline-first.** Role/branch scope on all reports. Export PDF/Excel native. EGP/`tabular-nums`.
- Pivot/BI export/consolidation depth = later.

## 11. Acceptance criteria
- Every dashboard number drills down to its source documents.
- Reports never recompute source-owned figures (weighted-avg valuation, AR, etc.).
- A user only sees reports/branches within their permission scope.
- A scheduled daily summary is delivered via WhatsApp/PDF on cadence.
- Z-report computes and stores fully offline, then syncs.
- ETA dashboard shows both queues with correct statuses and Sandbox/Production flag.
