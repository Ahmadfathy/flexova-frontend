# Flexova — النمط 4: Repair / Work Order — Kickoff & Build Steps

> **مستند مدخل بناء النمط 4** عبر Claude Code (VSCode). افتحه في بداية جلسة البناء داخل ريبو الـ Frontend.
> الإصدار: 1.0 — يوليو 2026
> **المصدر (لا يُعاد تعريفه):** `Flexova_UIUX_12_Repair.md` · `Flexova_FE_12_Repair.md` · `rpr.fixtures.json` · أساس POS (FE_09) · F&B (FE_10) · Services (FE_11) · Foundation (FE_00).
> **مكان الملفات:** `docs/build/sectors/repair-workorder/` (kickoff + steps + checklist) · `src/lib/mock/fixtures/rpr.fixtures.json`.

---

## 0) قاعدة العمل (كالمعتاد)
نقاش قبل القرارات · **خطوة-بخطوة مع وقفة** · **commit وستوب للمراجعة** بعد كل خطوة · **لا لمس shell/tokens دون إذن** · عامية مصرية في النقاش · **Backend block آخر مرحلة**. الاستثناء الوحيد المعتمد: `PosLayout` route-scoped عند `/repair/*` (additive، بلا لمس الـ 3 layouts الأصلية).

---

## 1) خريطة إعادة الاستخدام (إيه اللي بناخده جاهز)

| من | نأخذ | نستخدمه في |
|---|---|---|
| **POS (FE_09)** | `PosLayout` (top bar/clock/exit) · **tender modal** · e-receipt/ETA hub · طباعة 80mm · per-terminal numbering · **flag-don't-block** · الحالات الخمس | كل شاشات `/repair/*` + شاشة التسليم |
| **F&B (FE_10)** | نمط **Check→document** (كيان حيّ يولّد المستند عند التسوية) | كيان Work Order كله |
| **Services (FE_11) / HR (FE_06)** | **محرّك عمولات** (labor → commission) | سطور العمالة + قيد التسليم |
| **Inventory (FE_01)** | استهلاك القطع **flag-aware** + منطق الرصيد السالب | سطور القطع في التنفيذ |
| **Accounting (FE_04)** | **auto-posting** (Σمدين=Σدائن) + الفترات المغلقة | التسليم |
| **CRM (FE_05)** | customer picker + **quick-add** | الاستلام + هيدر الأمر |

> **القاعدة:** أي مكوّن مشترك = **import**، مش re-implement. لو محتاج تعديل، اعمله additive.

---

## 2) خطوات البناء (4 خطوات — كل خطوة commit + stop)

### الخطوة 1 — Scaffold + Routes + PosLayout scope + i18n + mock
- ركّب مسارات `/repair/*` تحت **PosLayout route-scoped** (يرث الثيم/الوضع/اللغة/الكثافة).
- `/repair` → redirect `/repair/board`.
- i18n namespace **`repair`** (AR default + EN mirror) — حمّل مفاتيح FE_12 §3–§7.
- وصّل الـ mock client بـ **`rpr.fixtures.json`** (`lib/mock/client.ts`).
- تأكد: لا لمس shell أو الـ 3 layouts؛ الـ appearance store يتوارث كما هو.
- **Acceptance:** الـ routes تفتح، PosLayout ظاهر، اللغة/الثيم يتوارثوا، fixtures تتقري.
- **Commit:** `feat(repair): scaffold routes + PosLayout scope + i18n + mock`

