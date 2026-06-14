# Flexova — FE_07 Reports & Dashboards (build-ready)

> **Phase 4 — Core module 7.** A consumption/aggregation layer over all core modules. It owns report/dashboard **definitions**, not transactions. Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — June 2026
> **Source of truth (do not redefine):** `Flexova_SPEC_EN_07_Reports` + `Flexova_UIUX_07_Reports` · `Flexova_FE_00_Foundation` · all prior modules (FE_01..06) as read-only data sources.
> **Governing principle — "two layers over one source of truth":** Reports reads from Inventory/Sales/Purchasing/Accounting/CRM/HR and displays. It owns *definitions*, never daily data.
> **Golden rules (carried):** (1) **Never recomputes** a figure owned by its source module (weighted-avg inventory valuation, AR aging, P&L, payroll cost — all displayed as-is). (2) **Every number drills down** to its source documents — no "floating numbers". (3) **Row/branch scope governs every report and dashboard** (cashier sees their shift, branch manager their branch, owner all). (4) Performance first: read from **pre-computed aggregates/cache**, not raw transactions.

---

## 0) Module scope (recap)

**In v1:** role-based dashboards, ready report library (per module), guided custom report builder (no SQL), saved reports/views, scheduled delivery (WhatsApp/PDF), ETA/tax compliance dashboard, shift (Z) report, export PDF/Excel.
**Out (later):** advanced pivot/cross-tab, external BI/API/Sheets export, deep multi-branch consolidation.

Reads all core modules (read-only); ETA send status + VAT summary + Sandbox/Production; delivers via WhatsApp/email; export PDF/Excel; **Permissions module governs scope on every report/dashboard**. Data via `lib/mock/client.ts` reading `reports.fixtures.json` (definitions + pre-aggregated snapshots).

---

## 1) Routes & IA

Mounts under shell nav `nav.reports`. Secondary **Tabs** below `PageHeader`.

```
/reports                         → redirect → /reports/dashboard
/reports/dashboard               → Dashboard home (role/archetype default) [§3]
/reports/library                 → Report library                          [§4]
/reports/view/:reportId          → Report viewer                           [§5]
/reports/builder                 → Custom report builder (guided)          [§6]
/reports/saved                   → Saved reports                           [§4]
/reports/eta-tax                 → ETA / tax compliance dashboard           [§7]
/reports/z-report                → Shift Z-report (offline-first)          [§8]
/reports/scheduling              → Scheduled delivery                      [§9]
```

**Secondary tabs:** Dashboard · Library · Saved · ETA/Tax · Z-report · Scheduling.
**Modals/drawers:** Dashboard edit mode (add/remove/reorder widgets, RTL drag-drop) · Schedule create/edit (modal, §9) · Export options (modal: PDF/Excel) · Drill-down detail (drawer → source list, §3/§5).
**i18n namespace:** `reports`. AR default, EN mirror.

---

## 2) Entities (definitions only — data is read from other modules)

| Entity | Owner | Notes |
|---|---|---|
| Report Definition | system | library report: source ✱, columns, default filters |
| Saved Report | user | persisted columns/filters/grouping/sort |
| Dashboard | system/user | ordered widget set; role/archetype defaults |
| Widget | definition | KPI card / chart / list / mini-table |
| Saved View/Filter | user | reusable period/filter |
| Scheduled Delivery | user | report/dashboard + cadence + recipients + channel |
| Aggregates/Cache | system | pre-computed layer (behind the scenes) for performance |

**v1 decisions:** EGP only; `tabular-nums` for all values; native PDF/Excel export; **data scoping by role/branch** governs every report (Permissions FE_08).

---

## 3) Screen — Dashboard home (`/reports/dashboard`)

### 3.1 Purpose
The role/archetype default dashboard (owner: finance + sales; inventory manager: balances + low-stock). KPIs + light CSS charts; drill-down from any number.

