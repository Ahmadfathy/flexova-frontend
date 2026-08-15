# Flexova — FE_16 Project-Based Services (build-ready)

> **Sector pattern — Brief 7 (Project-based professional services).** Frontend spec for law firms, accounting/audit, engineering & consulting, marketing agencies. Page by page: every field / state / interaction / permission / responsive / AR+EN, with fixtures.
> Version: 1.0 — July 2026
> **Build number:** FE_16 (sector build after FE_15 Time-based/Play).
> **Source of truth (do not redefine):** `Flexova_FE_00_Foundation` (tokens/components/shell/i18n) · `Flexova_Design_Foundations` (layer 1). **Reuses without redefining:** Repair/Manufacturing (staged-order + approval-gated) · FE_15 Time-based (Start/Stop counter, server-authoritative time) · F&B (check→document billing) · Services FE_11 (calendar) · HR (hourly pay / commission) · CRM (customer) · Accounting (auto-posting).
> **The one genuinely new thing:** the **Project/Case** as a containing entity (scope + phases + time + documents + billing) and **milestone billing** (fixed-fee vs time-and-materials vs retainer). Everything else is inherited.

---

## 0) Module scope (recap)

**In v1:** Project/Case entity (per-tenant label) · milestones/phases (**optional**) with approval-gate · time tracking (live Start/Stop timer **+** manual timesheet, one shared `TimeEntry` shape) billable/non-billable · rate resolution (project > role > employee, per-entry override) · expenses/disbursements (billable, markup field present, default 0) · documents attach (project or milestone) · appointments (calendar) · retainer (prepaid balance, ledger-derived) · billing in three modes + mixed (fixed-fee milestone / T&M partial line-select / retainer draw) · actual-vs-estimated profitability · full auto-posting.

**Out (deferred, data model respects them):** complex retainer rules · multi-currency · client portal · advanced billing rules (caps/tiered discounts) · advanced profitability reports · **real-estate management** (own module later). Expense markup **rules** are deferred; the field exists at 0.

Consumes CRM customers, HR employees + rates, Inventory items (for stock-item expenses), Accounting treasuries via the mock layer. Data via `lib/mock/client.ts` reading `projects.fixtures.json`.

---

## 1) The project → invoice model (the spine — drives the whole UI)

Work items become invoice lines **only through an approved source**. Nothing bills without a source.

```
Project ──┬── Milestone(fixed) ──approved──► Invoice line (fixed amount)
          │
          ├── TimeEntry(billable) ──approved──┐
          │                                    ├─► Invoice lines (hours × rate)   [T&M]
          ├── Expense(billable) ───────────────┘
          │
          └── Retainer ──draw──► reduces prepaid balance (ledger) instead of a new invoice
```

**Governing rules (carried from Core):**
- **Ledger-derived:** actual hours / cost / revenue are computed from movements, never stored on the project. The document is a frozen copy.
- **Server-authoritative time:** duration is derived from timestamps (live timer) or `manual_minutes` (timesheet); the client reports events, the server is the source (carried from Brief 4).
- **Approval-gated:** a milestone cannot be invoiced before `Approved`; a time entry is not billable before `Approved`.
- **Reversal not delete:** cancelling a posted invoice = reversing entry.
- **Every invoice line = at least one approved source.** No free-typed lines.

**Milestone is optional:** a project with no milestones bills directly from approved time entries / expenses (T&M) or from a retainer draw.

**Billing models (per project):** `fixed` · `t&m` · `retainer` · `mixed`. Mixed = same project runs a fixed milestone **and** T&M entries; invoices stay separate by source.

---

## 2) Routes & IA

Mounts under shell nav `nav.projects` (optional module, feature-flag-aware). Secondary **Tabs** live inside the project detail, not at module root.

