# Flexova — FE_18 Healthcare (Clinics · Labs · Dental · Physio · Veterinary) (build-ready)

> **Phase 5 — Sector pattern (Brief 5).** Small/medium medical practices: clinics, dental, labs & radiology, physiotherapy, veterinary. "Encounter is the unit, the record is the context." Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — August 2026 · Build no. **FE_18**
> **Source of truth (do not redefine):** `Flexova_FE_00_Foundation` (tokens/shell/i18n/states) · `Flexova_FE_11_*` (Brief 3 — appointment engine + service-provider commission, **inherited**) · `Flexova_FE_02_Sales_ETA` (invoice + ETA routing) · `Flexova_FE_04_Accounting` (AR/receipts — read, not owned) · `Flexova_FE_05_CRM` (WhatsApp templates + comm log + dedupe) · `Flexova_FE_08_Users_Roles_Permissions` (permission model — extended here for PHI).
> **Governing principles:** (1) **Encounter is the central unit** — diagnosis/prescription/orders/invoice all live inside a visit; the medical record is the accumulation of encounters. (2) **Unified Patient core + dynamic specialty extensions** (no entity proliferation). (3) **PHI-first** — clinical data is narrower-access than administrative; reads are logged. (4) **Builds on inherited appointments/provider-commission** — consumes Brief 3, does not rebuild.
> **Golden rules (carried):** AR is READ from Accounting; invoice/ETA routing unchanged (individual → B2C receipt, insurer → B2B); a completed/accepted ETA invoice is not edited (correct via note). **New golden rule:** **clinical PHI is access-logged on READ, not only on write.**

---

## 0) Module scope (recap)

**In v1:** Patient master (unified core + specialty extension fields) · Owner/Guarantor (separate entity; `self` in human specialties, 1:many in veterinary) · Encounter (single merged screen: diagnosis + prescription + orders + invoice) · ClinicalOrder family (prescription/lab/radiology/procedure) + Result (order→result) · Insurance as **pricing layer only** (Payer + CoveragePlan → patient/insurer invoice split) · inherited appointments + provider-commission · PHI access controls (clinical vs administrative + access log + narrowed default scope) · Today Board · service/test catalog.

**Out (v2, explicit):** structured EMR (ICD/structured history) · PACS imaging · pharmacy dispensing from drug inventory · patient portal · full insurance **claims lifecycle** (submit→track→settle) · interactive dental odontogram.

Reads from Brief 3 (appointments/providers), Accounting (AR/receipts), Sales+ETA (invoice), CRM (WhatsApp/dedupe). Data via `lib/mock/client.ts` reading `healthcare.fixtures.json`. Sector module → registers under shell Sector group with `moduleFlag:"healthcare"`; every consumer is feature-flag-aware (a clinic with no lab hides the lab surfaces without breaking).

---

## 1) Routes & IA

Mounts under shell nav Sector group `nav.healthcare`. Secondary **Tabs** below `PageHeader`.

```
/healthcare                      → redirect → /healthcare/today
/healthcare/today                → Today Board (operational spine)   [§3]
/healthcare/patients             → Patients list                     [§5]
/healthcare/patients/new         → Add patient (full page)           [§5]  (quick-add = modal, §5.4)
/healthcare/patients/:id         → Patient 360 (medical)             [§6]
/healthcare/encounter/:id        → Encounter (merged clinical screen) [§4]
/healthcare/lab                  → Lab/Radiology queue & results      [§7]
/healthcare/insurance            → Payers & Plans (admin)             [§8]
/healthcare/catalog              → Service & Test catalog (admin)     [§9]
```

**Secondary tabs:** Today · Patients · Lab · Insurance · Catalog.
**Modals/drawers:** Quick-add patient (modal, §5.4 — reused from Today/appointment) · Check-in (inline, §3) · Result entry (modal, §7) · Insurance split preview (in-encounter, §4) · WhatsApp template picker (modal, reused from CRM) · Owner/animal picker (veterinary, §5.5).
**i18n namespace:** `healthcare`. AR default, EN mirror.

---

## 2) Entities (display model)