### 3.2 Components
KPI cards (`KpiCard`) + light **CSS charts** (no heavy images — performance) + mini-lists. Top bar: period filter, branch (scope-limited), **`refresh` button + "last updated X min ago" stamp**. **Edit mode:** add/remove/reorder widgets via RTL drag-drop, saved per user.
Every KPI/chart point is clickable → **drill-down drawer** → detail rows → link to source documents in the owning module.

### 3.3 Five states
Loading (skeleton cards+charts) · **empty (new tenant):** guidance widgets ("Start selling to see your reports") · error · no-results (n/a at dashboard) · **offline:** banner "numbers as of last sync".
**Staleness:** "updated X min ago" stamp + instant manual refresh.

### 3.4 Responsive / Permissions
Desktop widget grid; mobile single-column stack; drag-drop simplified on touch. `reports.view`; financial widgets need `reports.view_financial`; branch widgets respect `reports.view_all_branches` vs branch scope; customize needs `dashboard.customize`.

### 3.5 AR / EN
| key | AR | EN |
|---|---|---|
| reports.dash.title | لوحة المتابعة | Dashboard |
| reports.dash.refresh | تحديث | Refresh |
| reports.dash.updated_ago | محدّث منذ {{n}} دقيقة | Updated {{n}} min ago |
| reports.dash.customize | تخصيص اللوحة | Customize |
| reports.dash.empty | ابدأ البيع لترى تقاريرك | Start selling to see your reports |
| reports.dash.offline | الأرقام محسوبة حتى آخر مزامنة | Numbers are as of last sync |

### 3.6 Acceptance
Role/archetype default loads; every number drills down to source; customizable per user; staleness stamp + manual refresh present.

---

## 4) Screen — Report library + Saved (`/reports/library`, `/reports/saved`)

### 4.1 Library
Grouped grid **by source module** (§ catalog below): search, favorites, recents. Each report card: name, source, short description, "open".
**Catalog by source:**
- **Sales:** by period/branch/cashier/product/customer · top sellers · margin · returns.
- **Inventory:** balances · item ledger · slow/fast movers · below-min · **weighted-avg valuation** · count variances.
- **Purchasing:** by supplier/period · supplier balances · supply performance.
- **Finance:** P&L · Balance · Cash Flow · expenses by category · liquidity *(sourced from Accounting)*.
- **CRM:** **AR aging** · top/overdue customers · segments.
- **HR:** labor cost · commissions accrued/paid · attendance.
- **ETA/Tax:** send status · VAT payable/deductible → return · Sandbox/Production.
- **POS:** **Z-report** · expected vs actual cash · variance.

### 4.2 Saved reports
Separate section: user-built saved reports (from the builder §6), each editable/duplicable/schedulable.

### 4.3 States / Permissions
All 5; **unauthorized scope:** out-of-scope reports hidden (not an error). `reports.view`; saved/build need `reports.build`/`reports.save`.
**AR/EN:** `reports.library.title`="مكتبة التقارير"/"Report library", `reports.library.favorites`="المفضّلة"/"Favorites", `reports.library.recents`="آخر المستخدَمة"/"Recent", `reports.saved.title`="تقاريري المحفوظة"/"My saved reports".
**Acceptance:** library grouped by source; out-of-scope reports hidden; saved reports separate.

---

## 5) Screen — Report viewer (`/reports/view/:reportId`)

### 5.1 Components
Top **filter bar** (period, branch — scope-limited, category, and report-specific filters) → **compact DataTable** (`tabular-nums`, sticky header, sort) + optional **CSS chart**. Actions: export (PDF/Excel), share (WhatsApp). **Cell drill-down** → source documents.

### 5.2 Five states
Loading (skeleton table) · empty (no data for period) · error · **no-results (filter):** "no results for this filter" + suggest widening the period (distinct from empty) · offline (as-of-last-sync). **Heavy compute:** non-blocking "preparing…" indicator (no UI freeze).