```
/projects                       → Projects list                          [§4]
/projects/new                   → Create project (full page)             [§4.9]
/projects/:id                   → Project detail (tabbed)                [§5–§10]
   ├─ (overview)                → Overview + profitability               [§5]
   ├─ /milestones               → Milestones                            [§6]
   ├─ /time                     → Time & expenses (project-scoped)       [§7.6]
   ├─ /invoices                 → Project invoices                       [§9.5]
   ├─ /documents                → Documents                             [§10.1]
   ├─ /appointments             → Appointments (calendar)               [§10.2]
   └─ /team                     → Team & roles                          [§10.3]
/time                           → Personal time screen (timer+sheet)     [§7]
/time/approvals                 → Time approvals (manager)               [§8]
/projects/billing               → Billing prep hub (3 source tabs)       [§9]
```

**Modals/drawers:** Client quick-pick + quick-add (modal, reuses CRM) · Milestone editor (drawer) · Timer start picker (modal — project/milestone/description) · Expense add (drawer) · Approve/reject reason (modal) · Invoice preview (modal, per source) · Document upload (modal) · Confirm activate/close/cancel (`ConfirmDialog`).
**i18n namespace:** `projects`. AR default, EN mirror — strings tabled per section.
**Not PosLayout:** standard back-office shell. The only shell touch is the **Topbar `activeTimer` slot** (§11), an approved additive exception like `syncIndicator`.

---

## 3) State systems (used everywhere)

**A) Project lifecycle (`StatusPill`):** `draft`(neutral) → `active`(success) → `on_hold`(warning) → `closed`(neutral) → `archived`(muted). `cancelled`(danger) via reversal, never delete.

**B) Milestone state (`StatusPill`):** `draft`(neutral) → `in_progress`(brand) → `approved`(success) → `invoiced`(muted). **Gate:** billing disabled unless `approved`.

**C) Time entry state (`StatusPill`):** `draft`(neutral) → `submitted`(warning) → `approved`(success) · `rejected`(danger). Only `approved` + `billable` + not-yet-invoiced entries reach billing.

**D) Billing source (badge on invoice lines):** `milestone` · `time` · `expense` · `retainer_draw`. Every line carries its source id for traceability.

**Timer rule (carried):** **one active timer per user.** Starting a new one auto-stops the current one (toast: "previous timer stopped and saved as draft").

---

## 4) Screen — Projects list (`/projects`)

### 4.1 Purpose
Browse/search/filter projects across clients and billing models; entry to open, clone-as-template, create.

### 4.2 Layout
Shell `main`. `PageHeader` (title + actions) → toolbar (search + filters) → `DataTable`.

### 4.3 Components
**PageHeader actions:** `+ projects.new` (primary) · `export`.
**Toolbar:** SearchInput (code / title / client); filters — status · type(label) · client · billing_model · team member · date range. Active filters as removable chips.
**DataTable columns** (start→end): code (`.num`, LTR) · title · client (name) · status pill · billing_model chip · **hours actual / estimated** (ProgressRow mini) · **margin est.** (`formatMoney`, end — *gated*) · target_end · actions menu.
- Row click → project overview. Row actions: `open` · `clone` (template) · `hold`/`activate` (by state) · `close` (gated).
- Bulk bar: export.

### 4.4 Five states
- **Loading:** skeleton rows. **Empty:** EmptyState + "No projects yet — start one" + CTA. **Error:** ErrorState + retry. **No results:** distinct, echoes filters. **Offline:** OfflineBanner (read-only fallback; this module is online-first, not POS-grade).

### 4.5 Responsive
Desktop full table; tablet hides margin + billing chip; mobile → card list (code + title + client + status pill + hours progress + actions). Filters → popover.

### 4.6 Permissions (`projects.project.*`)
No `view` → module hidden. No `create` → hide new. No `financials` → hide margin/revenue columns. No `close` → hide close. Branch/row scope filters the list.

