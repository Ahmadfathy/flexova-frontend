# Flexova — Manufacturing (Brief 9) — Definition of Done (DoD)

> Version: 1.0 — July 2026
> Gate before the Backend block. Check every item against the running build. A box is ticked only when verified in-app (not "implemented").
> Companion to `Flexova_FE_14_Manufacturing.md` + `mfg.fixtures.json`.

---

## 1) Foundation & reuse (no redefinition)
- [ ] Tokens, shell, i18n, appearance store, and patterns are imported from FE_00 — nothing redefined.
- [ ] `item_type=manufactured` consumed from Inventory; no parallel item concept created.
- [ ] WIP is a **logical warehouse** (`type=wip`), reusing the Inventory movement model — not a bespoke store.
- [ ] MO lifecycle reuses the Repair staged-order + approval-gated pattern (not reinvented).
- [ ] Weighted-average cost comes from Inventory; costing does not re-implement its own averaging.

## 2) Routes, IA, i18n
- [ ] All §2 routes resolve; `nav.mfg` appears only when `mfg.enabled`.
- [ ] Secondary tabs: Orders · BOM Templates.
- [ ] `mfg` namespace: AR default + EN mirror; no hard-coded UI strings.
- [ ] RTL correct on every screen (no hard-coded left/right); LTR flips cleanly in EN.

## 3) Five states (per data screen)
- [ ] Dashboard, MO list, MO detail tabs, BOM list/editor each reach loading / empty / error / no_results / offline via `?mock=...`.
- [ ] Offline shows the "as of last sync" banner, not an error.
- [ ] Empty states are activity-appropriate (e.g. "create your first BOM template").

## 4) BOM templates
- [ ] Template editor: Basic + Components & stages tabs; footer Save / Save as copy / Cancel.
- [ ] Expected scrap % per component supported.
- [ ] Semi-finished badge shows on components whose item is `manufactured`.
- [ ] **Clone produces an independent copy.**
- [ ] **Editing a template never mutates existing MOs** (they hold frozen Order BOMs).
- [ ] Gated by `mfg.bom.view` / `mfg.bom.manage`.

## 5) Manufacturing order — creation
- [ ] New-MO drawer: product (manufactured) + qty required; from-template or build-free.
- [ ] From-template copies Order BOM + stages as a **frozen editable copy**.
- [ ] **Custom-modify** works (MO-0102: wood 2.4→3.2, mdf 1.8→2.4) without touching the template.
- [ ] Semi-finished banner + link appears (MO-0103 path).
- [ ] Optional customer-order link; hidden if Sales absent.
- [ ] MO number = lot; per-branch numbering.
- [ ] Gated by `mfg.order.create`.

## 6) Manufacturing order — detail (hybrid)
- [ ] Sticky header: number + status pill, product/qty/received, running-cost breakdown, progress bar.
- [ ] Status-driven buttons: draft→Approve · approved→Start · in_progress|partial→Receive · always Cancel.
- [ ] Buttons **disabled without permission + tooltip** (SoD): Approve=`mfg.order.approve`, Receive=`mfg.finished.receive`.
- [ ] Overview tab: warehouses, issue mode, notes, progress.
- [ ] **flag-don't-block:** material-shortage banner shows AND approval is still allowed (MO-0102).
- [ ] BOM tab: available-in-stock inline warning; editable only while `draft`.
- [ ] Stages tab: ordered stages; assignee (optional), status pending→in_progress→done, manual start/end, scrap indicator.
- [ ] Add-labor inline: employee + hours → cost from HR rate or manual; **works with HR absent** (manual cost).
- [ ] Advanced manual material-issue modal appears only when issue_mode=manual (`mfg.material.issue`).
- [ ] Cost tab: materials/labor/overhead/scrap-effect/unit-cost with **drill-down per movement**.

## 7) Movements & costing engine
- [ ] Material issue creates Raw→WIP movements (backflush on receipt per Order BOM).
- [ ] Finished receipt drains WIP→Finished at computed unit cost; weighted-avg updates.
- [ ] **Partial receipt** works at current **order-average** cost (MO-0101: 4 of 10).
- [ ] `unit_cost = total ÷ Σ good_received`; scrapped material stays in WIP and **raises unit cost**.
- [ ] No balance or cost is editable directly — movements only.

## 8) Scrap
- [ ] Record-scrap modal: stage + qty + **mandatory reason** (from `scrap_reasons`) + note.
- [ ] Scrap effect appears immediately in Cost tab and is **absorbed into finished cost**.
- [ ] **No separate journal entry** for scrap v1.

## 9) Auto-posting (verified in FE_04 journal)
- [ ] Issue → Dr WIP / Cr Inventory-Raw.
- [ ] Labor → Dr WIP / Cr Wages-Payable.
- [ ] Overhead → Dr WIP / Cr Overhead-Applied.
- [ ] Finished receipt → Dr Inventory-Finished / Cr WIP.
- [ ] Every entry balanced (Σ Dr = Σ Cr); matches `journal_preview`.
- [ ] **Cancel after issue = reversing entries** (material returns WIP→Raw; nothing deleted).

## 10) Overhead
- [ ] Three methods supported: fixed / % of materials / rate × hours.
- [ ] Default overhead copied from template to Order; no cost centers.

## 11) Semi-finished (single-level execution)
- [ ] A `manufactured` component (Prepared Door Panel) is makeable as its **own MO** (MO-0103).
- [ ] No automatic multi-level explosion; each level is a separate order.

## 12) Permissions & scope
- [ ] Every screen uses real `can(key, scope)` — no placeholders.
- [ ] Branch/row scope applied (from FE_08).
- [ ] Full catalog present: `mfg.bom.view/manage`, `mfg.order.view/create/approve/execute`, `mfg.material.issue`, `mfg.finished.receive`, `mfg.scrap.record`, `mfg.export`.
- [ ] SoD-ready: approve vs finished-receive separable.

## 13) Feature-flag awareness
- [ ] Module disabled cleanly when `mfg.enabled=false`; consumers elsewhere don't break.
- [ ] Works without HR (manual labor) and without Sales (no customer link).
- [ ] Food batch/expiry fields appear only via Inventory `track_batch_expiry`.

## 14) Mock/backend contract
- [ ] All data flows through `lib/mock/client.ts` reading `mfg.fixtures.json`.
- [ ] Mock signatures mirror the future API 1:1 (drop-in ready) — shapes match the fixtures.

## 15) Commits & review
- [ ] One screen per Claude Code session; verified against its acceptance block; committed with a clear message (`feat(mfg): ...`).
- [ ] No shell/token changes without explicit approval.
- [ ] Prompt 8 verification pass produced a pass/fail report per §11 item.

---

*End of DoD — Manufacturing (Brief 9), version 1.0*
