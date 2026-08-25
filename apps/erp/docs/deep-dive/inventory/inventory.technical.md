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

*نهاية DD-1.*

---

## DD-2: Batch / Expiry (Technical / ذاكرة القرارات)

### القرار 1 — نموذج الـ batch + حامل الرصيد + الهوية

**اتعمل:** كيان مستقل `stock_batch` فيه `variant_id`, `lot_number`, `expiry_date (nullable)`, `mfg_date`, `supplier_ref`. حامل الرصيد اتعمّق من DD-1 من `(variant × warehouse)` لـ **`(variant × warehouse × batch)`**. الرصيد = `Σ stock_movement.qty` per batch (القاعدة الذهبية ثابتة). الهوية / merge key = `(variant + lot + expiry)` — نفس اللوط/الصلاحية لو اتستلم تاني → **نفس الصف**، الرصيد يتراكم بحركة receipt جديدة.

**البديل المرفوض:** حطّ الـ batch كأعمدة denormalized على الحركة (lot/expiry على كل صف movement). **ليه اترفض:** بيكرّر الـ expiry على كل حركة، بيصعّب الـ traceability والـ hold على مستوى الدفعة، وبيخلّي أي تعديل على بيانات الدفعة يمشي على آلاف الصفوف. الكيان المستقل بيدّينا مرجع واحد للدفعة.

**البديل الآخر المرفوض:** «batch لكل استلام» (كل GRN = batch جديد حتى لو نفس اللوط). **ليه اترفض دلوقتي:** بيخلط الفيزيائي (نفس اللوط الحقيقي) بالمحاسبي (cost layer). سبناه لـ DD-3: الطبقة المحاسبية بتتبني من الحركات، مش بتفرض دفعات فيزيائية وهمية.

**تطبيق فرونت-إند:** مفيش كيان "متغيّر افتراضي" منفصل اتاخترع للأصناف البسيطة — `stock_batch.variant_id` بيبقى id المتغيّر الحقيقي لأصناف DD-1، أو id الصنف نفسه للأصناف البسيطة، بنفس منطق الباك-إند إن `item_variant.variant_of` بيرجع لـ `item_id` افتراضياً.

### القرار 2 — الإلزامية (تلات مستويات)

**اتعمل:** `module flag inventory.batch_expiry` → per-item `tracks_batch` → per-item `requires_expiry` (ON افتراضياً). النتيجة: **lot-only مسموح** (أجهزة: tracks بلا expiry)، و`expiry` إلزامي بس للأصناف المعلَّمة `requires_expiry`، والأصناف العادية بلا batch أصلاً.

**البديل المرفوض:** expiry إلزامي دايماً لأي صنف batch-tracked. **ليه اترفض:** الأجهزة والمستلزمات ليها lot للـ recall بس مالهاش صلاحية — إلزام الـ expiry كان هيمنع تتبّعها أو يجبر تواريخ وهمية.

**enforcement:** `tracks_batch=true` ⇒ كل IN/OUT لازم `batch_id` (422 على الباك-إند؛ الفرونت بيمنع الحفظ من غير `lot_number`/`expiry_date` حسب الحالة). `requires_expiry=true` ⇒ إنشاء الدفعة لازم `expiry_date`.

### القرار 3 — سياسة الصرف + محرّك الاختيار

**اتعمل:** `selectBatchesForIssue()` — **FEFO** (`ORDER BY expiry ASC`) للأصناف اللي بتتبع صلاحية، **FIFO** (`ORDER BY receipt_date ASC`) للـ lot-only. الـ hold والـ expired **مستبعدين من الاختيار التلقائي**. **manual pick** مسموح كـ override وراء permission + audit، واختيار expired/hold محتاج `issue_override` + سبب.

**الحد مع DD-3:** إحنا هنا بنبني **محرّك اختيار الدفعة** (أنهي batch يطلع فعلياً على الحركة) بس. DD-3 **بيستهلك** ناتجه لبناء cost layers. **مابنعملش costing هنا** — احتراماً لحد «valuation → DD-3/Accounting».

**البديل المرفوض:** نخلّي الصرف manual دايماً. **ليه اترفض:** بيضيّع أهم فايدة تشغيلية (تقليل الهدر بالصرف الأقرب انتهاءً) ويحمّل المستخدم قرار كل مرة.

**تطبيق فرونت-إند:** الـ Issue flow ده مستقل جوّه Inventory (مفيش تكامل مع Sales/POS لسه يستدعيه) — بيعرض الاختيار التلقائي + زرار "اختيار يدوي" behind الصلاحية، ونفس المحرّك (`selectBatchesForIssue`) بيستخدَم في الفرونت كـ pure function جوّه `items/batches.ts`، مرآة لـ `items/variants.ts` بتاع DD-1.

### القرار 4 — الاستلام و opening balances

