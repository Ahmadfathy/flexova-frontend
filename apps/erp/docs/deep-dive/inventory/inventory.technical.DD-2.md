# المخزون — DD-2: Batch / Expiry (Technical / ذاكرة القرارات)

> **يُضاف لملف** `apps/erp/docs/deep-dive/inventory/inventory.technical.md` (تراكمي). المصطلحات إنجليزي، الشرح والتبرير عربي. لكل قرار: **إيه اتعمل · البديل المرفوض · ليه**.

---

## القرار 1 — نموذج الـ batch + حامل الرصيد + الهوية

**اتعمل:** كيان مستقل `stock_batch` فيه `item_id (NOT NULL)`, `variant_id (nullable)`, `lot_number`, `expiry_date (nullable)`, `mfg_date`, `supplier_ref`. حامل الرصيد اتعمّق من DD-1 لـ **`(carrier × warehouse × batch)`** حيث **`carrier_id = coalesce(variant_id, item_id)`**. الرصيد = `Σ stock_movement.qty` per batch (القاعدة الذهبية ثابتة). الهوية / merge key = **`(carrier + lot + expiry)`** — نفس اللوط/الصلاحية لو اتستلم تاني → **نفس الصف**، الرصيد يتراكم بحركة receipt جديدة. (شغّال بنفس الطريقة للصنف البسيط والمتنوّع.)

### تصحيح الـ carrier (من الـ build الحيّ — decision memory)
**السياق:** الـ spec الأصلي كتب `variant_id NOT NULL`. الـ live build كشف إن ده غلط: DD-1 نفسه بيخلّي الصنف البسيط يركب على `item_id` على `stock_movement`، فإجبار variant للـ batch كان هيتطلّب **default variant وهمي** لكل صنف بسيط.

**القرار المعتمد:** الـ carrier = `coalesce(variant_id, item_id)`. الصنف البسيط → `item_id` و`variant_id = NULL` (بلا كيان وهمي). المتنوّع → `variant_id`.

**البديل المرفوض:** synthetic default variant لكل صنف (مدرسة Odoo) → schema موحّد بعمود واحد `NOT NULL`. **ليه اترفض:** بيضيف **phantom row** لكل صنف بسيط بلا مقابل واقعي — بيضرب مبدأي «البساطة المتطرفة» و«الداتا تعكس الواقq». علبة الباراسيتامول هي المنتج نفسه، مش «منتج له نسخة واحدة مخبّاة».

**كيف اتجنّبنا تسرّب الـ polymorphism:** resolver واحد `balanceCarrier = variant_id ?? item_id`، وكل مستهلِك (Sales/Purchasing/DD-3/Reports/batch engine) بيقرا `carrier_id` **من غير** ما يفرّع «بسيط ولا متنوّع». ده بيدّي نفس التوحيد بتاع مدرسة الـ default-variant من غير الصفوف الوهمية. الـ ID namespaces متمايزة (`itm_` مقابل `var_`) فالـ coalesce resolver نضيف بلا تصادم.

**البديل المرفوض:** حطّ الـ batch كأعمدة denormalized على الحركة (lot/expiry على كل صف movement). **ليه اترفض:** بيكرّر الـ expiry على كل حركة، بيصعّب الـ traceability والـ hold على مستوى الدفعة، وبيخلّي أي تعديل على بيانات الدفعة يمشي على آلاف الصفوف. الكيان المستقل بيدّينا مرجع واحد للدفعة.

**البديل الآخر المرفوض:** «batch لكل استلام» (كل GRN = batch جديد حتى لو نفس اللوط). **ليه اترفض دلوقتي:** بيخلط الفيزيائي (نفس اللوط الحقيقي) بالمحاسبي (cost layer). سبناه لـ DD-3: الطبقة المحاسبية بتتبني من الحركات، مش بتفرض دفعات فيزيائية وهمية.

---

## القرار 2 — الإلزامية (تلات مستويات)

**اتعمل:** `module flag inventory.batch_expiry` → per-item `tracks_batch` → per-item `requires_expiry` (ON افتراضياً). النتيجة: **lot-only مسموح** (أجهزة: tracks بلا expiry)، و`expiry` إلزامي بس للأصناف المعلَّمة `requires_expiry`، والأصناف العادية بلا batch أصلاً.

**البديل المرفوض:** expiry إلزامي دايماً لأي صنف batch-tracked. **ليه اترفض:** الأجهزة والمستلزمات ليها lot للـ recall بس مالهاش صلاحية — إلزام الـ expiry كان هيمنع تتبّعها أو يجبر تواريخ وهمية.

**enforcement:** `tracks_batch=true` ⇒ كل IN/OUT لازم `batch_id` (422). `requires_expiry=true` ⇒ إنشاء الدفعة لازم `expiry_date` (422).

---

## القرار 3 — سياسة الصرف + محرّك الاختيار

