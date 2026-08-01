# Flexova — FE_16 Project-Based Services · Definition of Done (DoD)

> Tick every box before the module is considered complete. Grouped by build prompt. A box is done only when it's verifiable in the running app against `Flexova_FE_16_Project_Services.md` + fixtures. Test states via `?mock=loading|empty|error|no_results|offline`.
> Version: 1.0 — July 2026 · Build **FE_16**.

---

## A) Foundation (Prompt 1)
- [ ] Nav `nav.projects` shows only when module flag on **and** `projects.project.view`.
- [ ] All routes render: `/projects`, `/projects/new`, `/projects/:id` (+ tabs), `/time`, `/time/approvals`, `/projects/billing`.
- [ ] Types mirror fixtures exactly (enums: lifecycle · milestone-state · time-state · billing-source · billing-model).
- [ ] `lib/mock/client.ts` loads `projects.fixtures.json`; returns typed data.
- [ ] i18n namespace `projects` present (ar default + en mirror), seeded from spec tables.

## B) Projects list + Create (Prompt 2)
- [ ] Filters work: status · type · client · billing_model · team · date; chips removable.
- [ ] Columns render incl. hours actual/est (ProgressRow); **est. margin hidden without `projects.financials`**.
- [ ] Row actions gated by state (open/clone/hold↔activate/close).
- [ ] Clone → new **draft** copying scope+milestones only (no time/invoices).
- [ ] Create form validates required fields; **retainer billing_model blocks Activate without a linked Retainer + opening balance** (save-draft still allowed).
- [ ] Five states reachable; mobile → card list, filters → popover.

## C) Project detail + Overview (Prompt 3)
- [ ] Tabs render: Overview · Milestones · Time & Expenses · Invoices · Documents · Appointments · Team (each gated by its permission).
- [ ] Lifecycle actions (Activate/Hold/Close/Clone) via `ConfirmDialog`.
- [ ] Profitability panel is **ledger-derived** (hours/cost/revenue/margin computed from entries+invoices, nothing stored on project).
- [ ] Each figure links to its source list.
- [ ] **No-budget** → "add a budget to compare" hint; panel hidden without `financials`.
- [ ] Close **warns** about open work (submitted / approved-uninvoiced), non-blocking with confirm + log.
- [ ] Responsive: cards stack, panel accordion, tabs horizontal-scroll on mobile.

## D) Milestones (Prompt 4)
- [ ] Reorder (dnd-kit) persists sequence.
- [ ] State pill correct (draft → in_progress → approved → invoiced).
- [ ] **Bill disabled unless `approved`** with a tooltip stating the reason.
- [ ] Approve gated by `projects.milestone.approve`; makes milestone billable.
- [ ] **SoD:** approver ≠ requester → warn + append-only audit.
- [ ] Delete only on `draft`.
- [ ] Empty state = "No milestones — bills directly from time" (optionality confirmed).
- [ ] Responsive: rows → cards; editor drawer → full-screen sheet on mobile.

## E) Time — timer + manual + expenses (Prompt 5)
- [ ] Timer and manual entries produce **identical `TimeEntry` shape** (source flag differs).
- [ ] **One active timer per user** — new start auto-stops+saves current as draft (toast).
- [ ] Timer survives reload/offline (`idb-keyval`); duration is timestamp-derived (not a stored number).
- [ ] Timesheet rows: draft editable; submitted/approved locked for the employee.
- [ ] **Billable switch** present; non-billable entries logged but excluded from billing.
- [ ] Rate preview shows "pending" until approval.
- [ ] Expenses: markup field present, **default 0**, editable only with `projects.expense.markup`.
- [ ] Submit moves drafts → `submitted`.
- [ ] Offline: entries queue with sync chip, reconcile idempotently.
- [ ] Responsive: stacked cards, sticky compact timer bar, start modal full-screen.

## F) Active timer Topbar slot + Quick-Add (Prompt 6)
- [ ] Slot is **additive** (like `syncIndicator`); no other shell behavior changed; inherits theme/mode/language.
- [ ] Desktop/tablet: idle → Start button; running → full pill (`HH:MM:SS` + project) → routes to `/time`.
- [ ] **Mobile: no timer → not rendered; running → icon-only pill (`MM:SS`) → routes to `/time`.**
- [ ] Quick-Add `projects.timer` action opens Start modal over current page (**no navigation**), gated by `projects.time.log`.
- [ ] Topbar slot and `/time` read the **same timer store** (single active timer across surfaces).

## G) Time approvals (Prompt 7)
- [ ] Grouped table (employee → project) of submitted entries.
- [ ] Approve / reject (**reason required**) / bulk approve (ConfirmDialog).
- [ ] **On approve: rate resolves project > role > employee** (per-entry override wins); `rate_source` stored.
- [ ] **SoD:** approver = owner → block/warn + append-only audit.
- [ ] Rate preview gated by `financials`; approve gated by `projects.time.approve` (scope).
- [ ] Responsive: grouped cards on mobile.

## H) Billing hub (Prompt 8)
- [ ] Milestone tab: select approved fixed milestones → Generate → post → `invoiced` + auto-posting.
- [ ] **T&M tab: partial line-select** (deselect/edit before issue); each generated line carries `source_id`; sources flip `invoiced=true`; auto-posting.
- [ ] Retainer tab: **draw reduces balance (ledger), no new receivable**; top-up alert when low/exhausted.
- [ ] **Every invoice line traces to an approved source** — no free-typed lines.
- [ ] Mixed project: tabs operate independently on the same project.
- [ ] Empty = "no approved work ready to bill". Permission `projects.invoice.create` + financials.
- [ ] Responsive: preview grid → cards with checkboxes.

## I) Documents · Appointments · Team (Prompt 9)
- [ ] Documents attach at **project or milestone**; upload modal with category; download works.
- [ ] Appointments reuse Services calendar, scoped to project/client; create links to project.
- [ ] Team: add/remove from HR employees; **project-role feeds rate resolution**.
- [ ] Each permission-gated; five states + responsive.

## J) Cross-cutting sweep (Prompt 10)
- [ ] All screens pass the **five states** via `?mock=` switches.
- [ ] All screens responsive at desktop/tablet/mobile (tables→cards, filters→popover, drawers→sheets).
- [ ] Permissions verified: financials · milestone.approve · time.approve · invoice.create · close · expense.markup · branch/row scope.
- [ ] **AR default + EN mirror** on every string; RTL correct throughout.
- [ ] `globals.css` / `tailwind.config.ts` untouched; only additive `activeTimer` shell change.

---

## K) Governing invariants (final gate — all must hold)
- [ ] Every invoice line = an approved source.
- [ ] Milestone optional (project bills from time when none).
- [ ] One active timer per user.
- [ ] Time server-derived; timer & manual same shape.
- [ ] Rate resolves project > role > employee, override wins, `rate_source` stored.
- [ ] Actuals ledger-derived (nothing stored on project).
- [ ] SoD blocks/audits self-approval (milestones and time).
- [ ] Reversal not delete for posted invoices.

**When every box is ticked → module build done. Next stage: Backend block.**

*End of FE_16 DoD — version 1.0*
