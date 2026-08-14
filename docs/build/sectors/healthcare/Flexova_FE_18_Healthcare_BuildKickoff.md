# Flexova — FE_18 Healthcare · Build Kickoff & Prompts

> **Execution map for building the Healthcare sector module with Claude Code.** Read before opening Claude Code. Sector pattern (Brief 5), builds on the completed Core + Brief 3 appointment engine.
> Version: 1.0 — August 2026 · Build no. **FE_18**

---

## 0) Mental model

- The spec `FE_18_Healthcare.md` is **build-ready**: every route, entity, field, state, permission, and acceptance test is decided. Claude Code implements faithfully, does not redesign.
- **No backend in this phase.** Data comes from `Flexova_FE_18_Healthcare_fixtures.json` through the existing mock layer (`src/lib/mock/client.ts`). Mock signatures mirror the future API 1:1.
- **This is a sector module, not Core.** It registers under the shell **Sector group** with `moduleFlag:"healthcare"` (FE_00 nav rules) — zero shell changes. It **imports** tokens/components/shell/i18n/appearance from FE_00 and **reuses** the appointment engine + provider-commission from Brief 3 (FE_11). Do not redefine or rebuild any of these.
- **One module per session.** Build FE_18, verify its acceptance gate, commit.
- **PHI is the new axis.** Unlike Core modules, clinical data is access-gated *and* read-logged. Treat `healthcare.clinical.view` as a hard gate on rendering, and emit an access-log event on every clinical-surface open.

---

## 1) Path conventions & file placement

**Prerequisite:** an existing working repo with Core (FE_00–FE_08) **and** Brief 3 (appointment engine + provider-commission) already built. This module extends it — it does not scaffold a new project.

Place the five FE_18 deliverables like this before opening Claude Code:

| Delivered file | Repo path |
|---|---|
| `Flexova_FE_18_Healthcare.md` | `docs/build/sectors/healthcare/Flexova_FE_18_Healthcare.md` |
| `Flexova_FE_18_Healthcare_fixtures.json` | `src/lib/mock/fixtures/Flexova_FE_18_Healthcare_fixtures.json` |
| `Flexova_FE_18_Healthcare_BuildKickoff.md` | `docs/build/sectors/healthcare/Flexova_FE_18_Healthcare_BuildKickoff.md` (this file) |
| `Flexova_FE_18_Healthcare_Backend.md` | `docs/reference/Flexova_FE_18_Healthcare_Backend.md` (backend phase — later) |
| `Flexova_FE_18_Healthcare_Overview.pdf` | `docs/reference/Flexova_FE_18_Healthcare_Overview.pdf` (visual summary) |

> Sector **docs** live under `docs/build/sectors/<sector>/` (e.g. `healthcare/`, `retail-pos/`, `fnb/`), each keeping the full `Flexova_FE_NN_*` filename — mirroring how the Core specs sit directly in `docs/build/`. The **fixtures** are code, not docs: they live in `src/lib/mock/fixtures/` under their full name, read by the mock layer.

Working paths during the build:

| Thing | Path |
|---|---|
| Build spec | `docs/build/sectors/healthcare/Flexova_FE_18_Healthcare.md` |
| Fixtures | `src/lib/mock/fixtures/Flexova_FE_18_Healthcare_fixtures.json` |
| App code | `src/modules/healthcare/` |
| Mock layer | `src/lib/mock/client.ts` (existing) |

> The mock layer reads the fixtures from `src/lib/mock/fixtures/Flexova_FE_18_Healthcare_fixtures.json` (full name). Confirm the path in Session Zero.

Register the module route tree under the shell Sector group. The sector nav item appears automatically when `moduleFlag:"healthcare"` is entitled (FE_00 §nav) — no edits to shell files.

---

## 1.5) Session Zero — the start prompt (open Claude Code here)

Open Claude Code **in the repo root**, confirm the two files are placed (§1), then paste this **first**. It orients Claude Code and verifies prerequisites before any building. Do not skip to Prompt 1 until this passes.

