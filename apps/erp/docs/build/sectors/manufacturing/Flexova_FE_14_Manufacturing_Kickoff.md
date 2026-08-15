# Flexova — Manufacturing (Brief 9) — Kickoff

> Version: 1.0 — July 2026
> Sector build after Wholesale (FE_13). Reference activity: carpentry/furniture; engine generic across the six activities.
> **Read before starting.** Companion documents: `Flexova_FE_14_Manufacturing.md` (build spec) · `mfg.fixtures.json` (contracts) · `Flexova_FE_14_Manufacturing_BuildPrompts.md` (execution) · `Flexova_FE_14_Manufacturing_DoD.md` (gate).

---

## 1) What we're building

The Manufacturing module on top of the Core — BOM templates, manufacturing orders (MO) as the heart, simple stages, backflush material issue, direct labor, simple overhead, mandatory scrap, partial/full finished receipt, and actual finished-product costing that auto-posts to Accounting.

**Activities covered:** small factories · production workshops · food manufacturing · **carpentry & furniture (reference)** · garment manufacturing · print shops. One engine for all six; the depth, labels, fixtures, and edge cases follow carpentry.

---

## 2) Reuse, don't redefine

| Source | What it gives Manufacturing |
|---|---|
| **Inventory (FE_01)** | `item_type=manufactured` · WIP logical warehouse · weighted-average cost · movements |
| **Repair (FE_12)** | Staged-order lifecycle + approval-gated execution — the MO inherits this shape |
| **Accounting (FE_04)** | Auto-posting (WIP / finished / wages / overhead) |
| **HR (FE_06)** | Direct labor + wage rate |
| **Sales** | Optional MO ↔ customer order link |
| **Foundation (FE_00)** | Tokens, shell, i18n, appearance store, patterns (`DataTable`, `PageHeader`, `KpiCard`, `StatusPill`, `EmptyState`, `ErrorState`, `OfflineBanner`) |

---

## 3) Locked decisions (don't redesign)

1. **MO = lot** (per-branch numbering).
2. **BOM:** multi-level by definition, **single-level by execution** — each level is its own order.
3. **Backflush is the default**; manual issue sits behind advanced mode.
4. **Simple stages** — sequence + assignee + actual time. No routing, capacity, or standard time.
5. **Actual cost** — materials (WAC) + labor + overhead. No standard cost or variance.
6. **Simple overhead** — fixed / % of materials / rate × hours. No cost centers.
7. **WIP** = logical warehouse **and** GL account, linked through auto-posting.
8. **Scrap is mandatory** (reason from list) and **absorbed into finished cost** — no separate entry.
9. **Partial receipt** allowed at **order-average cost**.
10. **flag-don't-block** on material shortage · **reversal, never delete** on cancel.

---

## 4) Governing principle

**"Simple workshop by default, depth on demand."** The default path is one MO + backflush at finish. Manual issue, detailed stages, and overhead are available to those who need them, behind an advanced mode — the two-faces pattern from the Core.

---

## 5) Paths

```
spec      docs/build/sectors/manufacturing/FE_14_Manufacturing.md
fixtures  src/lib/mock/fixtures/mfg.fixtures.json
code      src/features/mfg/
```

---

## 6) Working rule

One screen per prompt → verify against its acceptance block → commit (`feat(mfg): ...`) → **stop for review**. Don't touch shell/tokens without asking. The Backend block is the last phase, after the Frontend is complete on the mock layer.

---

## 7) Golden checks (keep verifying throughout)

- Balances and costs change **only via documented movements**.
- Every manufacturing event auto-posts a **balanced entry** (Σ Dr = Σ Cr).
- Buttons gated by **real `can(key, scope)`** — never placeholders.
- All **five states** reachable via `?mock=loading|empty|error|no_results|offline`.
- **AR default + EN mirror**; RTL correct on every screen.
- **Feature-flag-aware:** works without HR (manual labor) and without Sales (no customer link).

---

## 8) Fixture scenario (what you're building against)

A furniture workshop with three flagship cases:
- **MO-0101** — repeat from template, status `partial` (4 of 10 received), full stages/labor/scrap/cost.
- **MO-0102** — custom-modified Order BOM (oversized wardrobe: wood 2.4→3.2, mdf 1.8→2.4) + material-shortage flag.
- **MO-0103** — semi-finished component (Prepared Door Panel) as its own single-level order.

Plus `journal_preview` showing the four auto-posting entries.

---

*End of Kickoff — Manufacturing (Brief 9), version 1.0*
