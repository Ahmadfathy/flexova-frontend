# Flexova — FE_16 Project-Based Services · Build Prompts (EN, prompt-by-prompt)

> Run these **one at a time** in Claude Code. After each prompt: build, self-check against acceptance, **commit, and stop for review**. Source of truth: `Flexova_FE_16_Project_Services.md` + `Flexova_FE_16_Project_Services_fixtures.json` + `Flexova_FE_00_Foundation.md`. Do not touch `globals.css` / `tailwind.config.ts`. The only shell change is the additive `activeTimer` slot (Prompt 6).

---

## Prompt 1 — Foundation (routes · types · i18n · mock wiring)

Set up the Project-Based Services module scaffold. Do NOT build any screen UI yet — only wiring and types.
- Add module nav entry `nav.projects` (optional module, feature-flag-aware; hidden if flag off or no `projects.project.view`).
- Create routes (placeholders): `/projects`, `/projects/new`, `/projects/:id` (+ nested tabs `milestones`, `time`, `invoices`, `documents`, `appointments`, `team`), `/time`, `/time/approvals`, `/projects/billing`.
- Add TypeScript types for: `Project`, `Milestone`, `TimeEntry`, `Expense`, `Retainer`, `ProjectInvoice`, `Appointment`, `ProjectDocument`, `TeamMember` — mirror the fixtures exactly (field names + enums for lifecycle/milestone-state/time-state/billing-source/billing-model).
- Wire `lib/mock/client.ts` to load `projects.fixtures.json` (place at `src/lib/mock/fixtures/projects.fixtures.json`).
- Create i18n namespace `projects` (ar + en) seeded from the spec's AR/EN string tables.
**Acceptance:** app compiles; nav shows Projects (respecting flag/permission); all routes render an empty placeholder; mock client returns typed fixtures. **Commit + stop.**

---

## Prompt 2 — Projects list + Create project

Build `/projects` (list) and `/projects/new` (create), per spec §4.
- List: `PageHeader` (+ new, export) → toolbar (search + filters: status/type/client/billing_model/team/date, removable chips) → `DataTable` columns: code · title · client · status pill · billing_model chip · hours actual/est (ProgressRow) · **est. margin (gated by `projects.financials`)** · target_end · actions (open/clone/hold-activate/close).
- Create: FormLayout — client✱ (CRM picker+quick-add) · title✱ · type/label✱ · billing_model✱ · team[] rows (employee+project-role) · optional inline milestones[] (dnd order) · budget_estimated · hours_estimated · start_date✱ · target_end. **Rule:** `billing_model=retainer` requires a linked Retainer with opening balance before **Activate** (blocks activate, not save-draft).
- Clone → new draft copying scope+milestones only (no time/invoices).
- **Five states** + responsive (mobile card list, filters→popover) + permissions per §4.6.
**Acceptance:** filters work; margin hidden without financials; retainer activate-rule enforced; clone works; all 5 states reachable. **Commit + stop.**

---

## Prompt 3 — Project detail shell + Overview + profitability

Build the project detail tabbed shell and the Overview tab, per spec §5.
- `PageHeader` (code · title · status pill + Activate/Hold/Close/Clone via `ConfirmDialog`) → `ModuleTabs` (Overview · Milestones · Time & Expenses · Invoices · Documents · Appointments · Team) → top `StatCard`s (client · billing_model · dates · team count) → **profitability panel** (ledger-derived): hours actual vs est (ProgressRow) · cost actual+expenses vs budget · invoiced revenue vs expected · est. margin (MiniChart optional). Each figure links to its source list.
- Close warns about open work (submitted or approved-uninvoiced) — non-blocking with confirm, logged.
- No-budget state shows the hint; profitability gated by `financials`; tab visibility per-permission.
- Five states + responsive (cards stack, panel accordion on mobile, tabs horizontal-scroll).
**Acceptance:** figures computed from entries/invoices only; no-budget hint; close-warns; financials gated. **Commit + stop.**

---

## Prompt 4 — Milestones tab

Build `/projects/:id/milestones`, per spec §6.
- Reorderable list (dnd-kit): drag handle · sequence · name · billing_type chip · amount/estimate · **state pill** (draft/in_progress/approved/invoiced) · target_date · actions.
- Actions: edit (DrawerShell: name✱/sequence/billing_type✱/fixed_amount/hours_estimated/target_date/notes) · request approval · **approve (ConfirmDialog, `projects.milestone.approve`)** · **bill (disabled unless approved — tooltip explains)** · delete (draft only).
- Approve makes it billable; **SoD:** approver ≠ requester → warn + audit.
- Empty state = "No milestones — bills directly from time" (confirms optionality). Five states + responsive (rows→cards, drawer full-screen sheet on mobile).
**Acceptance:** bill disabled until approved (tooltip); reorder persists; empty confirms optionality; SoD warns on self-approval. **Commit + stop.**

---

## Prompt 5 — Personal Time (`/time`) — timer + manual + expenses