| Entity | Owner | Notes |
|---|---|---|
| **Patient** (central) | Healthcare | code, name ✱, dob/age, sex, phone ✱ (dedupe), blood_type, allergies[], chronic[], **specialty_ext{}** (dynamic per tenant specialty: dental/lab/vet). PHI clinical fields flagged. |
| **Owner/Guarantor** | Healthcare | financially/communicationally responsible party. Human specialties → `relationship:self` (hidden in UI). Veterinary → owner (1:many animals). Pediatric → parent. Insurance → payer link. |
| **Encounter** (visit) | Healthcare | date, provider, type (consult/follow-up/procedure), complaint, **diagnosis (PHI)**, clinical_note (PHI), status (open/completed), links appointment_id + invoice_id + orders[]. |
| **ClinicalOrder** | Healthcare | unified family, `type`: prescription / lab / radiology / procedure. Belongs to encounter. Prescription = free-text items (drug/dose/duration); lab/radiology → generates Result. |
| **Result** | Healthcare | separate from order (arrives later): value/text + attachment (v1 image/PDF) + note + status (pending/in_progress/ready/delivered). **Clinical PHI.** |
| **InsurancePayer** | Healthcare | third-party payer: name, contract status, contact. |
| **CoveragePlan** | Healthcare | coverage_pct, cap (annual/per-visit), co_pay (fixed/pct), exclusions[]. Drives invoice split. |
| **Appointment** | **read (Brief 3)** | slot/provider — consumed, not owned; bound to patient. |
| **Provider** | **read (Brief 3/HR)** | doctor = ServiceProvider on commission; inherited, label "doctor". |
| **Invoice** | **read (Sales) + ext** | same invoice engine + `patient_portion` / `insurer_portion` split. |
| **AR** | **read (Accounting)** | patient due; never recomputed here. |

**Validation:** phone ✱ (Egyptian format, dedupe warn — on Owner in veterinary); insurer patient requires a linked CoveragePlan before split applies; encounter requires ≥1 diagnosis OR ≥1 invoice line before "Finish visit" enables.

---

## 3) Screen — Today Board (`/healthcare/today`) — operational spine

### 3.1 Purpose
First screen staff open each morning; binds appointments ↔ encounters ↔ collection in one place. **All-administrative** — no clinical content ever renders here.

### 3.2 Layout
`PageHeader`: title "اليوم" + date + **provider picker** (all / specific; provider sees self by scope). `KpiCard` row: appointments · waiting · completed · **due to collect today** (`tabular-nums`). Primary button "＋ موعد" (inherits Brief 3 booking).
Body: time-ordered queue (`DataTable`), one row per appointment/encounter.

### 3.3 Columns & contextual action
Time · Patient (+new/follow-up badge) · Provider · **StatusPill** (booked · checked-in · in-visit · completed · no-show · cancelled) · Financial (`patient_portion` due/collected, semantic color) · Action.
Contextual row button by status:
- booked → **"تسجيل حضور" (Check-in)** [reception]
- checked-in → **"بدء الزيارة"** [doctor only → `/healthcare/encounter/:id`]
- completed + owes → **"تحصيل"** [reception → B2C receipt/ETA]
- completed + collected → silent "تمّ" badge

### 3.4 Five states
skeleton (row-height grey) · **empty** ("لا مواعيد اليوم" + "＋ احجز أول موعد" + "شوف بكرة") · **no-results** (after filter → "لا نتائج مطابقة" + "امسح الفلاتر", distinct from empty) · error (plain + retry) · **offline** (row-level `local/syncing/synced`; check-in + collect work offline-first).

### 3.5 Permissions & PHI
Whole board is administrative → reception sees fully. **"بدء الزيارة" gated by `healthcare.clinical.view`**; opening the encounter writes an access-log event. No diagnosis/clinical text appears on this screen.

### 3.6 AR / EN
اليوم/Today · تسجيل حضور/Check-in · بدء الزيارة/Start visit · في الانتظار/Waiting · لم يحضر/No-show · مستحق تحصيله اليوم/Due today.

### 3.7 Acceptance
Rows sorted by time, today-only default; contextual button changes with status; collect issues ETA receipt; clinical never shown; check-in survives offline and syncs.

---

## 4) Screen — Encounter (`/healthcare/encounter/:id`) — module heart

### 4.1 Purpose
Single merged clinical screen. Doctor completes a typical visit in <90s on-screen without leaving. Fixed context rail + light-tabbed workspace.

### 4.2 Layout (RTL)
Header: patient name · age/sex · **insurance badge** (covered/not + company) · **[إنهاء الزيارة]** (disabled until ≥1 diagnosis or invoice line). Opening logs an access event.
Right rail (context, all PHI): **warning strip** (allergies + chronic, `warning`/`danger`) · last 3 encounters (tap → full) · **specialty extension block** (dental note / sample data / animal species+breed+weight + "المالك: X").
Left workspace (light Tabs): **Diagnosis** (default) · Prescription · Labs/Radiology · Invoice.