**اتعمل:** مداخل إنشاء الدفعة في نطاق DD-2 جوّه Inventory: **stock-in يدوي** + **opening per batch** (`opening` movement) + **adjustments**. الـ `batch_id` اتصمّم على الحركة بحيث **GRN بتاع Purchasing (موديول #4) يبقى مجرّد producer تاني لحركة receipt** بلا تغيير schema بعدين. feature-flag-aware: صنف مش متتبَّع → الاستلام يشتغل زي DD-1.

**البديل المرفوض:** نأجّل كل إدخال للدفعات لـ Purchasing. **ليه اترفض:** كان هيمنع تجربة/عرض الميزة الآن ويكسر الأصناف الافتتاحية؛ التصميم الحالي بيخلّي Purchasing إضافة سلسة مش شرط.

**تبسيط فرونت-إند مُفصَح عنه:** بدل شاشتين منفصلتين (استلام / رصيد افتتاحي)، اتبنى مودال واحد: أول حركة للصنف بتتسجّل كـ `opening`، واللي بعدها كـ `receipt` — نفس نتيجة القاعدة الذهبية بسطح أصغر.

### القرار 5 — التنبيهات

**اتعمل:** threshold = `coalesce(item.near_expiry_days, settings.global_near_expiry_days)` — **نفس نمط الوراثة بتاع DD-1** (`effectiveEtaCode`). العرض بيعيد استخدام **warning-badge convention** المتحقّق في DD-1 (`Flag` icon + tint + hint style): near-expiry = warning tint · expired = danger tint **لو التوكن موجود بالفعل** وإلا warning أقوى. الأب في القائمة rollup من أي variant/batch. **مفيش tokens جديدة.** الحالة (`expired/near_expiry/depleted`) **مشتقة read-time** مش مخزّنة — لإنها بتتغيّر بالوقت/الحركات (لو خزّناها بتناقض القاعدة الذهبية).

**سلوك expired:** Inventory بيحسب الحالة ويستبعد المنتهي من الـ auto-pick. الـ **hard block على بيع المنتهي محلّه Sales/POS** — بنفس منطق ما حطّينا block الـ ETA هناك مش في Inventory (Pin B).

**تطبيق فرونت-إند:** قسم "قرب الانتهاء / منتهية" جديد على صفحة `/inventory/low-stock` (flag-gated)، بيجمع كل الدفعات المشتقّة near_expiry/expired مجمّعة بالصنف، مع رابط رجوع لتبويب التشغيلات بتاع الصنف.

### القرار 6 — الحجر/الإتلاف (recall-ready)

**اتعمل:** `stock_batch.status` **بيخزّن `active | hold` بس**؛ `expired/depleted` مشتقة. الـ `hold` يدوي (recall/quality) بيستبعد الدفعة من الاختيار والبيع. مسار المنتهي: **transfer → `wh_damaged`** (reason=expired) كـ quarantine محافظ على الـ traceability، وبعدين **write-off** = adjustment-out من `wh_damaged`. كله حركات → القاعدة الذهبية سليمة.

**البديل المرفوض:** تخزين `expired`/`depleted` كـ enum ثابت في الـ status. **ليه اترفض:** بيلزم job يعدّل الحالة مع الوقت، وبيفتح باب لتناقض بين الحالة المخزّنة والرصيد الفعلي. الاشتقاق read-time أأمن.

### القرار 7 — الـ flag + الوراثة

**اتعمل:** `inventory.batch_expiry` **مُسجَّل** في `flags.ts` (toggle-able مش صامت). التتبّع (`tracks_batch`) **item-level** (مش منطقي تتبّع لوط لمقاس M دون L لنفس الدوا)، لكن **الـ batches نفسها per variant**. `near_expiry_days` = item-level override بـ coalesce؛ **مفيش وراثة للدفعة نفسها** (بياناتها concrete).

### تثبيتان صريحان
- **(أ)** الدفعة تـ merge على `(variant+lot+expiry)`، والتكلفة تفضل على الحركة (cost layers في DD-3).
- **(ب)** الـ hard-block لبيع المنتهي في Sales/POS مش في Inventory.

### ملاحظة تنفيذية (NULL في UNIQUE)
Postgres بيعتبر الـ NULLs متمايزة، فالـ `UNIQUE(variant,lot,expiry)` مبيمنعش تكرار الـ lot-only. الحل: partial unique indexes (واحد `WHERE expiry IS NULL` وواحد `WHERE expiry IS NOT NULL`).

### Tech-debt متتبَّعة (لا توقف قفل DD-2 — تُعالَج لاحقاً)
1. **الحجم:** batch tracking مربوط بالأصناف البسيطة بس — مفيش fixture بيجمع DD-1 product-parent مع DD-2 batches، فمِحدِّد الـ per-variant (§2.2 في الـ frontend spec) مش مبني.
2. **Issue/Adjustment flows مستقلة** جوّه Inventory (مفيش تكامل حقيقي مع Sales/POS يستدعيها لسه).
3. **الـ audit log** لأفعال Hold/Quarantine/Write-off toast تأكيد محلي، مش جدول audit حقيقي.
4. **صلاحيات DD-2 الأربعة** مستخدمة inline عبر `useCan()` (لسه الـ stub always-true بتاع كل المشروع)، مش مسجّلة في كتالوج FE_08 — نفس سابقة `inventory.item.variants` بتاع DD-1.

**تحقّق:** الـ acceptance criteria العشرة (frontend §5) عدّت مع **live verification بـ Playwright** ضد الداتا الحقيقية (مش typecheck بس)، و`tsc -b` نضيف.

*نهاية DD-2 — يُكمَّل بالميزة التالية.*