### 4.7 AR / EN
| key | AR | EN |
|---|---|---|
| projects.title | المشاريع | Projects |
| projects.new | مشروع جديد | New project |
| projects.filters.status | الحالة | Status |
| projects.filters.billing | نموذج الفوترة | Billing model |
| projects.status.draft | مسودة | Draft |
| projects.status.active | نشط | Active |
| projects.status.on_hold | معلّق | On hold |
| projects.status.closed | مغلق | Closed |
| projects.status.archived | مؤرشف | Archived |
| projects.status.cancelled | ملغى | Cancelled |
| projects.billing.fixed | مبلغ ثابت بالمرحلة | Fixed-fee milestone |
| projects.billing.tm | بالوقت والخامات | Time & materials |
| projects.billing.retainer | دفعة مقدمة | Retainer |
| projects.billing.mixed | مخلوط | Mixed |
| projects.col.hours | ساعات فعلي/مقدّر | Hours actual/est. |
| projects.col.margin | الهامش التقديري | Est. margin |

### 4.8 Acceptance
List filters on status/type/client/billing/team; margin column hidden without `financials`; clone creates a new draft copying scope+milestones (no time/invoices); all 5 states reachable.

### 4.9 Create project (`/projects/new`)
Full-page form (FormLayout). Fields: client ✱ (CRM picker + quick-add) · title ✱ · type/label ✱ (per-tenant) · billing_model ✱ · team[] (employee + project-role, add rows) · milestones[] (optional inline: name + sequence + billing_type + amount/estimate + target_date, dnd order) · budget_estimated · hours_estimated · start_date ✱ · target_end.
**Rule:** if `billing_model = retainer` → a Retainer with an opening balance must be created/linked before **Activate** (validation blocks activate, not save-draft). Other models: no constraint.
Buttons: `save draft` (always) · `create & activate` (validates retainer rule). On create → project overview.

---

## 5) Screen — Project detail · Overview (`/projects/:id`)

### 5.1 Purpose
One glance at status, team, and **actual-vs-estimated profitability**; entry to lifecycle actions and every tab.

### 5.2 Layout
`PageHeader` (code · title · status pill + actions: Activate / Hold / Close / Clone) → `ModuleTabs` (Overview · Milestones · Time & Expenses · Invoices · Documents · Appointments · Team) → top cards → profitability panel.

### 5.3 Components
**Top cards (StatCard):** client · billing_model · dates (start → target/actual) · team count.
**Profitability panel (ledger-derived):**
- **Hours:** actual (Σ approved entries) vs estimated — ProgressRow.
- **Cost:** actual (Σ hours×cost_rate) + expenses vs `budget_estimated`.
- **Revenue:** invoiced-to-date (Σ posted invoice lines) vs expected.
- **Est. margin:** revenue − cost, with % (MiniChart trend optional).
Each figure links to its source list (e.g. "actual hours" → Time & Expenses filtered approved).

### 5.4 Interactions
Activate/Hold/Close via `ConfirmDialog`. Close blocked if there are `submitted` (un-approved) entries or `approved`-uninvoiced work → warning listing what's open (non-blocking option to close anyway with confirm, logged).

### 5.5 Five states
- **Loading:** card + panel skeletons. **Empty (no budget):** profitability panel shows "No estimate — add a budget to compare" with a link. **Error:** ErrorState + retry. **No-results:** n/a (single record). **Offline:** read-only banner.

### 5.6 Responsive
Desktop: cards row + panel side-by-side. Tablet: stacked. Mobile: cards single column, panel as accordion; tabs → horizontal scroll.

### 5.7 Permissions
Activate/Close need `projects.project.close`/`approve` scope. Profitability panel hidden without `financials`. Tab visibility follows per-tab permission (e.g. Invoices needs `projects.invoice.view`).

