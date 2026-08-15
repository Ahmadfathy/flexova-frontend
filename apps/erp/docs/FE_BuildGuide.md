# Flexova — FE Build Guide

> Execution map for building the Core frontend with Claude Code. Read this before opening Claude Code.
> Version: 1.0 — June 2026

---

## 0) Mental model

- The specs in `docs/build/` are **build-ready**: every token, file, field, state, and acceptance test is already decided. Claude Code's job is to implement them faithfully, not redesign.
- **No backend in this phase.** All data comes from JSON fixtures through a mock layer (`src/lib/mock/client.ts`). The mock signatures mirror the future API 1:1, so swapping to a real backend later is a drop-in.
- **Order is mandatory.** FE_00 is the foundation every module imports from. Build it first and verify it before anything else.
- **One module per session.** Keep each Claude Code session focused on a single FE_NN; verify its acceptance criteria; commit; move on. This keeps context small and output high-quality.

---

## 1) Path conventions (state these to Claude Code if it asks)

| Thing | Path |
|---|---|
| Build specs | `docs/build/FE_NN_*.md` |
| Reference (context only) | `docs/reference/*` |
| App code | `src/` |
| Mock layer | `src/lib/mock/client.ts` |
| Fixtures | `src/lib/mock/fixtures/<module>.fixtures.json` |

> The specs reference fixtures as `<module>.fixtures.json` (e.g. `inventory.fixtures.json`). Put them at `src/lib/mock/fixtures/` with those short names. If you placed them elsewhere, tell Claude Code the real path in your first prompt.

---

## 2) Build order & per-step prompts

Work top to bottom. Don't start a step until the previous one passes its acceptance criteria (§3).

### Step 0 — FE_00 Foundation  *(do this alone, first)*
> Read `docs/build/FE_00_Foundation.md`. Scaffold a Vite + React 18 + TypeScript project with TailwindCSS v3.4, shadcn/ui, react-i18next, and Zustand. Implement exactly as specified: `src/styles/globals.css` (§4), `tailwind.config.ts` (§6), the appearance store + AppearanceProvider + DirProvider (§7), i18n setup + `lib/format.ts` (§8), the folder structure (§2), the App Shell components (§9), and the core UI/pattern components (§10). Use lucide-react for icons. Then walk through and confirm the acceptance criteria in §12.

Stop and verify §12 before continuing.

### Steps 1–8 — modules in order
Use this template, swapping NN and the module name:
> Read `docs/build/FE_NN_<module>.md` and `src/lib/mock/fixtures/<module>.fixtures.json`. The Foundation (FE_00) is already implemented — import tokens, components, shell, i18n, and the appearance store from it; do not redefine them. Build this module's routes, pages, and screens exactly as specified, page by page, including all five states, responsive behavior, permissions gating, and AR/EN strings. Wire data through the existing mock layer reading the fixtures. Then confirm the module's acceptance criteria.

Order:
1. **FE_01 Inventory** — items, categories, units, price lists, warehouses, ledger, stocktake, transfers, adjustments, low-stock, import.
2. **FE_02 Sales + ETA** — invoices (3-zone editor + readiness panel), issued view, credit/debit notes, quotations, receipts, ETA hub, ETA settings.
3. **FE_03 Purchasing** — suppliers, purchase invoices, PO/receipt (advanced), returns, vouchers, inbound-ETA hub.
4. **FE_04 Accounting** — dashboard, treasuries, expenses, receipts/payments, transfers, journal, COA, trial balance, statements, reconciliation, closing, opening-balance wizard. *(two faces: simple/accounting.)*
5. **FE_05 CRM** — customers, 360 hub, follow-ups, segments, communications, loyalty (off), credit control, import.
6. **FE_06 HR & Payroll** — employees, attendance, advances, payroll run, payslips, commissions, statutory (off).
7. **FE_07 Reports** — dashboards, library, viewer, builder, ETA/tax dashboard, Z-report, scheduling.
8. **FE_08 Users/Roles/Permissions** — users, roles (templates + matrix), security, audit log, branches & scope; enforces the unified permission catalog across all modules.

