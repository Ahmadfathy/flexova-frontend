# Flexova — Inventory (Deep-Dive) · Technical Doc

> **الغرض:** ذاكرة كاملة لأي مطوّر — كل ميزة اتعملت إزاي و**ليه** بالطريقة دي، مع **البديل المرفوض وسبب الاختيار**.
> المصطلحات بالإنجليزي · الشرح بالعربي. ملف واحد للموديول، تراكمي.
> الإصدار: يبدأ أغسطس 2026.

---

## DD-1 — Variants / Matrix

### السياق
الـ v1 عرّف الـ `item` كصنف مسطّح، وحجز أربع `capability_flags` (منها `has_variants`) كـ extension points من غير تنفيذ. الـ Backend Plan §4.2 نصّ صراحةً إن الـ data model "يقبل variants لاحقاً دون إعادة بناء". التعميق ده بيحقّق القدرة كـ **additive layer** فوق الـ v1 من غير ما يلمس الأصناف البسيطة أو الموديولات اللي بتستهلك المخزون.

### القرارات المعمارية (Decision Memory)

**D1 — Model = parent product + generated variant SKUs.**
- البديل المرفوض: أصناف مسطّحة بـ attributes بس (من غير أب).
- ليه اخترنا الأب: بيحافظ على مفهوم "الموديل الواحد" في القوايم والتقارير (سطر واحد + "N variants")، وهو المعيار في Odoo/Shopify. الأب `is_product_parent = true` **بلا رصيد**؛ كل variant = SKU مستقل.

**D2 — Global attribute library (`attribute` + `attribute_value`).**
- البديل المرفوض: تعريف الخصائص لكل صنف من الأول.
- ليه المكتبة العامة: توحيد القيم (يمنع "أحمر" / "احمر" / "Red" كقيم مختلفة)، وفلترة/تقارير أنظف. كل attribute له `type` = `list` / `color` (بـ swatch_hex) / `number` (بـ unit — محجوز لـ sold-by-weight لاحقاً).

**D3 — Matrix = auto cartesian + manual exclusion.**
- البديل المرفوض: إضافة variant-by-variant يدوياً.
- ليه الـ cartesian: أسرع onboarding بمراحل. الـ generate endpoint **atomic** (all-or-nothing) وبيرفض لو التركيبات > 200 (`combo_explosion`) عشان يمنع انفجار SKUs وكتابة جزئية.

**D4 — Inheritance + selective override.**
- الـ variant يورث من الأب: الاسم-الأساس، التصنيف، `base_uom`، `tax_type`، الصور المشتركة، `eta_code` الأساس.
- يقدر يـ override: `price` (لكل price list)، `barcode`، `image`، `reorder_level`، `eta_code`. التخزين: أعمدة nullable على `item_variant`؛ `null` = "ورث من الأب" (resolve وقت القراءة).
- ليه: أقل تكرار بيانات + مرونة عند الحاجة. المستخدم يشوف القيمة الموروثة كـ placeholder ويـ override انتقائياً.

**D5 — Variant × warehouse = balance carrier (قاعدة محمولة).**
- البديل المرفوض: الرصيد على الأب.
- ليه: **دي مش نقطة قابلة للتأجيل** — تغييرها بعدين = rebuild لكامل الـ ledger. تثبيتها دلوقتي بيخلّي Batch/Serial/Reserved (الميزات الجاية) تتبني فوق نفس الحامل. الـ enforcement: `stock_movement` لصنف parent **لازم** يحمل `variant_id`؛ لصنف simple **لازم** يكون null. الأب rollup عرض بس = Σ variants (scope-filtered). القاعدة الذهبية (رصيد = Σ movements) محفوظة بـ granularity أدق.

**D6 — eta_code على مستوى variant (يورث base) + warning badge في المخزون.**
- ليه: اللي بيتباع فعلاً هو الـ variant، فلازم يحمل كوده. Resolution وقت الإصدار: `coalesce(variant.eta_code, parent.eta_code)`.
- **قرار (أ) المعتمد (تصحيح ما بعد التنفيذ):** لو الكود فاضي و ETA مفعّل → الصنف **يتحفظ**، والمخزون يعرض **warning badge "ناقص ETA"** على الـ variant (+ الأب لو أي variant ناقص + الأصناف البسيطة الناقصة، لإزالة التفاوت). **تحذير فقط، بلا save-block.** الـ block الفعلي وقت الإصدار يفضل في Sales/POS.
- البديل المرفوض (ب): enforcement في Sales بس بلا مؤشّر في المخزون — اترفض لأن ETA ميزة نواة، والمستخدم لازم يعرف النقص وقت تجهيز الصنف مش وقت الفوترة.

**D7 — variant = صف في كل price list.**
- `item_price` اتوسّع بـ `variant_id` nullable (واحد بس من `item_id`-simple أو `variant_id` يكون مضبوط). أداة "apply parent price to all" + override للسطر. بيتكامل مع qty-break tiers لاحقاً على نفس البنية.

