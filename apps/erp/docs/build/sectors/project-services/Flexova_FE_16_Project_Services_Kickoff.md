# Flexova — FE_16 Project-Based Services · Build Kickoff

> **Sector: Brief 7 (Project-based professional services).** Read this before running the build prompts. It sets the working rules, the source of truth, and the build order. The prompt-by-prompt English prompts live in `Flexova_FE_16_Project_Services_BuildPrompts.md`.
> Version: 1.0 — July 2026 · Build number **FE_16** (after FE_15 Time-based/Play).

---

## 1) What we're building
The **Project/Case module** — a containing entity (scope + phases + time + documents + billing) with **milestone billing** (fixed-fee / T&M / retainer / mixed). Serves law firms, accounting/audit, engineering & consulting, marketing agencies. Everything except the container + milestone billing is **inherited** (do not re-implement): staged-order + approval-gate (Repair/Manufacturing), Start/Stop timer + server-authoritative time (FE_15), check→document billing (F&B), calendar (Services FE_11), hourly pay (HR), customer (CRM), auto-posting (Accounting).

## 2) Source of truth (do not redefine)
- **Spec:** `Flexova_FE_16_Project_Services.md` (page by page — the contract).
- **Fixtures:** `Flexova_FE_16_Project_Services_fixtures.json` (mock data + relationships).
- **Foundation:** `Flexova_FE_00_Foundation.md` (tokens/components/shell/i18n/states).
- **Tokens/themes:** `Flexova_Design_Foundations.md` — **never touch `globals.css` / `tailwind.config.ts` without explicit permission.**

## 3) Working rules (carried)
- Discuss before decisions · **screen-by-screen with a stop** · commit + stop for review · no touching shell/tokens without permission.
- The **only** approved shell touch here = additive `activeTimer` Topbar slot (like `syncIndicator`) + a Quick-Add create-action for "Start timer". Nothing else in the shell changes.
- Not PosLayout — standard back-office shell (online-first; not POS offline-grade). The timer keeps counting locally offline and reconciles idempotently.
- i18n namespace: `projects`. AR default, EN mirror. All strings from the spec's AR/EN tables.
- Mock layer only: `lib/mock/client.ts` reads `projects.fixtures.json`. Backend is a later drop-in matching these shapes (**Backend block = last stage**).

## 4) Governing invariants (must hold in the UI)
1. **Every invoice line = an approved source** (milestone approved · time/expense approved+billable · retainer draw). No free-typed lines.
2. **Milestone is optional** — a project with none bills directly from time.
3. **One active timer per user** — starting a new one auto-stops+saves the current.
4. **Time is server-derived** (timestamps or `manual_minutes`); timer and manual yield the same `TimeEntry` shape.
5. **Rate resolves on approval:** project > role > employee, per-entry override wins; store `rate_source`.
6. **Ledger-derived actuals** — never store hours/cost/revenue on the project.
7. **SoD:** approver ≠ entry owner (warn + append-only audit if same).
8. **Reversal not delete** for posted invoices.

## 5) Build order (each prompt = one stop for review)
1. Foundation — routes, types, i18n, mock wiring, fixtures load.
2. Projects list + Create project (retainer-activate rule).
3. Project detail shell (tabs) + Overview + profitability panel.
4. Milestones tab (dnd order + approval gate).
5. Personal Time (`/time`) — timer + manual timesheet + expenses.
6. Active timer Topbar slot + Quick-Add registration (shell exception).
7. Time approvals (`/time/approvals`) — rate resolution + SoD guard.
8. Billing hub (`/projects/billing`) — 3 source tabs + T&M partial line-select.
9. Documents · Appointments (calendar) · Team tabs (inherited).
10. States/responsive/permissions sweep + acceptance checklist.

## 6) Completeness contract (per screen)
Routes & IA · page purpose · layout (shell area + grid) · full component breakdown (header/filters/columns/fields+validation/buttons) · **the five states** concrete · interactions/transitions · responsive (desktop/tablet/mobile) · permissions (hide/disable) · AR+EN strings · acceptance criteria. Coverage check: every entity → its screens · every screen → 5 states + responsive + permissions + AR/EN · every action → its result.

## 7) File conventions
```
docs/build/sectors/project-services/    ← FE_16 spec + kickoff + build prompts + DoD
src/routes/projects/*                    ← screens
src/lib/mock/fixtures/projects.fixtures.json   ← (delivery name has underscores; repo name is dotted)
src/components/shell/ActiveTimer.tsx     ← additive Topbar slot
```

## 8) How to start
Open Claude Code in the repo with the spec + fixtures + this kickoff loaded, then run **Prompt 1** from `Flexova_FE_16_Project_Services_BuildPrompts.md`. Stop after each prompt for review.

*End of FE_16 Kickoff — version 1.0*