### 5.3 Responsive / Permissions
Desktop table+chart; mobile → chart first then scrollable table / card rows. `reports.view`; financial reports `reports.view_financial`; export `reports.export`. Branch filter limited to scope.

### 5.4 AR / EN
`reports.viewer.export`="تصدير"/"Export", `reports.viewer.share`="مشاركة واتساب"/"Share via WhatsApp", `reports.viewer.no_results`="لا نتائج لهذا الفلتر"/"No results for this filter", `reports.viewer.preparing`="بيتم التجهيز…"/"Preparing…", `reports.viewer.drill`="عرض المستندات المصدر"/"View source documents".
**Acceptance:** filters apply; cells drill down to source; empty-filter distinct; heavy compute non-blocking; export PDF/Excel works.

---

## 6) Screen — Custom report builder (`/reports/builder`) — guided, no SQL

Guided steps with **live preview**: (1) pick **source** (sales/inventory/…); (2) choose columns; (3) filters; (4) group-by + sort; (5) preview; (6) **save** as a Saved Report (and optionally schedule/share). No SQL — radical simplicity.
**States:** all 5; preview shows "preparing…" for heavy queries. **Permissions:** `reports.build`, `reports.save`.
**AR/EN:** `reports.builder.title`="منشئ تقارير"/"Report builder", `reports.builder.source`="المصدر"/"Source", `reports.builder.columns`="الأعمدة"/"Columns", `reports.builder.group`="التجميع"/"Group by", `reports.builder.preview`="معاينة"/"Preview", `reports.builder.save`="حفظ"/"Save".
**Acceptance:** a guided build with no SQL produces a saved, shareable, schedulable report with live preview.

---

## 7) Screen — ETA / tax dashboard (`/reports/eta-tax`) — compliance differentiator

### 7.1 Layout
**Two queues** side by side: **B2B (pre-clearance, near-real-time)** and **B2C (window queue 24–72h)**. Each doc: status (`pending`/`accepted`/`rejected`/`sending`) + (B2C) window remaining. **Resend** for rejected + colloquial reason. **VAT return summary** (payable/deductible → net). Clear **Sandbox vs Production** distinction (persistent badge). Reads from Sales (FE_02) and Purchasing inbound (FE_03).

### 7.2 States
Loading · empty (positive: "all submitted") · error · offline (queues from last sync; sending disabled offline). **Permissions:** `reports.eta.view`.
**AR/EN:** `reports.eta.title`="لوحة الضرائب والفاتورة الإلكترونية"/"Tax & e-invoice dashboard", `reports.eta.b2b`="طابور B2B (شبه لحظي)"/"B2B queue (near-real-time)", `reports.eta.b2c`="طابور B2C (النافذة)"/"B2C queue (window)", `reports.eta.vat_return`="ملخّص الإقرار الضريبي"/"VAT return summary", `reports.eta.env`="البيئة"/"Environment".
**Acceptance:** both queues with correct statuses; resend for rejected with colloquial reason; VAT return summary; Sandbox/Production flag.

---

## 8) Screen — Z-report (`/reports/z-report`) — offline-first

### 8.1 Flow
Cashier closes shift → report: shift sales · payment-method breakdown · **expected cash** → enter **actual cash** → **variance** (semantic color). **Works fully offline**, then syncs. Consistent with POS offline-first.
### 8.2 States
All 5; **offline (primary):** computes/stores locally with sync chip (`local/syncing/synced`); never blocks the cashier. **Permissions:** `reports.view` + shift scope (cashier sees own shift).
**AR/EN:** `reports.z.title`="تقرير الوردية"/"Shift report (Z)", `reports.z.expected`="النقدية المتوقعة"/"Expected cash", `reports.z.actual`="النقدية الفعلية"/"Actual cash", `reports.z.variance`="الفرق"/"Variance", `reports.z.close_shift`="إقفال الوردية"/"Close shift".
**Acceptance:** Z-report computes and stores fully offline, then syncs; variance shown with semantic color.