> This repo already has the Flexova Core (FE_00–FE_08) and the Brief 3 appointment engine implemented. I'm adding a new **sector module: Healthcare (FE_18)**. Before building anything: (1) read `docs/build/sectors/healthcare/Flexova_FE_18_Healthcare_BuildKickoff.md` end to end — it's the execution map. (2) Read the spec `docs/build/sectors/healthcare/Flexova_FE_18_Healthcare.md` and the fixtures `src/lib/mock/fixtures/Flexova_FE_18_Healthcare_fixtures.json`. (3) Confirm these exist and report their paths back to me: the FE_00 tokens/components/shell/i18n/appearance store, the existing mock layer `src/lib/mock/client.ts`, and the Brief 3 appointment + provider-commission entities I'll reuse. (4) Confirm the shell nav Sector-group registration mechanism (`moduleFlag`) so I add Healthcare without editing shell files. **Do not write any module code yet** — just verify the ground and list, in order, the 7 build prompts you'll execute from §2. Once you've confirmed all of the above, stop and wait for me to send Prompt 1.

**Session Zero gate (must all be true before Prompt 1):**
- Spec + fixtures found at the expected paths.
- FE_00 foundation imports resolve (tokens/components/shell/i18n/appearance).
- Brief 3 appointment + provider entities located (to reuse, not rebuild).
- Sector-group `moduleFlag` registration path confirmed — no shell edits needed.
- Claude Code has **not** written code yet — it only verified and listed the plan.

If any item fails, fix placement/paths before continuing. Then send **Prompt 1**.

---

## 2) Build prompts (prompt-by-prompt)

Work top to bottom. Don't start a prompt until the previous one renders and passes its check. Each prompt is self-contained — paste it as-is into Claude Code.

> In the prompts below, `FE_18_Healthcare.md` is shorthand for the full spec path `docs/build/sectors/healthcare/Flexova_FE_18_Healthcare.md` (established in Session Zero). Section refs like "§4" point inside that file.

### Prompt 1 — Module scaffold + Today Board (operational spine)
> Read `docs/build/sectors/healthcare/Flexova_FE_18_Healthcare.md` and `src/lib/mock/fixtures/Flexova_FE_18_Healthcare_fixtures.json`. The Core (FE_00–FE_08) and the Brief 3 appointment engine are already implemented — import tokens, UI/pattern components, App Shell, i18n, and the appearance store from FE_00; consume the existing appointment/provider entities; do not redefine or rebuild them. Register this module under the shell **Sector group** with `moduleFlag:"healthcare"` (no shell edits). Build the route tree from §1 and implement **§3 Today Board** exactly: PageHeader with provider picker + KPI row, the time-ordered queue DataTable with the status-driven contextual row button (check-in / start-visit / collect), all five states (skeleton/empty/no-results/error/offline row-level), AR default + EN mirror. Gate "بدء الزيارة" behind `healthcare.clinical.view` and emit an access-log event on encounter open. Wire data through the existing mock layer. Then confirm the §3.7 acceptance criteria.

### Prompt 2 — Encounter (module heart, merged clinical screen)
> Read §4 of `FE_18_Healthcare.md`. Build the **Encounter** screen at `/healthcare/encounter/:id` exactly: the fixed context rail (warning strip for allergies/chronic, last-3-encounters, dynamic specialty-extension block) + the light-tabbed workspace (Diagnosis default · Prescription · Labs/Radiology · Invoice). Implement "إنهاء الزيارة" disabled until ≥1 diagnosis or invoice line, and on finish: lock encounter → generate invoice with insurance split (read CoveragePlan) → return to Today Board. Gate the clinical tabs behind `healthcare.clinical.view`; make the invoice tab administrative. Implement error → local draft saved, and offline → encounter written locally with `local/syncing/synced`. Confirm §4.8 acceptance.

### Prompt 3 — Patients list + add/edit + quick-add + veterinary
> Read §5. Build the Patients list (`/healthcare/patients`), full add/edit, the <15s quick-add modal (phone+name, dedupe warn), and the **veterinary path** (§5.5): owner-first (owner is the dedupe key) then 1:many animals, with billing/comm/collection bound to the owner and encounter/diagnosis bound to the animal. Render the dynamic `specialty_ext` block per tenant specialty. Mark allergies/chronic as PHI (clinical gate). Confirm §5.8 acceptance.

### Prompt 4 — Patient 360 (medical)
> Read §6. Build Patient 360 at `/healthcare/patients/:id`: header + clinical strip (PHI) + tabs (Visits/Orders&Results/Prescriptions = clinical; Invoices&Balance/Insurance/Data = administrative). Enforce the PHI split — without `healthcare.clinical.view`, show only administrative tabs and replace clinical ones with "محتوى طبي — غير مصرّح". Read financials from Accounting (never recompute). Log every profile open. Implement the veterinary animal-switch. Confirm §6.6 acceptance.