### 5.8 AR / EN
| key | AR | EN |
|---|---|---|
| projects.tab.overview | نظرة عامة | Overview |
| projects.tab.milestones | المراحل | Milestones |
| projects.tab.time | الوقت والمصاريف | Time & expenses |
| projects.tab.invoices | الفواتير | Invoices |
| projects.tab.documents | المستندات | Documents |
| projects.tab.appointments | المواعيد | Appointments |
| projects.tab.team | الفريق | Team |
| projects.overview.hours | ساعات فعلي مقابل مقدّر | Actual vs estimated hours |
| projects.overview.cost | تكلفة فعلي مقابل الموازنة | Actual cost vs budget |
| projects.overview.revenue | إيراد مفوتر | Invoiced revenue |
| projects.overview.margin | الهامش التقديري | Estimated margin |
| projects.action.activate | تفعيل | Activate |
| projects.action.hold | تعليق | Hold |
| projects.action.close | إغلاق | Close |
| projects.overview.no_budget | مفيش تقدير — أضف موازنة للمقارنة | No estimate — add a budget to compare |

### 5.9 Acceptance
All figures are computed from entries/invoices (nothing stored on project); no-budget state shows the hint; close warns about open work; financials gated.

---

## 6) Screen — Milestones tab (`/projects/:id/milestones`)

### 6.1 Purpose
Manage phases, drive them through the approval gate, and expose which are billable.

### 6.2 Layout
Reorderable list (dnd-kit) + milestone editor drawer.

### 6.3 Components
**Milestone row:** drag handle · sequence · name · billing_type chip (fixed/t&m/retainer-draw) · amount **or** estimate · **state pill** (draft/in_progress/approved/invoiced) · target_date · actions.
**Row actions:** edit (drawer) · `request approval` (draft/in_progress → submitted for approval) · `approve` (gated) · `bill` (disabled unless `approved`; tooltip states the reason when disabled) · delete (draft only).
**Editor drawer (DrawerShell):** name ✱ · sequence · billing_type ✱ · fixed_amount (if fixed) · hours_estimated · target_date · notes.

### 6.4 Interactions
Approve → `ConfirmDialog`; on approve the milestone becomes billable and `bill` enables. Approving is `projects.milestone.approve`. SoD: approver ≠ the person who requested (if same → warn + audit).

### 6.5 Five states
- **Loading:** skeleton rows. **Empty:** "No milestones — this project bills directly from time" (confirms optionality). **Error:** retry. **No-results:** n/a. **Offline:** read-only banner.

### 6.6 Responsive
Desktop full rows; mobile stacks each row into a card (name + state + amount + actions menu). Drawer full-screen sheet on mobile.

### 6.7 Permissions
Create/edit need `projects.milestone.edit`. Approve needs `projects.milestone.approve`. Bill needs `projects.invoice.create`. Delete only on draft.

### 6.8 AR / EN
| key | AR | EN |
|---|---|---|
| projects.ms.title | المراحل | Milestones |
| projects.ms.new | مرحلة جديدة | New milestone |
| projects.ms.request | طلب اعتماد | Request approval |
| projects.ms.approve | اعتماد | Approve |
| projects.ms.bill | فوترة | Bill |
| projects.ms.state.draft | مسودة | Draft |
| projects.ms.state.in_progress | جارية | In progress |
| projects.ms.state.approved | معتمدة | Approved |
| projects.ms.state.invoiced | مفوترة | Invoiced |
| projects.ms.bill_locked | لازم اعتماد المرحلة قبل الفوترة | Approve the milestone before billing |
| projects.ms.empty | مفيش مراحل — المشروع يتفوتر مباشرة من الوقت | No milestones — bills directly from time |

### 6.9 Acceptance
Bill is disabled until `approved` (tooltip explains); reorder persists; empty state confirms optionality; SoD warns on self-approval.

---

## 7) Screen — Personal time (`/time`) + project-scoped tab (`/projects/:id/time`)

### 7.1 Purpose
Log time two ways (live timer + manual sheet), both producing the same `TimeEntry`; submit for approval; add expenses.

### 7.2 Layout
`/time`: timer zone (top) → timesheet table (center) → submit bar. `/projects/:id/time` is the same table pre-filtered to the project, plus an Expenses sub-table.

### 7.3 Components — timer zone
**Idle:** `Start timer` button → modal (project ✱ · milestone? · description). **Running:** live counter (`HH:MM:SS`, tabular-nums) + project label + `Stop`. **One active timer:** starting a new one auto-stops+saves the current as draft (toast). Mirrors to the Topbar slot (§11).