**D8 — simple→variant migration = مؤجّل، الـ hook محجوز.**
- البديل المرفوض: تنفيذ الـ wizard دلوقتي.
- ليه التأجيل: خارج المسار الحرج + edge cases كتير (رصيد/ledger/فواتير قديمة) لعائد محدود. الحجز: عمود `variant_of` (nullable) + endpoint مستقبلي `convert-to-product` بيعيد ربط movements الصنف الـ simple لـ variant افتراضي في transaction واحدة. **صفر rebuild** لما نعمله.

**D9 — Feature flag على طبقتين.**
- tenant module flag `inventory.variants` (entitlements) بيفتح القدرة + per-item toggle `has_variants`. لو الـ flag off: endpoints الـ attributes/variants مخفية (404) و `is_product_parent` مايتعملش true. لو اتقفل بعد استخدام: البيانات القديمة تفضل تتقري، الإنشاء يتمنع — **graceful degradation، بلا فقد بيانات**. بيحترم معمار Hard Core vs optional flags.

**D10 — حد عملي = 3 attributes/product + hard cap 200 combos.**
- soft warning فوق 3 attributes (`too_many_attrs`)؛ block على 200+ تركيبة. ليه: يمنع انفجار SKUs (4×4×4×4 = 256) الذي يدمّر الـ UX والأداء.

### الأثر على الكيانات (Data Model Impact)
- **New tables:** `attribute`, `attribute_value`, `item_variant`, `item_variant_attribute`.
- **Extended:** `item` (+`is_product_parent`, `has_variants_flag`) · `item_price` (+`variant_id`) · `stock_movement` (+`variant_id`) · balance view (+`variant_id` في grouping key).
- كل الجداول الجديدة بـ `tenant_id` + RLS. الـ variant بيرث branch/warehouse scope عبر movements.

### الأثر على الـ Frontend
- قائمة الأصناف: صف hybrid (simple أو product-parent مع expander + rollup + price-range).
- بطاقة الصنف: toggle `has_variants` → تبويب Variants + **Matrix grid** (المكوّن الأساسي الجديد، virtualized فوق 40 combo).
- شاشة جديدة: Attribute library.
- Variant quick-edit drawer.
- كل ده feature-flag-aware: من غير الـ flag، الـ toggle والتبويب مخفيين، والأصناف البسيطة زي ما هي.

### نقاط تُختبر (Test Anchors)
- `Σ variant balances (per warehouse) == parent rollup`؛ الأب مالوش balance row مباشر أبداً.
- `generate` atomic (rollback على أي code مكرّر أو تعدّي الحد).
- حذف value عليها variant بحركات = مرفوض؛ مسار suspend شغّال.
- WAC محسوب per variant (منتج بتكلفتين شراء مختلفتين يحتفظ بـ avg_cost مستقل لكل variant).

---

### As-built / انحرافات ما بعد التنفيذ (DD-1) — مسجّلة كذاكرة

**إصلاح حرج — `useItems` module-level store:**
- **المشكلة:** `useItems()` كان بيحمل state **per-component**، فرحلة "QuickAdd → has_variants → التنقّل لـ Item Editor → Save → الرجوع للقائمة" (أول رحلة cross-page تجيبها DD-1) كانت **بتفقد الصنف المُنشأ** عند كل تنقّل.
- **الحل:** تحويله لـ **module-level shared store** (نفس الـ public API، صفر ملفات تانية اتلمست). اتحقّق end-to-end live: إنشاء → توليد matrix → رصيد افتتاحي → حفظ → يظهر في القائمة بالـ rollup الصح → حركة `opening` حقيقية في الـ ledger.
- **للمتابعة:** التأكّد إن الـ store بيعمل **reset** صح عند تبديل mock-state / tenant (عشان ماتتسرّبش الحالة بين الجلسات).

**Tech-debt متتبَّعة (لا توقف قفل DD-1 — تُعالَج لاحقاً):**
1. **Grid virtualization فوق 40 صف** — مؤجّل (الداتا الوهمية صغيرة)؛ مطلوب للإنتاج بمصفوفات كبيرة.
2. **فلتر Attribute single-select** بدل multi-select (الـ spec كان multi).
3. **`/items/:id/variants/:vid`** مش route حقيقي deep-linkable — الـ drawer بيفتح بـ local state من نقطتي الدخول المطلوبتين.
4. **Export** = toast stub (مفيش export حقيقي في الأبلكيشن كله لتوسيعه).
5. **حماية الـ flag على مستوى route** — `/inventory/attributes` بالـ URL المباشر مش محمي (nav-hide بس، متسق مع كل السكتورات المعلَّمة بـ flag في الكود).
6. **الموبايل** — expand مكدّس بدل bottom sheet.

**تحقّق:** كل الـ 10 acceptance criteria عدّت مع **live verification بـ Playwright** (مش typecheck بس)، وكل بوابات `tsc -b` نضيفة.

---

*نهاية DD-1 — يُكمَّل بالميزة التالية.*
