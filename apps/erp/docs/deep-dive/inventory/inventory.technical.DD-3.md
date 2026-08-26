# المخزون — DD-3: FIFO / FEFO Costing (Technical / ذاكرة القرارات)

> **يُضاف لملف** `apps/erp/docs/deep-dive/inventory/inventory.technical.md` (تراكمي). المصطلحات إنجليزي، الشرح والتبرير عربي. لكل قرار: **إيه اتعمل · البديل المرفوض · ليه**.

---

## القرار 0 — الفصل بين الاختيار الفيزيائي والتكلفة (المفتاح لكل DD-3)

في DD-2 الـ **FEFO/FIFO** كان *picking strategy*: أنهي وحدة **فيزيائياً** تخرج. في DD-3 الـ **costing** حاجة تانية: أنهي **تكلفة** تتعلّق بالخروج ده. الاتنين **متعامدين (orthogonal)**.

**اتعمل:** دمجناهم للـ **batch items** (تكلفة التشغيلة الفعلية) وفصلناهم للـ **non-batch** (FIFO أو Average). النتيجة إن سؤال «هل الفيزيائي والتكلفة يفترقوا؟» **يختفي بالتصميم** بدل ما نحلّه: التشغيلة اللي DD-2 اختارها فيزيائياً هي نفسها اللي DD-3 بيكلّفها.

---

## القرار 1 — سياسة الـ costing: per-item مربوطة بالـ batch tracking

**اتعمل:** الطريقة الفعّالة تتقرّر read-time:
```
if item.tracks_batch  -> 'specific'   (actual batch cost)
else -> coalesce(item.costing_method, settings.default_costing_method)   // 'fifo' | 'average'
```
حقل `item.costing_method (fifo|average, nullable)` + `settings.default_costing_method (default fifo)`. **نفس نمط الوراثة بتاع DD-2** (`effectiveNearExpiryDays`). الـ `specific` **مش قيمة مخزّنة** — الصنف الـ batch-tracked بيتكلّف بتكلفة receipt movement بتاع تشغيلته.

**البديل المرفوض:** global costing method واحدة للـ tenant كله. **ليه اترفض:** السوق المصري بيخلط أصناف بتشغيلات (أدوية/أغذية) وأصناف عادية في نفس المحل — طريقة واحدة كانت هتغصب واحدة منهم غلط.

**البديل الآخر المرفوض:** per-item مطلق من غير ربط بالـ batch. **ليه اترفض:** كان هيسمح بتناقض — صنف batch-tracked فيزيائياً FEFO بس متكلّف FIFO → الفيزيائي والتكلفة يفترقوا. الربط بالـ batch tracking بيقفل الباب ده.

---

## القرار 2 — نموذج الـ cost layers: derived-first، الطبقة = receipt movement

**اتعمل:** **مفيش cost_layer table جديد**. الطبقة **هي receipt-type `stock_movement`** بتكلفتها المخزّنة أصلاً (Pin A من DD-2). الـ `qty_remaining` **يُشتق** بإعادة تشغيل الـ movement stream بترتيب الـ method (deterministic لأن الترتيب ثابت) — **مش عمود مخزّن**.
```
layer identity (logical) = carrier_id × warehouse_id × receipt_movement_id [× batch_id]
   carrier_id = coalesce(variant_id, item_id)   // resolver DD-1/DD-2، بلا تفريع
```
محرّك `costing.ts` جنب `batches.ts`: `deriveCostLayers()` + `consumeCostLayers()`.

**التحقّق من الكود الحيّ (decision memory):** الـ `InventoryLedgerRow` **مفيهوش** `qty_remaining` — وده اللي أكّد إن الاشتقاق هو الصح: DD-3 **مايلمسش** شكل الـ movement بتاع DD-2 (R3)، بيشتق المتبقّي بره.

**البديل المرفوض:** materialized `cost_layer` table من البداية. **ليه اترفض دلوقتي:** بيضيف مصدر حقيقة تاني لازم يتصالح مع الحركات — بيكسر الـ golden rule. سبناه كـ **cache اختياري للأداء بس** لو احتجناه لاحقاً، بشرط يتصالح مع الاشتقاق ولا يغيّر الدلالة. (derive-first، materialize-if-needed.)

---

## القرار 3 — توقيت COGS: perpetual (real-time لكل issue)

**اتعمل:** الـ COGS يتحسب **لحظة الـ issue** (فاتورة/POS/transfer-out/adjustment-out) ويتكتب على `stock_movement.cost` بتاع حركة الخروج. مفيش periodic job.

**دلالة `stock_movement.cost` (تثبيت):** حقل واحد بمعنى متّسق = **تكلفة الوحدة للقيمة المارّة بالحركة**. receipt = تكلفة شراء (موجودة أصلاً)؛ issue = **unit COGS** اللي DD-3 بيحسبه (كان unset للـ issues قبل كده). **مفيش عمود COGS جديد** → R3 محفوظ.

**البديل المرفوض:** periodic costing (نهاية الفترة). **ليه اترفض:** ETA (فوترة لحظية) و POS offline-first محتاجين الـ margin يبان وقت البيع، والـ perpetual بيعيد استخدام seam الـ issue بتاع DD-2 بالظبط.

---

