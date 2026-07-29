# Flexova — FE_15 Time-based / Play (build-ready)

> **Phase 5 — Sector pattern 7 (Brief 4: time/session-based services).** PlayStation/billiards/ping-pong halls · kids' areas · game halls · co-working. Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — July 2026
> **Source of truth (do not redefine):** `Flexova_Design_Foundations` (tokens/components/shell/i18n) · `Flexova_FE_09_Retail_POS` (PosLayout, shift/treasury, tender modal, product-grid+density, e-receipt/ETA, 5 states, per-terminal numbering, flag-don't-block) · `Flexova_FE_10_FnB` (check→document, product overlay, BOM flag-aware) · `Flexova_FE_02_Sales_ETA` (invoice/e-receipt/ETA, print A4+80mm) · `Flexova_FE_06_HR_Payroll` (commission engine) · `Flexova_FE_05_CRM` (customer).
> **Golden rules (carried):** (1) Quantities/costs are **ledger-derived**; the counter is derived from start/stop timestamps, never a mutable stored number. (2) **Reversal not delete** — cancelling a session with an issued e-receipt posts a reversal. (3) **flag-don't-block** — missing config is flagged, operation never stops. (4) **Offline is a normal operating state**, not an error.

---

## 0) Module scope (recap)

**In v1:** device-grid floor board with live counters · **Session-with-Segments** engine (the novel core) · postpaid (open counter) + **prepaid fixed block** (countdown, single-step pay-to-start) · rate plans with peak/off-peak **rate windows** (auto-split on crossing) · device/station + ticket/pool occupancy · four device states · transfer across device-types · pause/resume · cafeteria on the same check (reuse F&B) · end & bill → check→document → e-receipt/ETA + 80mm · optional HR commission · session log · sector settings.

**Out (deferred, data-model-aware):** online self-booking · prepaid **time wallet** (rechargeable hours balance) · recurring co-working **memberships** (reuse Services subscriptions later) · duration-tiering (first-hour-then-X) · dynamic pricing · visual drag floor map · advanced loyalty.

Consumes: Inventory service items (ETA code/tax) + products/BOM via the mock layer; POS shift/tender/e-receipt; HR commission (optional); CRM customer (optional). Data via `lib/mock/client.ts` reading `play.fixtures.json`.

---

## 1) The spine — Session, Segments, and time-as-price (drives the whole UI)

**Session** = one or more **Time Segments**. Each segment = `(device, rate-window, start, stop)` → `duration → billable units (ceil + min) → × rate`. The counter is **derived from timestamps** (terminal clock, offline-safe); it is never stored as an editable number.

The segment model resolves four behaviours with one abstraction:
| behaviour | mechanism |
|---|---|
| **peak/off-peak crossing** | when now passes a rate-window boundary → **auto-split**: close current segment, open a new one at the new rate. Background, no cashier action. |
| **transfer** (any device-type) | close current segment, open a new segment on the target device at **its** rate (PS5 > PS4 is expected). Check moves with the session. |
| **pause/resume** | close segment (gap not billed) → resume opens a new segment at the then-current rate. |
| **rounding/minimum** | applied per rate-plan (`unit` + `rounding` + `min`) when computing billable units at close. |

**Two session modes:**
- **postpaid** (open counter): counter counts **up**; tender at **end** → check→document → e-receipt/ETA.
- **prepaid fixed block** (countdown): pick block → **tender immediately in one step** (e-receipt issues on pay) → counter counts **down** from block duration → near-empty alert → `Extend` (new block / overflow to postpaid) or `End`.

**Session states (`StatusPill`):** `active`(brand, running) · `paused`(warning) · `closing`(neutral, became a check, awaiting pay — postpaid) · `paid`(success) · `cancelled`(neutral, reversal).

**Cafeteria billing on prepaid** — tenant setting `prepaid_cafeteria_billing`: `separate` (time prepaid, cafeteria billed postpaid at end — **default**) | `combined` (check stays open, all billed together at end).
**Peak-crossing display** — tenant setting `peak_crossing_notify`: `silent` (split shown only as two invoice lines — **default**) | `notify` (live toast on the card at crossing). Both are **display/timing only**; neither changes the financial model.

**flag-don't-block:** service item missing `eta_code`/tax → issue is blocked at pay (like Sales), but the **session never stops**.

---

## 2) Routes & IA

Operational screens mount under **`PosLayout` route-scoped `/play/*`** (additive; inherits theme/mode/lang; `syncIndicator` slot). Back-office settings + session log mount under the normal shell nav.

```
# Operational (PosLayout /play/*) — requires an open shift
/play                           → Floor Grid (all devices, live counters)   [§4]
/play/sessions                  → Session log (back-office table)            [§9]

# Back-office settings (normal shell, nav.play_settings, gated)
/settings/play                  → Sector settings (toggles)                  [§8]
/settings/play/device-types     → Device-Type list + editor                  [§7]
/settings/play/devices          → Device list + editor (+ bulk add)          [§7]
/settings/play/rate-plans       → Rate Plan editor (rules + prepaid blocks)  [§7]
```

**Modals/sheets (over Floor Grid):** Start Session (sheet, §5.2) · Session Card (drawer, §5.3) · Cafeteria overlay (reuse FE_10 product-grid, §5.4) · Transfer (sheet, §5.5) · Prepaid Extend (modal, §5.6) · End & Pay (reuse tender + invoice preview, §5.7) · Reserve/Maintenance (quick action, §5.8) · Cancel session (`AlertDialog`, gated, §5.9).
**i18n namespace:** `play`. AR default, EN mirror.

---

## 3) Reuse map (explicit — do not redefine)

| capability | source | usage here |
|---|---|---|
| PosLayout, shift open/close, treasury, Z-report | FE_09 / FE_07 | sessions run inside a shift; Z-report includes session (time) + cafeteria revenue |
| tender modal | FE_09 | prepaid pay-to-start + postpaid end & pay |
| product-grid + density (4→12) | FE_09 | device grid density + cafeteria overlay |
| check→document, product overlay, BOM flag-aware | FE_10 | session owns a check; cafeteria lines added to it |
| invoice preview + e-receipt/ETA + A4/80mm print | FE_02 | close → document → e-receipt/ETA |
| service item (eta_code/tax) | FE_01 | device-type's time line = service item |
| commission engine | FE_06 | optional supervisor commission, off by default |
| customer | FE_05 | optional; walk-in default (cash → B2C) |

**Dependency graph:** Hard = POS (shift/tender/ETA) + Inventory (service item). Optional flag-aware = cafeteria (if F&B/products off → time-only session runs fine), HR commission, CRM customer. Every consumer is feature-flag-aware.

---

## 4) Screen — Floor Grid (`/play`) — the operating board

### 4.1 Purpose
Single board of all devices with states + live counters; the cashier starts/transfers/adds-cafeteria/ends any of 10+ parallel sessions from here.

### 4.2 Layout
`PosLayout` main. Header (branch + shift chip + density control + `syncIndicator`) → filter row → **device card grid** → a **ticket/pool zone** for device-types with `occupancy = ticket` (a single "＋ new session" card + active-count).

### 4.3 Components
**Device card:** name/number · **state** (semantic color) · live counter (up for postpaid / down for prepaid) · running total (`formatMoney`, `tabular-nums`) · cafeteria badge (if lines) · tap → Session Card (busy) or Start sheet (free).
**Filter:** by device-type / by state. **Density:** 4→12 (reuse). **Ticket/pool zone:** for kids-area style types; sessions open on the Device-Type directly (no physical station), each active ticket becomes a mini-card.

### 4.4 Five states
- **Loading:** skeleton grid. **Empty:** "No devices yet — add from settings" + link (gated). **Error:** ErrorState + retry. **No results:** distinct, echoes filter. **Offline (primary):** counters run locally from terminal clock; `syncIndicator` chip `local/syncing/synced`; never blocks.

### 4.5 Responsive
Desktop dense grid; tablet fewer columns; mobile single-column card list with the same live data (cashier can still operate).

### 4.6 Permissions
`play.operate` + branch scope. Out-of-scope devices/branches **hidden**, not errored. Settings link gated by `play.config`.

### 4.7 AR / EN
| key | AR | EN |
|---|---|---|
| play.floor.title | صالة التشغيل | Floor |
| play.device.free | فاضي | Free |
| play.device.busy | مشغول | Busy |
| play.device.reserved | محجوز | Reserved |
| play.device.oos | خارج الخدمة | Out of service |
| play.running_total | الجاري | Running |
| play.new_session | ＋ جلسة جديدة | ＋ New session |

### 4.8 Acceptance
Grid shows every in-scope device with correct state + live counter; density adjustable; ticket/pool types start sessions without a physical device; fully operable offline.

---

## 5) Session lifecycle screens

### 5.2 Start Session (sheet)
Tap a free device → sheet. **Fields:** mode (`postpaid` default / `prepaid block`) · if prepaid: **block** picker · customer (optional quick-pick/quick-add, walk-in default) · supervisor (only if HR commission on) · play-mode tag (single/double — only if defined on the rate plan).
**Action:** `postpaid` → "Start" (device→busy, counter up, first segment opens at the current-window rate). `prepaid` → **"Start & pay" opens the tender modal inline (single step)**; on tender success → e-receipt/ETA issued, countdown starts.
**States:** normal · offline (start works; e-receipt queued). **Permissions:** `play.operate`; prepaid tender needs `play.collect`.
**AR/EN:** `play.start`="ابدأ"/"Start", `play.start_pay`="ابدأ وادفع"/"Start & pay", `play.mode.postpaid`="عدّاد مفتوح"/"Open counter", `play.mode.prepaid`="بلوك مدفوع"/"Prepaid block", `play.pick_block`="اختر البلوك"/"Pick block".
**Acceptance:** postpaid starts in 2 taps; prepaid is a single pay-to-start step that issues an e-receipt and begins the countdown.

### 5.3 Session Card (drawer)
Tap a busy device → details + actions: **＋ Cafeteria · Transfer · Pause/Resume · End & bill · Cancel** (gated). Shows segments so far (device · window · duration · rate · subtotal), cafeteria lines, running total. Live counter continues.
**AR/EN:** `play.add_cafe`="＋ كافيتيريا"/"＋ Cafeteria", `play.transfer`="تحويل"/"Transfer", `play.pause`="إيقاف مؤقت"/"Pause", `play.resume`="استئناف"/"Resume", `play.end`="إنهاء وحساب"/"End & bill", `play.cancel`="إلغاء"/"Cancel".

### 5.4 Cafeteria overlay (reuse FE_10 product-grid)
Product grid (density) → lines added to the session's **same check** (BOM flag-aware). If products/F&B module off → button **hidden** (feature-flag-aware); time-only session runs fine.
**Prepaid:** cafeteria billed per `prepaid_cafeteria_billing` (separate default / combined).

### 5.5 Transfer (sheet)
Pick any free device (any type) → confirm. Closes current segment, opens a new segment on the target at its rate; old device→free, new→busy; check moves with the session. Final invoice shows the two time lines at each device's rate.
**AR/EN:** `play.transfer.pick`="اختر جهاز فاضي"/"Pick a free device".

### 5.6 Prepaid Extend (modal)
Fires as the block nears empty (threshold minutes from settings) and at zero: **Extend (new block → tender) · Switch to open counter (overflow postpaid) · End**.
**AR/EN:** `play.extend`="تمديد"/"Extend", `play.overflow`="عدّاد مفتوح"/"Open counter", `play.block_ending`="البلوك قرب يخلص"/"Block ending soon".

### 5.7 End & Pay (reuse tender + invoice preview)
"End & bill" → last segment closes → time computed (ceil + min + windows) → time lines land on the check → **invoice preview** (time + cafeteria lines) → **tender modal** → **check→document → e-receipt/ETA** (B2C cash default / B2B if TRN) + 80mm print. Session→paid, device→free.
**flag-don't-block:** missing `eta_code` blocks issue (like Sales) but the session had never stopped.
**Acceptance:** time correctly computed with rounding + windows; multi-segment sessions produce one invoice line per segment; issues e-receipt/ETA; prints 80mm; device frees.

### 5.8 Reserve / Maintenance (quick actions)
Free device → **Reserve** (name/phone/time → `reserved`, no counter; on arrival → Start) | **Maintenance** (→ `out of service`, refuses sessions; restore needs `play.device.maintain`).
**AR/EN:** `play.reserve`="حجز"/"Reserve", `play.maintenance`="صيانة"/"Maintenance".

### 5.9 Cancel session (`AlertDialog`, gated)
Active/closing session → Cancel (permission) → reason → session→`cancelled`; if an e-receipt was issued → **reversal** (not delete), logged to audit.
**Permissions:** `play.cancel`. **AR/EN:** `play.cancel_reason`="سبب الإلغاء"/"Cancellation reason".

---

## 6) Concurrency, peak-crossing, pause — behaviours

- **Concurrent sessions:** each device is an independent session/check; the grid drives all in parallel.
- **Peak/off-peak auto-split (§1):** background; two invoice lines; `peak_crossing_notify=notify` adds a live card toast.
- **Pause/resume:** gap not billed; resume prices at the then-current window.

---

## 7) Settings — devices & pricing (back-office)

### 7.1 Device-Types (`/settings/play/device-types`)
List + editor. Fields: name (ar/en) · **occupancy** (`station` / `ticket`) · **rate plan** (ref) · **service item** (ETA ref) · icon/color · play-mode tags. 5 states. **Permission:** `play.config`.
**AR/EN:** `play.dt.title`="أنواع الأجهزة"/"Device types", `play.dt.occupancy`="نمط الإشغال"/"Occupancy", `play.dt.station`="محطة"/"Station", `play.dt.ticket`="تذكرة"/"Ticket", `play.dt.service_item`="الصنف الخدمي (ETA)"/"Service item (ETA)".

### 7.2 Devices (`/settings/play/devices`)
List + editor + **bulk add** (PS5-1..8). Fields: name/number · type · branch · state · notes. **Permission:** `play.config`.
**AR/EN:** `play.dev.title`="الأجهزة"/"Devices", `play.dev.bulk`="إضافة دفعة"/"Bulk add".

### 7.3 Rate Plans (`/settings/play/rate-plans`)
Editor: pricing **unit** (min/15m/30m/hour) · **rounding** (ceil/nearest/floor) · **min** units · **Rate Rules table** (price/unit + day/hour window + play-mode tag + priority) with a live "current effective rate" preview · **Prepaid Blocks** (name/duration/price/optional validity window).
**Permission:** `play.config`.
**AR/EN:** `play.rate.title`="خطط التسعير"/"Rate plans", `play.rate.unit`="وحدة التسعير"/"Pricing unit", `play.rate.rounding`="التقريب"/"Rounding", `play.rate.min`="الحد الأدنى"/"Minimum", `play.rate.rule`="قاعدة السعر"/"Rate rule", `play.rate.window`="النافذة"/"Window", `play.rate.peak`="سعر الذروة"/"Peak", `play.rate.priority`="الأولوية"/"Priority", `play.rate.block`="بلوك مدفوع مقدّم"/"Prepaid block", `play.rate.effective_now`="السعر الساري الآن"/"Effective now".

---

## 8) Sector settings (`/settings/play`)
Toggles: `prepaid_cafeteria_billing` (separate/combined) · `peak_crossing_notify` (silent/notify) · prepaid near-empty threshold (minutes) · HR commission on/off. **Permission:** `play.config`.
**AR/EN:** `play.set.title`="إعدادات النمط"/"Sector settings", `play.set.prepaid_cafe`="فوترة كافيتيريا المدفوع مقدّماً"/"Prepaid cafeteria billing", `play.set.separate`="منفصلة"/"Separate", `play.set.combined`="مجمّعة"/"Combined", `play.set.peak_notify`="تنبيه دخول الذروة"/"Peak-crossing notice", `play.set.silent`="صامت"/"Silent", `play.set.notify`="تنبيه"/"Notify", `play.set.block_threshold`="تنبيه قرب خلوص البلوك (دقائق)"/"Block near-empty (min)".

---

## 9) Session log (`/play/sessions`) — back-office
TanStack Table: date · device · mode · duration · total · status (paid/cancelled) · e-receipt status. Filter + drill into segments (device/window/rate/subtotal). **Permission:** `play.view` (+ row scope: cashier sees own).
**AR/EN:** `play.log.title`="سجلّ الجلسات"/"Session log", `play.log.duration`="المدة"/"Duration", `play.log.segments`="الشرائح"/"Segments".

---

## 10) Module-wide RTL, numbers, offline, performance
- Western digits + `tabular-nums` for counters/money; `ج.م` after the number; codes/UUID/QR LTR within RTL (bidi tested). Live counters render `HH:MM:SS` LTR.
- **Offline (primary):** start/stop/transfer/cafeteria/tender/close all work; timestamps from terminal clock; e-receipt enters ETA queue (`local/queued`); B2C window countdown warns before expiry; sync on reconnect; never blocks.
- **Performance:** the grid renders many live counters via a single shared tick (no per-card timer storm); segment math is derived on demand; heavy session log = server-side pagination; ETA queue async, never blocks the UI.

---

## 11) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| Session | floor card, start sheet, session drawer, end&pay, cancel | ✓ | ✓ | play.operate/collect/cancel + scope | ✓ |
| Time segment | embedded (drawer + invoice lines) | ✓ | ✓ | (derived) | ✓ |
| Device | grid card, settings list/editor, reserve/maintenance | ✓ | ✓ | play.operate/config/maintain | ✓ |
| Device-Type | settings list/editor | ✓ | ✓ | play.config | ✓ |
| Rate Plan (+rules+blocks) | settings editor | ✓ | ✓ | play.config | ✓ |
| Cafeteria line | overlay (reuse FE_10) | ✓ | ✓ | play.operate | ✓ |
| Session log | back-office table + drill | ✓ | ✓ | play.view + scope | ✓ |
| Sector settings | toggles | ✓ | ✓ | play.config | ✓ |

## 12) Module acceptance criteria
1. A session is a chain of segments; time is derived from timestamps and never stored as an editable number.
2. Peak/off-peak crossing auto-splits into segments; each segment becomes its own invoice line at its rate.
3. Postpaid starts in ≤2 taps; prepaid is single-step pay-to-start that issues an e-receipt and begins a countdown, with near-empty alert + Extend/overflow/End.
4. Transfer across any device-type closes/opens segments correctly (PS5 > PS4 honored) and moves the check.
5. Pause excludes the gap; resume prices at the current window.
6. Cafeteria lines attach to the session's check (BOM flag-aware); if products off, time-only sessions run; prepaid cafeteria billing follows the tenant setting (separate/combined).
7. End & bill computes time (unit/rounding/min + windows), produces check→document → e-receipt/ETA (B2C default / B2B if TRN) + 80mm; missing eta_code blocks issue only, never the session.
8. Everything works fully offline (counters, cafeteria, tender, close); e-receipt queues with window countdown; sync on reconnect.
9. Cancel posts a reversal (no delete) and logs to audit; device states and per-branch numbering respected; all strings via i18n keys, RTL native.

**Fixtures:** `Flexova_FE_15_Play_TimeBased_fixtures.json` (Egyptian context — PS5/PS4/billiards/ping-pong stations + kids-area ticket type; rate plans with peak/off-peak windows + single/double tags + prepaid blocks; active postpaid session mid-peak-crossing (two segments); active prepaid countdown session; a paused session; a transferred session across types; sessions with cafeteria lines; a device out-of-service; a reserved device; sector settings; one cancelled/reversed session; one service item missing eta_code to exercise flag-don't-block).

*End of FE_15 Time-based / Play — version 1.0*