### 4.3 Tabs
1. **Diagnosis (PHI):** complaint (free) + diagnosis (free-text v1; ICD v2) + clinical_note. Visible only with `healthcare.clinical.view`.
2. **Prescription:** add items (drug free-text v1 / dose / duration / instructions) · "اطبع" · "واتساب" (CRM template). Independent of drug inventory (dispensing v2).
3. **Labs/Radiology:** pick from catalog → order status `pending` → enters lab queue (§7) → generates Result. Ordered items auto-appear as invoice lines.
4. **Invoice:** auto lines (consult fee + ordered tests + any product — service+product mix inherited from Brief 3). **Insurance split** if covered: computes from CoveragePlan → `patient_portion` (co-pay + uncovered) + `insurer_portion` (AR on payer). Badge: "التأمين يغطّي X% — على المريض: Y ج".

### 4.4 Finish visit (decisive action)
Locks encounter (status→completed) → generates invoice (with split if applicable) → returns doctor to Today Board / next in queue → patient shows "completed + owes" for reception to collect.

### 4.5 Five states
skeleton (header+rail+tab) · empty n/a (always in patient context; empty tabs show clear "＋ أضف") · no-results (catalog search → "لا نتائج + أضف يدوي") · **error** (save fail → plain + retry + **local draft saved**) · **offline** (encounter written locally + synced; `local/syncing/synced` at encounter level — critical for power/net cuts).

### 4.6 Permissions & PHI
Diagnosis/prescription/labs tabs require `healthcare.clinical.view`. Invoice tab administrative. Every open access-logged.

### 4.7 AR / EN
إنهاء الزيارة/Finish visit · الشكوى/Complaint · التشخيص/Diagnosis · روشتة/Prescription · تحاليل وأشعة/Labs & radiology · التأمين يغطّي/Insurance covers · على المريض/Patient pays.

### 4.8 Acceptance
Single screen, no navigation away; Finish disabled until diagnosis or line present; split auto-computed and correct; encounter persists offline; clinical content hidden without permission; open logged.

---

## 5) Patients list + Add/edit + quick-add + veterinary (`/healthcare/patients*`)

### 5.1 List
`DataTable`: code · name · age/sex · phone · insurance badge · last visit. Filter by provider/insurance/status; instant search by name/phone; export. Row actions: WhatsApp · ＋appointment · open profile.

### 5.2 Fields (Add/edit)
name ✱ · phone ✱ (dedupe warn) · dob/age · sex · blood_type · allergies[] · chronic[] · insurance (payer + plan) · **specialty_ext** (dynamic block per tenant). Owner/Guarantor section (hidden `self` for human specialties).

### 5.3 Five states
skeleton · empty ("لا مرضى بعد" + "＋ أضف أول مريض" + "استورد CSV") · no-results · error · offline.

### 5.4 Quick-add modal (from Today/appointment, <15s)
phone ✱ + name → instant dedupe → save. Age/sex optional, completed at first visit.

### 5.5 Veterinary path
Owner first (phone+name, the dedupe key) → "＋حيوان" (species/name/breed) → owner 1:many animals. Billing/comm/collection on **owner**; encounter/diagnosis on **animal**. Same engine, different binding. Owner/animal picker modal.

### 5.6 Permissions & PHI
List/basic data administrative (reception). allergies/chronic are PHI (clinical view). Profile open logged.

### 5.7 AR / EN
مريض/Patient · المالك/Owner · حيوان/Animal · حساسيات/Allergies · أمراض مزمنة/Chronic conditions · فصيلة الدم/Blood type.

### 5.8 Acceptance
Dedupe on phone; quick-add <15s; veterinary binds animal↔owner correctly; specialty extension renders per tenant flag.

---

## 6) Screen — Patient 360 (medical) (`/healthcare/patients/:id`)

### 6.1 Purpose
Central record over time: visits + orders + invoices + insurance. **Clearest PHI split surface.**