### 7.4 Components — timesheet table
Editable rows (react-hook-form): project ✱ · milestone? · date ✱ · **minutes** (manual) or derived (timer origin, read-only) · description · **billable** switch · state pill · rate preview (resolved on approval; shown muted as "pending"). Draft rows editable; submitted/approved locked for the employee.
**Submit bar:** select drafts → `Submit` → `submitted`.
**Expenses sub-table (project scope):** description · amount · **billable** switch · markup (field, default 0, editable if `projects.expense.markup`) · linked milestone? · invoiced? .

### 7.5 Interactions
Timer origin entries carry `source: "timer"` with start/stop timestamps (duration server-derived); manual carry `source: "manual"` with `manual_minutes`. Both editable while draft. Non-billable entries still logged (for HR pay / utilization) but excluded from billing.

### 7.6 Five states
- **Loading:** skeleton. **Empty:** "No time logged yet — start the timer or add a row". **Error:** retry. **No-results:** filtered. **Offline:** timer keeps counting locally; entries queue with a sync chip and reconcile server-side on reconnect (idempotent).

### 7.7 Responsive
Desktop table; mobile → stacked cards per entry; timer zone becomes a sticky compact bar; Start modal full-screen sheet.

### 7.8 Permissions
`projects.time.log` to create own entries. `projects.expense.edit` for expenses. `projects.expense.markup` to edit markup. Employees see only their own entries unless `projects.time.view_all` (scope).

### 7.9 AR / EN
| key | AR | EN |
|---|---|---|
| projects.time.title | الوقت | Time |
| projects.time.start | ابدأ عدّاد | Start timer |
| projects.time.stop | إيقاف | Stop |
| projects.time.manual | إضافة يدوية | Add row |
| projects.time.minutes | الدقائق | Minutes |
| projects.time.billable | قابل للفوترة | Billable |
| projects.time.submit | إرسال للاعتماد | Submit |
| projects.time.state.draft | مسودة | Draft |
| projects.time.state.submitted | مُرسَل | Submitted |
| projects.time.state.approved | معتمد | Approved |
| projects.time.state.rejected | مرفوض | Rejected |
| projects.time.timer_switched | تم إيقاف العدّاد السابق وحفظه | Previous timer stopped and saved |
| projects.expense.title | المصاريف | Expenses |
| projects.expense.markup | هامش | Markup |

### 7.10 Acceptance
Timer and manual both yield identical `TimeEntry` shape; one active timer enforced; billable flag controls billing inclusion; markup field present, gated, defaults 0; offline entries reconcile.

---

## 8) Screen — Time approvals (`/time/approvals`, manager)

### 8.1 Purpose
Approve/reject submitted entries; rate resolves on approval.

### 8.2 Layout
`PageHeader` → filters → grouped `DataTable` (by employee → project).

### 8.3 Components
**Filters:** employee · project · date range · billable.
**Rows:** employee · project · milestone? · date · hours · description · billable · **resolved rate preview** · state.
**Actions:** `approve` · `reject` (reason modal) · **bulk approve**.
**On approve:** rate resolves **project > role > employee** (with per-entry override if set); `rate_source` stored; entry → `approved`.

### 8.4 Interactions
`ConfirmDialog` for bulk. **SoD guard:** if approver = entry owner → block/warn + append-only audit.

### 8.5 Five states
Loading skeleton · Empty ("nothing pending approval") · Error+retry · No-results (filters) · Offline read-only.

### 8.6 Responsive
Desktop grouped table; mobile → grouped cards with per-entry approve/reject.

### 8.7 Permissions
`projects.time.approve` (scope-bound). Reject requires reason. Financials (rate preview) gated by `financials`.

