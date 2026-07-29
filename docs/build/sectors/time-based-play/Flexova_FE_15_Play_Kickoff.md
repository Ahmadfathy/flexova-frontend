# Flexova — Brief 4 (خدمات قائمة على الوقت/الجلسة) — Kickoff & Handoff

> **مستند المدخل لتنفيذ النمط السابع (Brief 4).** افتح جلسة Claude Code جديدة وابدأ منه.
> الإصدار: 1.0 — يوليو 2026
> **ترتيب البناء:** Brief 1 → 2 → 3 → 8 → 13 → 9 → **4** (رقم البناء = **FE_15**).

---

## 1) النمط في سطر واحد

**Brief 4 — خدمات قائمة على الوقت/الجلسة (Time-based).** الأنشطة: صالات البلايستيشن والبلياردو والبينج بونج · الكيدز إريا · قاعات الألعاب · مساحات العمل المشتركة.
**الجديد الجوهري:** **العدّاد الزمني (Start/Stop) كمصدر للتسعير** + **الجهاز/المحطة ككيان إشغال**. كل ما عدا ذلك = reuse.

---

## 2) المخرجات (المصدر الوحيد للحقيقة)

| الملف | الدور |
|---|---|
| `Flexova_FE_15_Play_TimeBased.md` | الـ build doc — شاشة-بشاشة، حقول/حالات/صلاحيات/AR-EN/acceptance. |
| `Flexova_FE_15_Play_TimeBased_fixtures.json` | البيانات الوهمية (سياق مصري) — تغطّي كل حالة حدّية. |
| `Flexova_UIUX_15_Play_TimeBased.md` | مرجع UI/UX (خريطة الكيانات + flows). |
| `Backend_Block_Play.md` | آخر مرحلة — لا يُبدأ قبل اكتمال الـ FE. |

**قواعد الملفات:**
```
docs/build/sectors/time-based-play/        ← FE_15 + kickoff + build prompts + DoD
docs/reference/UIUX_15_Play_TimeBased.md
docs/reference/backend/Backend_Block_Play.md
src/lib/mock/fixtures/play.fixtures.json
```

---

## 3) قاعدة إعادة الاستخدام (ممنوع إعادة التعريف)

| القدرة | المصدر | تُستخدم هنا كـ |
|---|---|---|
| `PosLayout` (route-scoped) + الوردية + الخزينة + Z-report | FE_09 / FE_07 | `/play/*` — الجلسات جوّه وردية مفتوحة |
| tender modal | FE_09 | prepaid pay-to-start + postpaid end&pay |
| product-grid + density (4→12) | FE_09 | device grid + كافيتيريا overlay |
| check→document + BOM flag-aware | FE_10 | الجلسة تملك check؛ الكافيتيريا سطور عليه |
| فاتورة + e-receipt/ETA + طباعة A4/80mm | FE_02 | الإقفال → مستند → e-receipt |
| service item (eta_code/tax) | FE_01 | سطر الوقت = صنف خدمي |
| محرّك العمولات | FE_06 | اختياري، **off by default** |
| العميل | FE_05 | اختياري؛ walk-in افتراضي |

> **أي مكوّن من الجدول ده يتبني من الصفر = خطأ تنفيذ يُرفض في الـ review.**

---

## 4) القرارات المعمارية (مقفولة — لا تُعاد مناقشتها)

1. **Session = سلسلة Time Segments.** كل segment = (جهاز × نافذة سعر × start × stop). الوقت **derived من timestamps**، مش رقم قابل للتعديل.
2. **auto-split** عند: عبور نافذة peak/off-peak · transfer · pause/resume. كل segment = **سطر فاتورة مستقل**.
3. **peak/off-peak في v1** عبر Rate Rules بنوافذ (أيام + ساعات + أولوية).
4. **نمطان:** `postpaid` (عدّاد تصاعدي، الدفع في الآخر) + `prepaid fixed block` (عدّاد تنازلي، **الدفع خطوة واحدة عند البدء** — e-receipt يصدر لحظتها).
5. **transfer عبر أي نوع** — الـ segment الجديد بسعر الجهاز الجديد (PS5 > PS4 = طبيعي ومقصود).
6. **Device abstraction معمّمة:** `station` (محطة فيزيائية) + `ticket` (pool بلا محطة — الكيدز إريا).
7. **نمط التشغيل (سنجل/زوجي)** = tag اختياري على قاعدة السعر، مش كيان.
8. **خياران per-tenant:** `prepaid_cafeteria_billing` (separate ← افتراضي / combined) · `peak_crossing_notify` (silent ← افتراضي / notify). **الاتنين display/timing فقط** — لا يغيّران الموديل المالي.
9. **flag-don't-block:** نقص eta_code يمنع الإصدار فقط، **الجلسة لا تقف أبداً**.
10. **الإلغاء = reversal مش delete** + audit.
11. **offline حالة تشغيل عادية:** كل الـ flows تعمل بلا اتصال (timestamps من ساعة الـ terminal)، e-receipt في طابور ETA.