### 6.2 Layout
Header: name · code · age/sex · phone · **insurance badge** · quick actions (WhatsApp · ＋appointment · ＋visit · view balance). Veterinary: shows animal + "المالك: X" + switch among owner's animals.
**Clinical strip (PHI):** allergies + chronic + blood_type, warning color. Reception sees administrative version without this strip.
Tabs: **Visits** (timeline, PHI) · **Orders & Results** (PHI) · **Prescriptions** (PHI, reprint/WhatsApp) · **Invoices & Balance** (admin, read from Accounting) · **Insurance** (admin, remaining cap) · **Data** (basic + specialty_ext + Owner/Guarantor, `self` transparent).

### 6.3 PHI behaviour
With `healthcare.clinical.view` → all tabs. Without (reception/accountant) → Invoices/Insurance/Data only; Visits/Orders/Prescriptions hidden or "محتوى طبي — غير مصرّح". Profile open access-logged.

### 6.4 Five states
skeleton · empty ("لا زيارات بعد" + "＋ ابدأ أول زيارة") · error · offline. Reads, never recomputes (single source of truth, per CRM 360 principle).

### 6.5 AR / EN
الزيارات/Visits · الأوامر والنتائج/Orders & results · الروشتات/Prescriptions · الفواتير والرصيد/Invoices & balance · التأمين/Insurance.

### 6.6 Acceptance
Clinical tabs gated + logged; financial read-only from Accounting; veterinary animal switch works; administrative view excludes clinical strip.

---

## 7) Screen — Lab / Radiology queue & results (`/healthcare/lab`)

### 7.1 Purpose
Lab/radiology technician workspace. Order→Result pattern; results arrive after the visit.

### 7.2 Layout
`PageHeader` + `KpiCard`: pending · ready today · delivered. Filter by status/type/patient.
`DataTable`: order code (+request time) · patient (admin) · requesting doctor · type (lab/radiology + test name) · **StatusPill** (pending · in_progress · ready · delivered) · action.

### 7.3 Contextual action
pending → **"إدخال نتيجة"** (modal: value/text + attachment v1 image/PDF + note → ready) · ready → **"إبلاغ المريض"** (WhatsApp "نتيجتك جاهزة") + **"تسليم"** · delivered → silent badge.

### 7.4 PHI
Result value = clinical PHI. Technician sees/enters own results; requesting doctor reads in encounter context; reception sees status only (ready/delivered), not value.

### 7.5 Five states
skeleton · empty ("لا أوامر منتظرة" — positive quiet day) · no-results · error · offline (result entry local + sync).

### 7.6 AR / EN
طابور التحاليل/Lab queue · إدخال نتيجة/Enter result · جاهز/Ready · سُلّم/Delivered · إبلاغ المريض/Notify patient.

### 7.7 Acceptance
Order→result lifecycle correct; ready result appears in patient profile + next follow-up encounter; reception cannot see value; notify uses CRM template.

---

## 8) Screen — Insurance: Payers & Plans (`/healthcare/insurance`) — admin

### 8.1 Purpose
Define payers + coverage plans that drive invoice split. Administrative (accountant/owner), not clinical. **v1 = pricing only, no claims lifecycle.**

### 8.2 Layout
Two sections. **Payers** `DataTable`: name · contract status (active/suspended) · covered patients count · AR on payer (read from Accounting). Add/edit: name + contract data + contact.
**Plans** (per payer): coverage_pct · cap (annual/per-visit) · co_pay (fixed/pct) · exclusions[]. These are the values the encounter split engine reads.

### 8.3 Five states
skeleton · empty ("لا شركات تأمين — أضف أول شركة") · error · offline.

### 8.4 Permissions
`healthcare.insurance.manage` (accountant/owner). No clinical access.

### 8.5 AR / EN
شركة تأمين/Insurance payer · خطة تغطية/Coverage plan · نسبة التغطية/Coverage % · سقف/Cap · تحمّل المريض/Co-pay · استثناءات/Exclusions.

### 8.6 Acceptance
Plan values feed encounter split; insurer AR opens in Accounting; no claim submission in v1 (manual settlement).

---

## 9) Screen — Service & Test catalog (`/healthcare/catalog`) — admin

### 9.1 Purpose
Defines orderable tests/services surfaced in the encounter. Consumes Brief 3 service catalog + medical extension.

### 9.2 Layout
`DataTable`: name · type (lab/radiology/procedure/consult) · price · default provider · active/suspended. CSV import for large catalogs.

### 9.3 Feature-flag-aware
Consult-only clinic with no lab → lab section hides without breaking. Catalog source for the encounter Labs/Radiology tab lists.