---

## 9) Screen — Scheduling (`/reports/scheduling`)

Schedule list + create/edit. A schedule = report/dashboard + cadence (e.g. daily 9am) + recipients + channel (**WhatsApp**/PDF). Send log of past deliveries. The **daily WhatsApp summary** is the headline proactive-delivery feature.
**States:** all 5. **Permissions:** `reports.schedule`.
**AR/EN:** `reports.sched.title`="الجدولة والإرسال"/"Scheduling", `reports.sched.cadence`="التكرار"/"Cadence", `reports.sched.recipients`="المستلمون"/"Recipients", `reports.sched.channel`="القناة"/"Channel", `reports.sched.daily_summary`="ملخّص اليوم"/"Daily summary", `reports.sched.log`="سجلّ الإرسالات"/"Send log".
**Acceptance:** a scheduled daily summary is delivered via WhatsApp/PDF on cadence; send log records deliveries.

---

## 10) Module-wide states, RTL, integrations, performance

- **Offline:** "numbers as of last sync" banner; Z-report fully local.
- **Staleness:** "updated X min ago" + instant manual refresh.
- **Unauthorized scope:** out-of-scope reports/branches **hidden**, not error.
- **Large data:** pagination/progressive load (no UI freeze); heavy reports async with "preparing…".
- Western digits + `tabular-nums`; `ج.م`; charts are light CSS; RTL drag-drop in dashboard edit; numbers/codes LTR within RTL.
- **Integrations:** all core modules (read-only, no recomputation), ETA (send status + VAT + Sandbox/Production), WhatsApp/email (delivery), export PDF/Excel, Permissions (row/branch scope on everything).
- **Performance:** pre-computed aggregates/cache; near-real-time + manual refresh; paginated; heavy reports non-blocking.

## 11) Permissions (input to FE_08)
`reports.view` · `reports.view_financial` (sensitive — P&L/profit) · `reports.view_all_branches` vs branch scope · `reports.build` · `reports.save` · `reports.schedule` · `reports.export` · `dashboard.customize` · `reports.eta.view`. **Headline requirement passed to FE_08: row/branch-level scoping** (cashier→shift, manager→branch, owner→all).

## 12) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Dashboard / Widget | dashboard home, edit mode | ✓ | ✓ | view / customize / view_financial | ✓ |
| Report definition | library | ✓ | ✓ | view (scoped) | ✓ |
| Report viewer | viewer + drill-down | ✓ | ✓ | view / export | ✓ |
| Saved report | saved, builder | ✓ | ✓ | build / save | ✓ |
| ETA/tax | eta-tax dashboard | ✓ | ✓ | eta.view | ✓ |
| Z-report | z-report (offline) | ✓ | ✓ | view + shift scope | ✓ |
| Scheduled delivery | scheduling | ✓ | ✓ | schedule | ✓ |

## 13) Module acceptance criteria
1. Every dashboard number drills down to its source documents.
2. Reports never recompute source-owned figures (weighted-avg valuation, AR, P&L, payroll cost, etc.).
3. A user only sees reports/branches within their permission scope (out-of-scope hidden, not error).
4. A scheduled daily summary is delivered via WhatsApp/PDF on cadence.
5. Z-report computes and stores fully offline, then syncs.
6. ETA dashboard shows both queues with correct statuses and the Sandbox/Production flag.
7. Light CSS charts, pre-computed aggregates, manual refresh; everything RTL via i18n keys with all 5 states.

**Fixtures:** `Flexova_FE_07_Reports.fixtures.json` (Egyptian context — role dashboards, report-library catalog by source, sample saved reports, ETA B2B/B2C queue snapshots, a Z-report with variance, a daily-WhatsApp schedule; values reference FE_01..06 fixtures and are NOT recomputed).

*End of FE_07 Reports — version 1.0*