### الخطوة 2 — Board + Intake
- **Board (`/repair/board`):** kanban بالحالات الخمس (§3) + toggle list · كارت (WO no/customer/device/technician/promise/badge/**overdue flag**) · فلاتر (status/technician/overdue/period) · الحالات الخمس (empty ≠ no-results) · scope (الفنّي يرى أوامره).
- **Intake (`/repair/new`):** customer picker + quick-add (reuse FE_05) · device (type ✱ + brand/model/serial-optional + condition chips + accessories + photos + **vehicle fields conditional**) · reported faults · **deposit اختياري** (skippable) · promise + technician · `save + print intake ticket` (80mm) → WO at `pending_diagnosis`.
- **flag-don't-block:** جهاز بلا serial → يُقبل ويُعلَّم.
- **Acceptance:** أمر يُفتح ويظهر في الـ board؛ ticket يُطبع؛ deposit اختياري ويُقيَّد في الخزينة لو اتاخد؛ vehicle fields شرطية.
- **Commit:** `feat(repair): board + intake + intake-ticket`

### الخطوة 3 — Work Order detail (lifecycle engine) — الشاشة المحورية
- **الهيدر** + أقسام: **Diagnosis** · **Quote** (تقديري + `send for approval` channel picker + approval badge) · **Execution** (part lines من inventory **flag-aware، deduct on add** + ad-hoc flagged · labor lines + technician) · **Payments** · **Warranty**.
- **State machine + action bar:** ابدأ الكشف · أرسل العرض · وافق/ارفض · جهّز · سلّم.
- **Approval-gated:** منع (soft) الدخول لـ `in_progress` قبل موافقة العرض.
- **Reject:** `AlertDialog` + رسم كشف اختياري (per-tenant) → `rejected` + تسليم الجهاز كما هو.
- **Negative stock:** تحذير overridable بصلاحية + علم تسوية (reuse FE_01).
- **Acceptance:** الدورة تمشي بالترتيب؛ لا تنفيذ/خصم قبل الموافقة؛ ad-hoc مُعلَّم؛ الرفض يسلّم بلا فاتورة قطع/خدمة.
- **Commit:** `feat(repair): work-order detail + lifecycle + parts/labor`

### الخطوة 4 — Release + Warranty + Settings/Reports
- **Release modal (`/repair/:id`):** توليد المستند (قطع+خدمة) · **طرح العربون** · **tender modal (reuse FE_09)** · payment status ⟂ ETA status · frozen doc · e-receipt/80mm · **auto-posting (FE_04)** + **commission (FE_06)** + **بدء الضمان** → `delivered`. flag-don't-block على `eta_code` الناقص.
- **Under-warranty WO:** من أمر مُسلَّم داخل فترة الضمان → أمر جديد يربط الأصلي، السطور بصفر، القطع **تُخصم كتكلفة ضمان**.
- **Settings (`/repair/settings`, back-office):** diagnosis fee (off by default) · default warranty days · الفنّيون + قواعد العمولة (read from HR) · numbering · قوالب واتساب.
- **Reports:** أظهر تقارير الصيانة داخل موديول Reports (FE_07): open/overdue · productivity · approval rate · warranty cost.
- **Acceptance:** التسليم يقيّد قيد متوازن + عمولة + يبدأ الضمان + يجمّد المستند؛ under-warranty بصفر مع خصم مخزون؛ الإعدادات تسري؛ التقارير تظهر.
- **Commit:** `feat(repair): release + warranty + settings + reports`

---

## 3) تشك-ليست القبول (Definition of Done)

**الدورة والكيان**
- [ ] الأمر يمشي: استلام → كشف → عرض+موافقة → تنفيذ → جاهز → تسليم؛ ومسار **مرفوض**.
- [ ] المستند المالي يُولَّد **عند التسليم فقط** (Check→document).
- [ ] لا تنفيذ/خصم قطع قبل **موافقة العميل** (soft block + رسالة).
- [ ] بعد التسليم: كل السطور **مقفولة/مجمّدة**.

**القطع والعمالة**
- [ ] القطع = أصناف inventory **تُخصم عند الإضافة** (flag-aware).
- [ ] قطعة غير مسجّلة → **ad-hoc مُعلَّمة** (لا توقف الشغل).
- [ ] العمالة = خدمة non-stock وتغذّي **عمولة الفنّي** (HR engine).
- [ ] رصيد سالب → تحذير overridable بصلاحية + علم تسوية.

**العربون والضمان**
- [ ] العربون **اختياري** (skippable)؛ لو اتاخد يُقيَّد في الخزينة ويُطرح عند التسليم.
- [ ] فترة الضمان تبدأ **من التسليم**.
- [ ] Under-warranty WO: **بصفر** على العميل، والقطع تُخصم **كتكلفة ضمان**، مربوط بالأصلي.

**التسليم/المالية/ETA**
- [ ] auto-posting **متوازن** (Σمدين=Σدائن): إيراد قطع + إيراد خدمة + تكلفة قطع + تسوية عربون.
- [ ] payment status و ETA status **مستقلّتان**.
- [ ] صنف بلا `eta_code` → يُباع/يُطبع/يُعلَّم — **لا يوقف التسليم**.
- [ ] تسليم في فترة محاسبية مغلقة → **ممنوع** + اقتراح الفترة المفتوحة.

**الجودة العامة**
- [ ] الحالات الخمس على كل شاشة (empty ≠ no-results).
- [ ] RTL أصيل عبر مفاتيح `repair` (serial/IMEI/chassis/plate LTR داخل RTL).
- [ ] الصلاحيات: view/create/edit/diagnosis/quote/approve(sensitive)/parts/deliver(sensitive)/warranty/deposit/settings/export + scope.
- [ ] Offline: board/intake/parts add يشتغلوا ويتصالحوا على sync.
- [ ] shell/tokens **بلا لمس**؛ PosLayout scoped عند `/repair/*` فقط.

---

## 4) ملاحظات وحدود v1
- **مؤجّل (لا يعطّل):** vehicle/asset registry + تاريخ صيانة دوري · multi-device per WO · supplier warranty claims (RMA) · self-tracking للعميل · hardware bridge حقيقي.
- **Backend block = آخر مرحلة** — يطابق أشكال الـ mock/fixtures (drop-in)، ويُكتب في `docs/reference/backend/Backend_Block_Repair.md` بعد اكتمال الـ 4 خطوات.

---

## 5) رسالة بدء البناء (Claude Code)
«ابدأ بناء **النمط 4 Repair/Work Order** حسب `Flexova_FE_12_Repair.md` + `rpr.fixtures.json`. **الخطوة 1** بس (scaffold + routes + PosLayout scope + i18n + mock)، commit وستوب للمراجعة. أعِد استخدام PosLayout/tender/e-receipt من POS، Check→document من F&B، محرّك العمولات من HR/Services — import مش re-implement. لا لمس shell/tokens.»

---

*نهاية kickoff النمط 4 — التالي بعد البناء: `Backend_Block_Repair.md`.*