**اتعمل:** `selectBatchesForIssue()` — **FEFO** (`ORDER BY expiry ASC`) للأصناف اللي بتتبع صلاحية، **FIFO** (`ORDER BY receipt_date ASC`) للـ lot-only. الـ hold والـ expired **مستبعدين من الاختيار التلقائي**. **manual pick** مسموح كـ override وراء permission + audit، واختيار expired/hold محتاج `issue_override` + سبب.

**الحد مع DD-3:** إحنا هنا بنبني **محرّك اختيار الدفعة** (أنهي batch يطلع فعلياً على الحركة) بس. DD-3 **بيستهلك** ناتجه لبناء cost layers. **مابنعملش costing هنا** — احتراماً لحد «valuation → DD-3/Accounting».

**البديل المرفوض:** نخلّي الصرف manual دايماً. **ليه اترفض:** بيضيّع أهم فايدة تشغيلية (تقليل الهدر بالصرف الأقرب انتهاءً) ويحمّل المستخدم قرار كل مرة.

---

## القرار 4 — الاستلام و opening balances

**اتعمل:** مداخل إنشاء الدفعة في نطاق DD-2 جوّه Inventory: **stock-in يدوي** + **opening per batch** (`opening` movement) + **adjustments**. الـ `batch_id` اتصمّم على الحركة بحيث **GRN بتاع Purchasing (موديول #4) يبقى مجرّد producer تاني لحركة receipt** بلا تغيير schema بعدين. feature-flag-aware: صنف مش متتبَّع → الاستلام يشتغل زي DD-1.

**البديل المرفوض:** نأجّل كل إدخال للدفعات لـ Purchasing. **ليه اترفض:** كان هيمنع تجربة/عرض الميزة الآن ويكسر الأصناف الافتتاحية؛ التصميم الحالي بيخلّي Purchasing إضافة سلسة مش شرط.

---

## القرار 5 — التنبيهات

**اتعمل:** threshold = `coalesce(item.near_expiry_days, settings.global_near_expiry_days)` — **نفس نمط الوراثة بتاع DD-1** (`effectiveEtaCode`). العرض بيعيد استخدام **warning-badge convention** المتحقّق في DD-1 (`Flag` icon + tint + hint style): near-expiry = warning tint · expired = danger tint **لو التوكن موجود بالفعل** وإلا warning أقوى. الأب في القائمة rollup من أي variant/batch. **مفيش tokens جديدة.** الحالة (`expired/near_expiry/depleted`) **مشتقة read-time** مش مخزّنة — لإنها بتتغيّر بالوقت/الحركات (لو خزّناها بتناقض القاعدة الذهبية).

**سلوك expired:** Inventory بيحسب الحالة ويستبعد المنتهي من الـ auto-pick. الـ **hard block على بيع المنتهي محلّه Sales/POS** — بنفس منطق ما حطّينا block الـ ETA هناك مش في Inventory (Pin B).

---

## القرار 6 — الحجر/الإتلاف (recall-ready)

**اتعمل:** `stock_batch.status` **بيخزّن `active | hold` بس**؛ `expired/depleted` مشتقة. الـ `hold` يدوي (recall/quality) بيستبعد الدفعة من الاختيار والبيع. مسار المنتهي: **transfer → `wh_damaged`** (reason=expired) كـ quarantine محافظ على الـ traceability، وبعدين **write-off** = adjustment-out من `wh_damaged`. كله حركات → القاعدة الذهبية سليمة.

**البديل المرفوض:** تخزين `expired`/`depleted` كـ enum ثابت في الـ status. **ليه اترفض:** بيلزم job يعدّل الحالة مع الوقت، وبيفتح باب لتناقض بين الحالة المخزّنة والرصيد الفعلي. الاشتقاq read-time أأمن.

---

## القرار 7 — الـ flag + الوراثة

**اتعمل:** `inventory.batch_expiry` **مُسجَّq** في `flags.ts` (toggle-able مش صامت). التتبّع (`tracks_batch`) **item-level** (مش منطقي تتبّع لوط لمقاس M دون L لنفس الدوا)، لكن **الـ batches نفسها per variant**. `near_expiry_days` = item-level override بـ coalesce؛ **مفيش وراثة للدفعة نفسها** (بياناتها concrete).

---

## تثبيتان صريحان
- **(أ)** الدفعة تـ merge على `(carrier+lot+expiry)` حيث `carrier = coalesce(variant_id, item_id)`، والتكلفة تفضل على الحركة (cost layers في DD-3).
- **(ب)** الـ hard-block لبيع المنتهي في Sales/POS مش في Inventory.

## ملاحظة تنفيذية (NULL في UNIQUE)
Postgres بيعتبر الـ NULLs متمايزة، فالـ `UNIQUE(carrier,lot,expiry)` مبيمنعش تكرار الـ lot-only. الحل: partial unique indexes على الـ carrier (واحد `WHERE expiry IS NULL` وواحد `WHERE expiry IS NOT NULL`). لو الـ `carrier_id` عمود generated → index مباشر؛ وإلا index على تعبير `coalesce(variant_id, item_id)`.

---

*نهاية قسم DD-2 (Technical).*