### 8.8 AR / EN
| key | AR | EN |
|---|---|---|
| projects.appr.title | اعتماد الساعات | Time approvals |
| projects.appr.approve | اعتماد | Approve |
| projects.appr.reject | رفض | Reject |
| projects.appr.reason | سبب الرفض | Rejection reason |
| projects.appr.bulk | اعتماد الكل | Approve all |
| projects.appr.self | مينفعش تعتمد ساعاتك بنفسك | You can't approve your own time |
| projects.appr.empty | مفيش ساعات في انتظار الاعتماد | Nothing pending approval |

### 8.9 Acceptance
Rate resolves and `rate_source` recorded on approval; self-approval blocked+audited; reject requires reason.

---

## 9) Screen — Billing prep hub (`/projects/billing`)

### 9.1 Purpose
Turn approved work into invoices via three source tabs; T&M supports **partial line selection**.

### 9.2 Layout
`PageHeader` → project selector → three tabs: **Milestone** · **Time & Materials** · **Retainer**.

### 9.3 Tab — Milestone
List of `approved` milestones (fixed) → select one/many → **Generate invoice** (fixed amount lines). On post → milestones `invoiced`; auto-posting to Accounting.

### 9.4 Tab — Time & Materials
Aggregates `approved` + `billable` + un-invoiced `TimeEntry` and `Expense`. Preview grid (line-selectable): source badge · date · employee/desc · hours/amount · rate · line total. **User can deselect / edit lines (partial)** before issuing. Generate invoice → each line keeps its `source_id`; sources set `invoiced=true`; auto-posting.

### 9.5 Tab — Retainer
Shows retainer balance; approved billable work → **draw** against balance (reduces ledger, no new receivable) → top-up alert when balance is low/exhausted. Project invoices are listed under the project's Invoices tab (§9 view reuses F&B check→document).

### 9.6 Interactions
Generate → invoice preview modal (reuses invoice preview) → confirm posts. Nothing bills without an approved source. Mixed projects: each tab operates independently on the same project.

### 9.7 Five states
Loading skeleton · **Empty ("no approved work ready to bill")** · Error+retry · No-results (filters) · Offline read-only (billing is online-first).

### 9.8 Responsive
Desktop split (selector + tab content); mobile → selector on top, tab content stacked, preview grid → cards with checkboxes.

### 9.9 Permissions
`projects.invoice.create` to generate. `financials` to see rates/amounts. Branch scope limits selectable projects.

### 9.10 AR / EN
| key | AR | EN |
|---|---|---|
| projects.bill.title | تجهيز الفواتير | Billing prep |
| projects.bill.tab_ms | المراحل | Milestone |
| projects.bill.tab_tm | الوقت والخامات | Time & materials |
| projects.bill.tab_ret | الدفعة المقدمة | Retainer |
| projects.bill.generate | توليد فاتورة | Generate invoice |
| projects.bill.select_lines | اختر السطور للفوترة | Select lines to bill |
| projects.bill.draw | خصم من الرصيد | Draw from balance |
| projects.bill.topup | الرصيد قرب يخلص — يحتاج شحن | Balance low — top up |
| projects.bill.empty | مفيش شغل معتمد جاهز للفوترة | No approved work ready to bill |

### 9.11 Acceptance
T&M allows partial line selection; each generated line carries source_id; sources flip to invoiced; retainer draw reduces balance without a new receivable; auto-posting fires; nothing bills without an approved source.

---

## 10) Screens — Documents · Appointments · Team (inherited)

### 10.1 Documents (`/projects/:id/documents`)
Attach files to project **or** milestone. Row: name · category · uploaded_by · date · download. Upload modal (category select). Reuses the existing attachment pattern. Permission `projects.document.*`. States: loading/empty("No documents")/error/offline read-only.

### 10.2 Appointments (`/projects/:id/appointments`)
Calendar reused from Services FE_11, filtered to the project/client. Create appointment links to project. No new billing logic. Permission `projects.appointment.*`.

### 10.3 Team (`/projects/:id/team`)
List of members with project-role. Add/remove (from HR employees). Project-role feeds rate resolution (role rate). Permission `projects.team.manage`.