---

## 5) النطاق

**داخل v1:** floor grid بعدّادات حيّة · session-with-segments · postpaid + prepaid block · rate plans بنوافذ peak/off-peak · 4 حالات جهاز · station + ticket/pool · transfer · pause/resume · كافيتيريا على نفس الـ check · end&bill → e-receipt/ETA + 80mm · حجز/صيانة يدوي · سجلّ الجلسات · إعدادات النمط · عمولة HR اختيارية.

**مؤجّل (الـ data model محترمه — لا يُبنى):** حجز أونلاين · **prepaid time wallet** (رصيد ساعات) · **عضويات co-working المتكرّرة** (reuse Services subscriptions لاحقاً) · duration-tiering · dynamic pricing · floor map بصري · loyalty متقدّم.

---

## 6) الستاك والقيود (كما هي)

React 18 · Vite · TS · Tailwind v3.4 · shadcn/ui · react-i18next · Zustand · TanStack Table · rhf+zod · lucide · idb-keyval · mock layer.

**ممنوع دون إذن صريح:**
- لمس الـ shell أو الـ tokens (`Flexova_Design_Foundations` = المصدر الوحيد).
- `left/right` في Tailwind — logical utilities فقط (`ms-/me-/ps-/pe-`, `start/end`).
- بناء أي مكوّن موجود في جدول §3.

**مسموح (additive):** route namespace جديد `/play/*` فوق `PosLayout` · `syncIndicator` slot (استثناء معتمد سابقاً).

---

## 7) نقطة أداء حرجة (اقرأها قبل الكود)

الـ floor grid بيعرض **عشرات العدّادات الحيّة** في نفس الوقت. **ممنوع timer لكل كارت.** استخدم **tick مشترك واحد** (interval واحد في الـ store) والكروت تشتق عرضها منه. حساب الـ segments derived on demand مش مخزّن.

---

## 8) طريقة التنفيذ (نفس إيقاع الأنماط السابقة)

- **شاشة-بشاشة مع وقفة** — مش دفعة واحدة.
- **commit وستوب للمراجعة** بعد كل شاشة.
- نقاش قبل أي قرار مش مكتوب هنا.
- **Backend block = آخر مرحلة** بعد اكتمال الـ FE واعتماده.

**ترتيب البناء المقترح:**
1. types + mock client + `play.fixtures.json`
2. rate-engine (النواة الحسابية: windows · ceil/min · auto-split) + اختباراتها
3. `/settings/play/*` (device-types · devices · rate-plans · sector settings)
4. Floor Grid + tick المشترك
5. Start sheet (postpaid + prepaid single-step tender)
6. Session drawer + pause/resume
7. Transfer
8. كافيتيريا overlay (flag-aware)
9. Prepaid extend + threshold alert
10. End & Pay → check→document → e-receipt/ETA + 80mm
11. Reserve/Maintenance + Cancel (reversal)
12. Session log
13. طبقة offline + sync
14. مراجعة DoD

> **ملاحظة:** بند 2 (rate-engine) **قبل** أي UI — كل الشاشات بتستهلكه، وأي خطأ فيه بيتسرّب لكل حاجة.

---

## 9) كيف تبدأ

افتح جلسة Claude Code في ريبو الـ Frontend وارفع/أشِر إلى:
`Flexova_FE_15_Play_TimeBased.md` + `Flexova_FE_15_Play_TimeBased_fixtures.json` + `Flexova_Design_Foundations.md` + ده الملف.

ثم استخدم **build prompts** (ملف منفصل، إنجليزي، برومبت-برومبت) بالترتيب — واحد واحد مع وقفة.

---

*نهاية الـ Kickoff — Brief 4 / FE_15.*