### Prompt 5 — Lab / Radiology queue & results (order→result)
> Read §7. Build the lab queue at `/healthcare/lab`: KPI row, the orders DataTable with status-driven action (enter-result modal → notify-patient WhatsApp → deliver). Result value is clinical PHI: technician enters, requesting doctor reads in encounter context, reception sees status only. Ready results must surface in Patient 360 and the next follow-up encounter. Offline: result entry local + sync. Confirm §7.7 acceptance.

### Prompt 6 — Insurance (Payers & Plans) + Catalog (admin)
> Read §8 and §9. Build the Insurance admin (`/healthcare/insurance`): Payers table + per-payer Plans (coverage_pct/cap/co_pay/exclusions) — these feed the encounter split engine; v1 is pricing-only, no claims lifecycle. Build the Service & Test catalog (`/healthcare/catalog`) with CSV import; make lab/radiology sections feature-flag-aware (hide cleanly for a consult-only clinic). Gate both behind their admin permissions (no clinical access). Confirm §8.6 and §9.6 acceptance.

### Prompt 7 — PHI permissions + access log wiring
> Read §11 and §12. Register the Healthcare permission keys into the existing FE_08 catalog: `today.view`, `patients.view`, `patients.view_all` (scope widener), `clinical.view`/`clinical.edit`, `lab.manage`, `insurance.manage`, `catalog.manage`. Enforce the default-narrowed scope (provider sees own patients unless `view_all`). Wire the immutable access-log so every open of a clinical surface writes a who/whom/when event (consistent with the carried audit log). Verify the §12 role-visibility matrix holds across all screens.

---

## 3) Acceptance gate (verify before commit)

The §14 module acceptance list is the gate. High-signal checks:

- **Today Board:** contextual row button tracks status; **no clinical content ever renders**; check-in + collect work offline and sync; collect issues an ETA receipt.
- **Encounter:** single screen, no navigation away; Finish disabled until diagnosis/line present; insurance split auto-computed and **reconciles** (`patient_portion + insurer_portion = total`); persists offline; clinical tabs gated + open logged.
- **Order→Result:** lifecycle correct; reception sees status not value; ready result flows to 360 + next encounter.
- **Insurance:** pricing-only (split), no claim submission; insurer portion opens as AR in Accounting.
- **Provider:** inherited from Brief 3 (ServiceProvider on commission), zero rebuild.
- **Patient model:** unified core + dynamic `specialty_ext`; Owner/Guarantor separate (self hidden for humans, active for veterinary/pediatric).
- **PHI:** clinical vs administrative split enforced everywhere; reads logged; provider default scope narrowed; role-visibility matrix (§12) holds.
- **Flags:** lab/insurance surfaces are feature-flag-aware and degrade gracefully.

---

## 4) Cross-module integrations already wired in the spec

Don't rebuild these — they should "just connect":
- **Appointments/providers ← Brief 3:** Today Board "＋موعد" and the provider picker consume the existing engine; doctor = ServiceProvider on commission.
- **Invoice/ETA ← Sales (FE_02):** individual patient → B2C receipt; insurer → B2B; the split adds `patient_portion`/`insurer_portion` on top, ETA routing unchanged.
- **AR ← Accounting (FE_04):** patient balance + insurer AR are read, never recomputed.
- **WhatsApp/dedupe ← CRM (FE_05):** result-ready + reminder use CRM templates + comm log; phone dedupe reused (on owner for veterinary).
- **Permissions ← FE_08:** the PHI keys extend the existing catalog; access-log extends the existing immutable audit.

---

## 5) Definition of Done (DoD) — FE_18

A ✅ requires **all** of:

1. All 6 screens (§3–§9) implemented page-by-page with the five states, responsive, AR+EN.
2. Module registered under the Sector group via `moduleFlag:"healthcare"` — **zero shell/token edits**.
3. Encounter is a single merged screen; Finish generates invoice + correct split; offline-persistent.
4. Order→Result lifecycle demonstrable end-to-end from the fixtures.
5. Insurance split reconciles arithmetically on every insured invoice in the fixtures.
6. Provider/appointment reuse from Brief 3 confirmed (no duplicated engine).
7. PHI: clinical gate enforced on all clinical surfaces; access-log event emitted on every clinical open; role-visibility matrix (§12) passes manual walkthrough per role.
8. All five states reachable via `?mock=loading|empty|error|offline` on every screen.
9. Feature-flag-aware: toggling off lab/insurance hides their surfaces without runtime errors.
10. Acceptance criteria (§14) confirmed and committed as one focused session.

---

*End of FE_18 Healthcare build kickoff.*