**AR/EN (shared):**
| key | AR | EN |
|---|---|---|
| projects.doc.upload | رفع مستند | Upload document |
| projects.doc.category | التصنيف | Category |
| projects.appt.new | موعد جديد | New appointment |
| projects.team.add | إضافة عضو | Add member |
| projects.team.role | الدور في المشروع | Project role |

---

## 11) Active timer — Topbar slot (approved additive shell exception)

Additive `activeTimer` slot in the Topbar, same family as `syncIndicator`. Inherits theme/mode/language.

**Desktop / tablet (>640px):**
- Idle → small `Start timer` button → opens the Start modal (project/milestone/description).
- Running → full pill: ⏱ + pulsing dot + `HH:MM:SS` (tabular-nums) + truncated project name. Click → `/time` to stop/edit.

**Mobile (≤640px) — "show only when needed":**
- **No active timer → not rendered** in the Topbar (the Topbar is already tight: search hidden, user-chip icon-only). Starting happens from `/time` **or from Quick-Add** (register "Start timer" as a create-action → opens the Start modal over any page via the Global Create Dispatcher).
- **Timer running → compact icon-only pill:** pulsing dot + `MM:SS` only (no project name, no controls). Tap → navigate to `/time` for full control.

So on mobile the timer is a **status indicator** (like `syncIndicator`), not a control surface — full control lives in `/time`.

```
Desktop  : [⏱ ● 00:42:15 · Nile Tower ▸]     (full pill)
Mobile idle   : (none — start via Quick-Add)
Mobile running: [● 00:42]                     (icon-only → /time)
```

**Quick-Add registration:** add `entityKey: "projects.timer"` to the create-actions registry (`method: modal`, permission `projects.time.log`, icon `timer`). It opens the Start modal over the current page — no navigation.

---

## 12) Component mapping (design system + shadcn)

| Need | Component |
|---|---|
| Page frame | `PageHeader` · `ModuleTabs` · `PageSection` |
| Tables | `DataTable` (+ `EntityCell`, `ActionCell`, `StatusPill`) |
| Forms | `FormLayout` · Input · Select · DatePicker · Switch (billable) · Textarea |
| Milestone list | dnd-kit rows + `DrawerShell` editor |
| Timer | custom `ActiveTimer` (Topbar slot) + Start `ModalShell` |
| Profitability | `StatCard` · `ProgressRow` · `MiniChart` (Recharts) |
| Approvals | grouped `DataTable` + `ConfirmDialog` + reason `ModalShell` |
| Billing preview | line-select table + invoice preview `ModalShell` |
| States | Skeletons · EmptyState · ErrorState · OfflineBanner |
| Create hub | `QuickAdd` + create-dispatcher (`openCreate`) |

**Stack:** React 18 · Vite · TS · Tailwind v3.4 · shadcn/ui (Radix) · react-i18next · Zustand · TanStack Table · react-hook-form+zod · Recharts · react-day-picker · dnd-kit · lucide · idb-keyval (timer offline) · mock layer.

**Do not touch without permission:** `globals.css` (tokens) · `tailwind.config.ts` (themes). Only additive shell touch = `activeTimer` Topbar slot.

---

## 13) Global acceptance (coverage contract)

Every entity → its screens; every screen → 5 states + responsive + permissions + AR/EN; every action → its result.
- Project bills only through approved sources; milestone optional; T&M partial line-select works; retainer draw reduces balance without a receivable.
- Time from timer and manual are identical shape; one active timer enforced; billable flag controls billing; rate resolves project>role>employee on approval with `rate_source`.
- Profitability is ledger-derived; financials gated; SoD blocks self-approval; cancel = reversal not delete.
- Mobile timer is status-only; Quick-Add starts timer without navigation.

**Next in the delivery set:** kickoff · build prompts (EN, prompt-by-prompt) · DoD checklist · Backend block · Overview PDF.

*End of FE_16 Project-Based Services — version 1.0*
