# Flexova

A multi-tenant **SaaS ERP** for the Egyptian market, built on one flexible **Core** plus modules that activate per operating pattern (13 patterns). **ETA e-invoice/e-receipt compliance is a first-class Core feature.**

- **Stack:** React 18 · Vite · TypeScript · TailwindCSS v3.4 · shadcn/ui (Radix) · react-i18next · Zustand · JSON fixtures via a mock layer (no backend in the frontend phase).
- **Design principles:** Arabic-first / native RTL · radical simplicity · visible trust · offline-first (especially POS) · performance over ornament.
- **Language/UI:** Arabic default (RTL), English mirror (LTR). All UI strings via i18n keys.

> **First milestone = the full Core** (Inventory · Sales+ETA · Purchasing · Accounting · CRM · HR · Reports · Users/Roles/Permissions), then sectors starting with **Retail/POS**.

---

## Repository layout

```
flexova/
├── README.md                       # this file
├── docs/
│   ├── FE_BuildGuide.md            # build order, commands, checkpoints  ← start here
│   ├── build/                      # build-ready specs (Claude Code executes these)
│   │   ├── FE_00_Foundation.md
│   │   ├── FE_01_Inventory.md
│   │   ├── FE_02_Sales_ETA.md
│   │   ├── FE_03_Purchasing.md
│   │   ├── FE_04_Accounting.md
│   │   ├── FE_05_CRM.md
│   │   ├── FE_06_HR_Payroll.md
│   │   ├── FE_07_Reports.md
│   │   └── FE_08_Users_Roles_Permissions.md
│   └── reference/                  # context only (NOT executed directly)
│       ├── Project_Brief.md
│       ├── Market_Research_EG.md
│       ├── Design_Foundations.md
│       ├── SPEC_EN_00..08_*.md
│       └── UIUX_00..08_*.md
├── src/                            # app code (created by Claude Code from FE_00)
│   └── lib/mock/fixtures/          # runtime mock data (lives with the code, not in docs)
│       ├── inventory.fixtures.json
│       ├── sales.fixtures.json
│       ├── purchasing.fixtures.json
│       ├── accounting.fixtures.json
│       ├── crm.fixtures.json
│       ├── hr.fixtures.json
│       ├── reports.fixtures.json
│       └── permissions.fixtures.json
└── (package.json, vite.config.ts, tailwind.config.ts … created by Claude Code)
```

### Two kinds of files — don't mix them
- **`docs/build/`** — the specs Claude Code reads and implements. Point Claude Code here.
- **`docs/reference/`** — analysis/context (Brief, market research, the AR SPEC/UIUX). Read-only background; the build specs already distil what matters.
- **`src/lib/mock/fixtures/`** — the `.json` fixtures are **runtime code**, not docs. `lib/mock/client.ts` imports them. Keep them in `src/`, with short names (`inventory.fixtures.json`, not the long `Flexova_FE_01_*` name) so they match the paths written in the specs.

---

## How to build (summary)

The full sequence, commands, and acceptance checkpoints are in **`docs/FE_BuildGuide.md`**. In short:

1. Build **FE_00 Foundation first** (tokens, themes, Tailwind, shadcn, i18n, Appearance, App Shell). Nothing else starts until it passes its acceptance criteria.
2. Then build modules **in order** FE_01 → FE_08, each importing from the Foundation and reading its fixtures.
3. No backend in this phase — everything runs on the mock layer + fixtures so the whole frontend is verifiable before any API work.

---

## Locked decisions (don't re-litigate without a deliberate change)
- **MVP = full Core** (8 modules above) incl. ETA.
- **First sector after Core = Retail/POS.**
- **Customization:** vertical/horizontal layout · theme from a fixed set · Arabic primary / English.
- **Themes:** 6 (nile/emerald/clay/royal/teal/graphite); launch 3 first (nile + emerald + graphite).
- **Dark/Light:** follows the system by default + manual user override (user priority).
- **Font:** IBM Plex Sans Arabic. Tokens/components/states per the Design Foundations.
- **Tailwind v3.4** (stable) · **lucide-react** for icons.
- **Pricing:** deferred (open point).

## Status
Core frontend specs (FE_00–FE_08) complete and build-ready. Next: implement the Core via Claude Code, then Retail/POS.