### Step 9 — wire cross-module enforcement (after FE_08)
> Now that the permission catalog (FE_08 §2) exists, go back through FE_01..07 and confirm each screen's permission gating and branch/row scoping uses the real `can(key, scope)` check, not placeholders.

---

## 3) Per-step acceptance checkpoints (gate before moving on)

Each spec ends with **"Module acceptance criteria"** — that list is the gate. High-signal checks per step:

- **FE_00:** theme switches via one `data-theme`; UI flips RTL↔LTR with no hard-coded `left/right`; dark/light follows system + user override persists; `bg-primary/50` opacity works; no hard-coded UI strings.
- **FE_01:** no editable balance field (movements only); service items have no Stock tab; item without `eta_code` saves but is flagged; all 5 states reachable via `?mock=loading|empty|error|offline`.
- **FE_02:** payment status & ETA status independent (two columns/filters); "Issue & submit" disabled while a blocker exists; B2B shows `clearing` (not valid) pre-acceptance; B2C issues offline + window countdown; rejection reasons in plain Arabic.
- **FE_03:** purchase invoice creates an `in` movement + updates weighted-avg cost; supplier balance computed; inbound ETA 72h countdown + accept/reject/match; low-stock deep-link pre-fills a PO/PI.
- **FE_04:** every approved doc auto-posts a balanced entry; Σdr=Σcr enforced; closed-period posting rejected; collection allocates oldest-first; two faces (owner vs accountant).
- **FE_05:** one customer reusable across modules; duplicate phone → merge suggestion; company needs TRN before B2B; AR mirrors Accounting; over-limit credit blocked unless overridden (logged).
- **FE_06:** payroll run posts one balanced entry; commissions on collected base from salesperson-tagged txns; advance disburses immediately; statutory applies only when enabled; closed-period run blocked.
- **FE_07:** every number drills down to source; no recomputation of source figures; scope hides out-of-scope; daily WhatsApp summary; Z-report fully offline.
- **FE_08:** default-deny enforced; branch/row scope filters every module; sensitive actions write immutable audit; last admin can't be disabled; suspend terminates sessions + retains data; 2FA enforceable.

---

## 4) Cross-module integrations already wired in the specs

These are intentional and should "just connect" — don't rebuild them:
- **Low-stock → PO/PI:** FE_01 §12 deep-links to FE_03 `…/new?from=lowstock&ids=`.
- **Customer picker:** FE_02 reads CRM customers (FE_05); 360 `+ invoice`/`collect` deep-link to Sales/Accounting.
- **Commission base:** FE_06 pulls salesperson-tagged transactions from Sales/CRM.
- **Auto-posting:** Sales/Purchasing/HR approved docs post to Accounting (FE_04).
- **Reports read-only:** FE_07 displays figures owned by other modules; never recomputes.
- **Permissions everywhere:** FE_08's catalog gates every screen/action in FE_01..07.
- **Fixtures cross-reference:** IDs are shared across fixtures (e.g. `cu_noor`, `it_rice`, `br_main`) so flows connect end-to-end.

---

## 5) Working tips

- **Verify visually after FE_00** (theme/RTL/dark mode) before building screens — a wrong foundation propagates everywhere.
- **Use the mock state switch** (`?mock=loading|empty|error|no_results|offline`) to exercise all five states without faking data by hand.
- **Commit per module** with a clear message (`feat(inventory): items list + item card + ledger`).
- **Keep sessions scoped** to one FE_NN; paste only that spec + its fixtures.
- If Claude Code proposes a redesign, point it back to the spec — decisions are locked unless you change them deliberately.

---

## 6) After the Core
- **Phase 5 — Sectors:** start with **Retail/POS** on top of the Core, same methodology (POS grid, sold-by-weight, variants…), reusing FE_02's e-receipt/sign/sync logic and the offline patterns throughout.
- **Backend:** replace the mock layer with real APIs (signatures already match), then add multi-tenant data, auth, and the live ETA integration.

*End of FE Build Guide — version 1.0*