### 9.4 Five states
skeleton · empty ("أضف أول خدمة" + import) · no-results · error · offline.

### 9.5 AR / EN
كتالوج الخدمات/Service catalog · نوع الفحص/Test type · مقدّم الخدمة الافتراضي/Default provider.

### 9.6 Acceptance
Catalog items appear in encounter order pickers; disabled items excluded; import parses+dedupes.

---

## 10) Module-wide states, RTL, integrations, performance

- **RTL-native:** all screens Arabic-first; numerics `tabular-nums`; EN mirror complete.
- **Integrations:** appointments/providers ← Brief 3 (read); invoice/ETA ← Sales (individual→B2C receipt, insurer→B2B); AR ← Accounting (read); WhatsApp/dedupe ← CRM.
- **Offline-first:** check-in, encounter, collect, result-entry all work offline and sync (`local/syncing/synced`).
- **Performance:** Today Board + encounter are hot paths — skeleton-first, lazy-load tabs, no clinical fetch until clinical tab opened (also minimizes PHI exposure).

---

## 11) Permissions (input to FE_08) — PHI extension

New permission surface layered on the existing module × action × scope model, plus a light **clinical vs administrative** dimension and **read-logging**.

| Permission | Grants | Notes |
|---|---|---|
| `healthcare.today.view` | Today Board | administrative |
| `healthcare.patients.view` | patient admin data | administrative |
| `healthcare.patients.view_all` | all patients (not just own) | scope widener |
| `healthcare.clinical.view` | diagnosis/prescription/orders/results | **PHI gate; opens are access-logged** |
| `healthcare.clinical.edit` | write clinical data | provider roles |
| `healthcare.lab.manage` | lab queue + result entry | technician |
| `healthcare.insurance.manage` | payers/plans | accountant/owner |
| `healthcare.catalog.manage` | service/test catalog | owner/manager |

**Default scope:** provider sees own patients/encounters unless `view_all`. **Access log:** every open of a patient clinical surface writes an immutable event (who/whom/when) — consistent with the carried Immutable Audit Log. Consistent with SoD (owner = governance + aggregate reports, no individual PHI by default) and Break-glass.

---

## 12) Role visibility matrix (PHI in practice)

| Data / screen | Reception | Doctor/Provider | Accountant | Owner (governance) |
|---|---|---|---|---|
| Today Board / appointments | ✅ | own only | — | ✅ |
| Contact + financial status | ✅ | ✅ | ✅ | ✅ |
| Diagnosis / clinical note (PHI) | ❌ | ✅ | ❌ | aggregate only |
| Prescription / results (PHI) | ❌ | ✅ | ❌ | ❌ |
| Invoice / collection | ✅ | view | ✅ | ✅ |
| Insurance payers/plans | ❌ | ❌ | ✅ | ✅ |

---

## 13) Coverage matrix

| Flow (from UX §5) | Screen(s) | Status |
|---|---|---|
| 1 Quick-add patient (+vet owner/animal) | §5.4, §5.5 | ✅ |
| 2 Booking (inherited Brief 3) | §3 (＋موعد) | ✅ read |
| 3 Check-in / waiting | §3 | ✅ |
| 4 Encounter (merged) | §4 | ✅ |
| 5 Order → Result | §4 tab3, §7 | ✅ |
| 6 Prescription print/WhatsApp | §4 tab2 | ✅ |
| 7 Insurance-split billing | §4 tab4, §8 | ✅ |
| 8 Collect / check-out | §3 (تحصيل) | ✅ |
| 9 Patient 360 (medical) | §6 | ✅ |
| 10 Veterinary binding | §5.5, §6 | ✅ |

---

## 14) Module acceptance criteria

1. Today Board is the operational spine; contextual row action tracks status; clinical never shown there.
2. Encounter is a single merged screen; Finish generates invoice (+split); persists offline; clinical gated + access-logged.
3. Order→Result lifecycle complete; reception sees status not value.
4. Insurance is pricing-only in v1 (split), no claims lifecycle; insurer AR sits in Accounting.
5. Doctor inherited from Brief 3 as ServiceProvider-on-commission (zero rebuild).
6. Patient core unified + specialty extensions dynamic; Owner/Guarantor separate (self hidden for humans, active for veterinary/pediatric/insurance).
7. PHI: clinical vs administrative split enforced across all screens; reads logged; provider default scope narrowed.
8. Every optional surface (lab/insurance) is feature-flag-aware and degrades gracefully.