## القرار 4 — المرتجعات والتسويات (نضيفة بفضل Pin A)

**اتعمل:**
- **Sales return** → receipt جديد بتكلفة = **الـ COGS المسجّل على movement البيع الأصلي**. التكلفة متخزّنة على الحركة، فمفيش لفّ ندوّر على الـ layers القديمة، ومفيش relink table. deterministic.
- **Purchase return** → issue بيستهلك layer المورّد ده بتكلفته.
- **جرد ناقص (shortage)** → issue at effective-method cost → خسارة عند seam المحاسبة.
- **جرد زيادة (overage)** → receipt؛ التكلفة الافتراضية = `avg_cost` (أو last_purchase_price)، والـ override وراء `inventory.costing.overage_cost`.

**ليه Pin A بيخلّيها نضيفة:** لإن التكلفة على الحركة مش على الـ batch، المرتجع بيقرا رقم واحد متخزّن بدل ما يعيد بناء استهلاك الطبقات — أبسط وأدقّ.

---

## القرار 5 — الـ Average: جوّه DD-3، بإعادة استخدام صيغة MFG (مش refactor)

**اتعمل:** الـ Weighted **Moving** Average للأصناف الـ non-batch method='average':
```
on receipt: new_avg = round2((qty_before·avg_before + qty_in·unit_cost_in)/(qty_before+qty_in))
on issue:   unit_cogs = current avg   (الـ issue مايغيّرش المتوسط)
```

**التحقّق من الكود الحيّ (decision memory — R1 + R2):**
- **R1:** حقل `avg_cost` **موجود أصلاً** على `InventoryItem` و`InventoryVariant` (static دلوقتي). فـ DD-3 **مايضيفش حقل** — بيدّي الموجود دلالة حقيقية (cache للمتوسط المتحرك).
- **R2:** فيه **moving-average engine شغّال فعلاً** في MFG (`stores/mfgItemStock.ts`). قرارنا: **نرث نفس الصيغة** ولا نخترع تانية، و**مانعملش refactor لـ MFG** في الـ DD ده. التوحيد (MFG يستهلك تكلفة Inventory) بند **منفصل لاحقاً**، مسجّل مش متنفّذ.

**البديل المرفوض:** تأجيل الـ Average لـ DD لاحق. **ليه اترفض:** إحنا أصلاً بنبني مسار الـ non-batch، فتكلفتها الحدّية صغيرة وقيمتها عالية (شائعة في تجزئة/سلع مصر).

**البديل المرفوض (LIFO):** **مرفوض نهائياً** — ممنوع تحت IAS 2 والمحاسبة المصرية. مش قيمة قابلة للاختيار أصلاً.

---

## القرار 6 — مكان الظهور مقابل الترحيل (seam المحاسبة)

**اتعمل:** DD-3 **بيملك** الحساب والـ UI الجوّاني (Inventory Valuation report · Item cost card بستاك الطبقات · margin على مستندات البيع). و**مابيرحّلش** — بيطلّع `CostEvent` عند الـ seam، و**Accounting (#3)** يعمل `Dr COGS / Cr Inventory`. **صفر journal entries في Inventory.**

**ليه:** نفس انضباط Pin B بتاع DD-2 (الـ block الفيزيائي مكانه Sales/POS) — الحساب والـ UI التشغيلي في Inventory، والقيد المالي في الموديول المالي صاحبه. بيمنع تكرار منطق القيود في موديولين.

**Permission:** رؤية التكلفة/الـ margin **SoD-sensitive** → `inventory.cost.view` (redaction على مستوى الـ response مش إخفاء UI بس). ad-hoc دلوقتي، تتشكّل رسمياً في Permissions #8 — نفس convention الأربع batch permissions بتوع DD-2.

---

## القرار 7 — Negative stock / offline-first (allow-and-reconcile)

**اتعمل:** الـ issue من غير layer مغطّي (POS offline باع قبل الـ receipt، أو oversell) **مسموح** (مبدأ offline-first)، بتكلفة مبدئية = الـ running cost الحالي + flag `pending_cost_reconciliation` على الحركة. أول ما الـ receipt المغطّي يوصل → reconciliation event بفرق الـ COGS.

**البديل المرفوض:** منع البيع لحد ما يتوفّر layer. **ليه اترفض:** بيضرب مبدأ offline-first (خصوصاً POS) — البيع مايقفش. سبنا الـ block كـ **tenant toggle مستقبلي** مش default.

**ملاحظة:** ده الـ default المعتمد؛ لو أي tenant عايز block-until-layer يتعمل كـ setting لاحقاً بلا تغيير في المحرّك.

---

## تثبيتات صريحة
- **(Pin A محمول من DD-2):** الطبقة = receipt movement، التكلفة على الحركة، `qty_remaining` مشتق — مفيش cost table جديد.
- **(carrier):** كل costing key على `coalesce(variant_id, item_id)` — بلا تفريع simple-vs-variant.
- **(seam):** DD-3 يحسب، Accounting يرحّل. مفيش قيود في Inventory.
- **(MFG):** متلمسش دلوقتي؛ صيغة الـ average مورّثة، والتوحيد لاحق.
- **(LIFO):** مرفوض (IAS 2 / مصري).

---

*نهاية قسم DD-3 (Technical).*