Build `/time` and the project-scoped `/projects/:id/time`, per spec §7.
- **Timer zone:** idle `Start timer` → modal (project✱/milestone?/description); running → live `HH:MM:SS` (tabular-nums) + project + Stop. **One active timer:** new start auto-stops+saves current as draft (toast). Use `idb-keyval` so it survives reload/offline; duration is timestamp-derived.
- **Timesheet table:** editable rows (rhf): project✱/milestone?/date✱/minutes(manual) or derived(read-only if timer origin)/description/**billable switch**/state pill/rate preview (muted "pending" until approval). Draft editable; submitted/approved locked for employee. Submit bar → `submitted`.
- **Expenses sub-table (project scope):** description/amount/**billable**/markup (field default 0, editable only with `projects.expense.markup`)/linked milestone?/invoiced.
- Timer entries carry `source:"timer"`+timestamps; manual carry `source:"manual"`+`manual_minutes`. Non-billable still logged, excluded from billing.
- Five states (offline: timer counts locally, entries queue with sync chip, idempotent reconcile) + responsive (stacked cards, sticky compact timer bar, start modal full-screen).
**Acceptance:** timer & manual yield identical shape; one active timer enforced; billable controls inclusion; markup gated+default 0; offline reconcile. **Commit + stop.**

---

## Prompt 6 — Active timer Topbar slot + Quick-Add (shell exception)

Add the **additive** `activeTimer` slot to the Topbar and register the Quick-Add action, per spec §11. This is the only approved shell change — additive, like `syncIndicator`; do not alter other shell behavior.
- `src/components/shell/ActiveTimer.tsx`, mounted in Topbar top-actions.
- Desktop/tablet (>640px): idle → small `Start timer` button (opens Start modal); running → full pill (⏱ + pulsing dot + `HH:MM:SS` + truncated project) → click routes to `/time`.
- Mobile (≤640px): **no timer → not rendered**; running → compact **icon-only** pill (pulsing dot + `MM:SS`) → tap routes to `/time`.
- Register create-action `projects.timer` in the create-actions registry (`method:modal`, permission `projects.time.log`, icon `timer`) → opens the Start modal over the current page (no navigation).
- Reads the same timer store as `/time` (single source; starting from either place is consistent).
**Acceptance:** slot additive, inherits theme/mode/lang; mobile behavior exact (hidden idle, icon-only running); Quick-Add starts timer without navigation; single active timer across surfaces. **Commit + stop.**

---

## Prompt 7 — Time approvals (`/time/approvals`)

Build the manager approval screen, per spec §8.
- `PageHeader` → filters (employee/project/date/billable) → grouped `DataTable` (employee → project): employee · project · milestone? · date · hours · description · billable · **resolved rate preview (gated)** · state.
- Actions: approve · reject (reason modal, required) · **bulk approve** (ConfirmDialog).
- **On approve:** resolve rate **project > role > employee** (per-entry override wins); store `rate_source`; entry → approved.
- **SoD guard:** approver = owner → block/warn + append-only audit.
- Five states + responsive (grouped cards on mobile). Permission `projects.time.approve` (scope).
**Acceptance:** rate resolves + `rate_source` recorded; self-approval blocked+audited; reject needs reason; financials gated. **Commit + stop.**

---

## Prompt 8 — Billing hub (`/projects/billing`)

Build the billing prep hub, per spec §9.
- `PageHeader` → project selector → 3 tabs.
- **Milestone tab:** list approved fixed milestones → select → Generate (fixed lines) → post → milestones `invoiced` + auto-posting.
- **T&M tab:** aggregate approved+billable+un-invoiced TimeEntry & Expense → **line-selectable preview grid** (source badge/date/desc/hours-amount/rate/total) → **user deselects/edits (partial)** → Generate; each line keeps `source_id`; sources → invoiced=true; auto-posting.
- **Retainer tab:** show balance; approved billable work → **draw** (reduces ledger, no new receivable) → top-up alert when low/exhausted.
- Generate → invoice preview modal (reuse) → confirm posts. Mixed projects: tabs operate independently on same project.
- Five states (empty = "no approved work ready to bill") + responsive (preview → cards with checkboxes). Permission `projects.invoice.create` + financials.
**Acceptance:** T&M partial line-select; each line carries source_id; sources flip to invoiced; retainer draw reduces balance w/o receivable; auto-posting fires; nothing bills without an approved source. **Commit + stop.**

---

## Prompt 9 — Documents · Appointments · Team tabs (inherited)

Build the three inherited tabs, per spec §10.
- **Documents:** attach to project or milestone; row (name/category/uploaded_by/date/download) + upload modal (category). Reuse existing attachment pattern. Permission `projects.document.*`.
- **Appointments:** reuse Services FE_11 calendar filtered to project/client; create links to project. No new billing logic. Permission `projects.appointment.*`.
- **Team:** members with project-role; add/remove from HR employees; role feeds rate resolution. Permission `projects.team.manage`.
- Five states + responsive for each.
**Acceptance:** documents attach at both levels; calendar scoped to project; team role available to rate resolution. **Commit + stop.**

---

## Prompt 10 — States / responsive / permissions sweep + acceptance

Final pass — no new features.
- Verify every screen handles all **five states** (test via `?mock=loading|empty|error|no_results|offline`).
- Verify responsive at desktop/tablet/mobile for every screen (tables→cards, filters→popover, drawers→full-screen sheets, timer mobile behavior).
- Verify permissions hide/disable correctly (financials, milestone.approve, time.approve, invoice.create, close, expense.markup, branch/row scope).
- Verify AR default + EN mirror on every string; RTL correct.
- Run the global acceptance list from spec §13 and the DoD checklist; fix gaps.
**Acceptance:** all coverage-contract items pass; DoD green. **Commit + stop — module build complete; next is the Backend block.**

*End of FE_16 Build Prompts — version 1.0*
