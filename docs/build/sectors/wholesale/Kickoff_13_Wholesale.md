# Flexova — Kickoff: Brief 13 — الجملة والتوزيع

> **الهدف:** بدء بناء الـ Frontend لموديول الجملة والتوزيع فوق النواة وRetail/POS.
> **المراجع:** `UIUX_13_Wholesale.md` · `FE_13_Wholesale.md` · `whl.fixtures.json` · `Flexova_Design_Foundations.md` (3.0).
> **التنفيذ:** Claude Code (VSCode) — برومبت-برومبت، وقفة ومراجعة بعد كل خطوة، commit مستقل لكل واحدة.

---

## 1) قبل ما تبدأ (Pre-flight)

- [ ] `git pull` على `main` + فرع جديد: `feat/sector-wholesale`.
- [ ] تأكيد إن Retail/POS مبني وشغّال (`PosLayout` · `ProductGrid` · `TenderModal` · `ShiftBar` · `ReceiptPreview`).
- [ ] نسخ `whl.fixtures.json` إلى `src/lib/mock/fixtures/`.
- [ ] تسجيل flag `sector.wholesale` في `src/lib/flags.ts` (افتراضي: on في dev).
- [ ] **ممنوع:** أي تعديل على `tokens.css` أو الـ 3 layouts الأصلية أو `PosLayout` (إلا الـ slot الإضافي `syncIndicator` — additive فقط).

---

## 2) ترتيب البناء (8 خطوات)

| # | الخطوة | المخرج | تقدير |
|---|---|---|---|
| **1** | Foundation: mock client + types + flag + routes + i18n namespaces | يفتح `/wholesale/*` و`/van/*` بصفحات فاضية | صغير |
| **2** | محرّك التسعير: `resolvePrice()` + `TierPill` + `TierPanel` + `TierHintBanner` + شاشة شرائح الأسعار (§11) | تسعير شغّال + تحقّق الفجوات/التداخل | متوسط |
| **3** | التحكّم الائتماني: `CreditBar` + credit reservations + credit hub (§9) | الحد المتاح صحيح + سياسات الثلاثة | متوسط |
| **4** | أوامر البيع: list + editor + approve (§4، §5) | دورة الأمر كاملة لحد الاعتماد | كبير |
| **5** | التجهيز والفوترة: delivery notes (§6) + `FulfillmentBar` | الحركة المخزنية + التسليم الجزئي | متوسط |
| **6** | المسارات والزيارات: `RouteBuilder` + توليد خطة اليوم (§7) | مسار → زيارات | متوسط |
| **7** | شاشات المندوب: shift open + day plan + visit/sell + collection + close/settlement (§2، §3) | مسار الـ Van كامل | **كبير جداً** |
| **8** | Offline & sync: IndexedDB bundle + queue + `SyncIndicator` + rejected drawer (§15) + لوحة المناديب (§8) + van loads (§10) | offline-first حقيقي | كبير |

> الخطوة 7 تتقسّم داخلياً لـ 4 برومبتات (7a→7d) في ملف الـ build prompts.

---

## 3) نقاط انتباه (الأخطاء المتوقّعة)

1. **الوحدات:** الشريحة بوحدة البيع، والرصيد بالوحدة الأساسية. أي حساب لازم يمرّ بـ `toBase()` / `fromBase()` — لا حسابات مباشرة.
2. **الحجز المزدوج:** الحد المتاح = الحد − AR − الحجوزات المفتوحة. الحجز يتحرّر عند الفوترة **فقط**.
3. **الحركة المخزنية من إذن الصرف لا من الفاتورة** (المكتب)، ومن الفاتورة مباشرة (الـ Van).
4. **offline ≠ خطأ:** لون محايد، مفيش banner أحمر، مفيش blocking.
5. **flag-don't-block:** صنف بلا `eta_code` يُباع ويُعلَّم — ممنوع أي disable.
6. **SoD:** اللي يسوّي الوردية مش اللي يعتمد الفروق — رسالة واضحة لا مجرد إخفاء الزر.
7. **RTL:** خصائص منطقية بس (`inline-start/end`)، والأرقام `tabular-nums` و`ج.م` بعد الرقم.

---

## 4) معايير القبول لكل خطوة (Gate)

قبل الـ commit في أي خطوة:
- الحالات الخمس مطبّقة (تحميل · فاضي · خطأ · بلا صلاحية · بلا اتصال).
- AR/EN متطابقين — لا نص مكتوب داخل الكومبوننت.
- الصلاحيات مفروضة على **العرض والفعل** معاً.
- البيانات كلها من الـ fixtures — صفر hardcoded.
- لا تعديل على tokens/shell.
- `pnpm build` نظيف + `tsc --noEmit` نظيف.

---

## 5) الوقفات المطلوبة (Stop points)

- بعد **الخطوة 2** → مراجعة منطق التسعير مع أمثلة رقمية (رز 10 كراتين = 45 ج.م/قطعة).
- بعد **الخطوة 4** → مراجعة تجربة أمر البيع + الـ upsell panel.
- بعد **الخطوة 7b** (شاشة البيع) → مراجعة على تابلت فعلي.
- بعد **الخطوة 8** → اختبار offline بقطع الشبكة فعلياً قبل الـ DoD.

---

*نهاية المستند — Kickoff Brief 13، الإصدار 1.0*
