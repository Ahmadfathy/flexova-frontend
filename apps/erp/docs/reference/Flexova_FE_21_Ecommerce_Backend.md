# Flexova — FE_21 E-commerce · Backend Block

> **قسم يُلحَق بـ `Flexova_Backend_Plan.md`** — نمط قطاعي (Brief 12)، لكنه **ثنائي الواجهة**: يخدم الـ admin (داخل الـ ERP) والـ storefront (BFF عبر API). يتبع ثوابت الخطة: shared-schema + `tenant_id` · auto-posting · append-only audit · `can()` كسلطة نهائية · contract tests تطابق الـ fixtures.
> **مصدر الحقيقة للعقود:** `ecommerce.fixtures.json` + `ecommerce-storefront.fixtures.json`.
> **المبدأ الحاكم:** الـ ERP مصدر الحقيقة المطلق للمخزون/الأسعار/العملاء/المحاسبة. الـ storefront يقرأ ويحجز ويبعت أوردر عبر API — لا وصول مباشر لقاعدة البيانات.
> الإصدار: 1.0 — أغسطس 2026 · رقم البناء **FE_21**.

---

## 1) الموضع المعماري

- موديول قطاعي خلف `moduleFlag:"ecommerce"` — Optional module.
- **الـ admin** جزء من الـ ERP backend (in-process، يقرأ المخزون/الأسعار/AR مباشرة).
- **الـ storefront** app منفصل (Next.js) يكلّم الـ ERP عبر **API عام مخصّص للمتجر** (Storefront API) server-to-server (BFF). لا DB مشترك.
- **يعيد استخدام:** محرّك الفوترة/ETA (FE_02) · المخزون (FE_01) · الحسابات/AR (FE_04) · العملاء (CRM FE_05). لا يعيد بناءها.
- **يوسّع:** `permission_catalog` (صلاحيات ecommerce) + `audit_log`.

---

## 2) Data Model (الكيانات والعلاقات)

كل الجداول تحمل `tenant_id` + `deleted_at` (soft-delete).

- **online_product** — `inventory_item_id` (FK → المخزون، **العمود الفقري**) · `title` · `description` · `images[]` · `seo{meta,slug_ar,slug_en,og}` · `store_category_id` · `online_price` (nullable — يطغى على سعر الـ ERP) · `publish_status` (published/draft/hidden). **لا يخزّن رصيد** — الرصيد يُقرأ من الـ ERP.
- **store_category** — `name` · `parent_id` (hierarchy) · `seo_slug`. شجرة تسويقية مستقلة عن تصنيف المخزون.
- **cart** — `session_id`/`customer_id` · `items[]{product_id, variant, qty, price_at_add}` · `expires_at`. مؤقتة.
- **stock_reservation** — `cart_id`/`order_ref` · `items[]{item_id, variant, qty}` · `ttl_seconds` · `expires_at` · `status` (active/committed/released). **يخصم من متاح الـ ERP مؤقتاً.**
- **online_order** (الجسر) — `code` · `customer_id` (FK → CRM) · `items[]` · `subtotal`/`shipping`/`total` · `status` (pending_payment/paid/processing/shipped/delivered/returned/cancelled) · `payment_method` · `payment_status` · `invoice_id` (nullable حتى التأكيد) · `eta_status` · `affiliate_id` (nullable) · `shipping{address, zone, carrier, tracking_no}`.
- **affiliate** — `name` · `phone` · `commission_pct` · `balance_due` · `status`. + **affiliate_link** — `affiliate_id` · `code` · `clicks`.
- **affiliate_payout** — `affiliate_id` · `amount` · `status` (pending_approval/approved/paid).
- **payment** — `order_id` · `gateway` (paymob/fawry/cod) · `gateway_ref` · `status` · `amount`. → يُقيَّد في الحسابات.
- **store_config** — `active_theme` · `catalog_mode` (manual/bulk/auto_rule/mirror) · `available_themes[]` · `payment_gateway[]` · `shipping_zones[]` · `store_data` · `default_lang`/`rtl`. per-tenant.
- **catalog_rule** — `inventory_category_id`/tag · `auto_publish` · `default_store_category_id`. (auto_rule mode)
- **mirror_exception** — `inventory_item_id` · `hidden`. (mirror mode)
- **shipping_zone** — `name` · `cost`.

**مستهلَك (يُقرأ، لا يُملَك):** `inventory_item` + متاح (FE_01) · `price` · `customer` (CRM) · `invoice`+`eta` (FE_02) · `ar`/receipts (FE_04).

---

## 3) المحرّكات الخاصة بالموديول

### أ) Stock Reservation Engine (أهم ضمان تقني — ضد الـ oversell)
- **المتاح المعروض = رصيد الـ ERP − المحجوز النشط.** الـ ERP مصدر الحقيقة، طبقة الحجز فوقه.
- **بدء checkout:** `POST reservations` → يحجز الكميات بـ TTL (افتراضي 10 د). لو المتاح < المطلوب → رفض جزئي + تعديل.
- **تأكيد الدفع:** الحجز → `committed` → خصم فعلي من مخزون الـ ERP.
- **انتهاء TTL / إلغاء / فشل:** الحجز → `released` تلقائياً (job دوري + عند الأحداث) → الكمية ترجع للمتاح.
- **الاتّساق:** الحجز والخصم في transaction ذرّي؛ سباق آخر قطعة يُحسم بالحجز (أول حجز ناجح يكسب).

### ب) Order Lifecycle + التحويل لفاتورة
- الأوردر يمرّ بدورته (§2). عند `paid` (webhook) أو تأكيد COD → **يولّد فاتورة مبيعات + ETA** عبر محرّك FE_02 (أونلاين B2C = إيصال إلكتروني · شركة = B2B) → الدفعة تُقيَّd في الحسابات → عمولة الأفلييت تُحسب لو مُسنَد.
- **المرتجع:** إشعار (credit note) في الـ ERP — قاعدة «الفاتورة المقبولة لا تُعدَّل».
- **COD:** يعدّي `processing` مباشرة (بدون `paid`)، الفاتورة تتولّd عند التأكيد، التحصيل يتأكّد عند التسليم.

### ج) Payment Abstraction + Webhooks
- واجهة موحّدة: `initiate / verify / webhook / refund`. **Adapters** لكل بوابة: Paymob · Fawry · COD (COD = adapter صوري بلا redirect). البوابة تُختار per-tenant من `store_config`.
- **Webhook هو الحقيقة للدفع:** الأوردر لا ينتقل `paid` إلا بـ webhook مُتحقّق (signature verification). idempotent (نفس الـ webhook مرتين = أثر واحد). فشل/تأخّر webhook → الأوردر يفضل `pending_payment` بلا فاتورة.

### د) Affiliate Attribution + Commission
- **الإسناد:** آخر نقرة (كوكي `ref`) أو كود عند الـ checkout. يُثبَّت على الأوردر عند الإنشاء.
- **العمولة:** تُحسب **على الأوردر المؤكّد فقط** (paid/delivered حسب السياسة) = `total × commission_pct` → تزيد `balance_due`. المرتجع يعكس العمولة.
- **الصرف:** `payout` بموافقة admin → دفعة في الحسابات.

### هـ) Revalidation (تكامل مع الـ storefront cache)
- تغيير `online_product`/السعر/المتاح في الـ admin → **حدث invalidation بـ tag** (`product:{id}`, `category:{id}`) → يُنشر لكل الـ storefront instances عبر Redis (`revalidateTag`). webhook واحد يحدّث الكل (يحلّ تباعد الـ cache في self-hosting).

### و) Catalog Mode Engine (كيف يُملأ المتجر من المخزون)
إعداد `store_config.catalog_mode` بأربع قيم، صاحب المتجر يختار. كلها تحترم «OnlineProduct طبقة عرض، تقرأ المخزون/السعر لحظياً — لا تكرّره».
- **`manual`:** إنشاء OnlineProduct فردي (الأصلي).
- **`bulk`:** `POST products/bulk-publish` — يستقبل قائمة `inventory_item_ids` → ينشئ OnlineProduct لكل واحد بـ defaults من المخزون (عنوان/سعر)، بدون صور/SEO. transaction بحجم دفعة + تقرير فشل جزئي. idempotent (صنف منشور بالفعل يُتخطّى).
- **`auto_rule`:** جدول `catalog_rule` (`inventory_category_id`/tag → `auto_publish` + `default_store_category`). عند إضافة صن: مخزون مطابق → إنشاء OnlineProduct تلقائي (job/hook). `dry-run` يرجّع عدد المتأثّر.
- **`mirror`:** لا إنشاء صفوف مسبق — **resolution لحظي**: المتجر يعرض كل `inventory_item` قابل للبيع (باستثناء flags: مواد خام/عيّنات/`hidden_online`). جدول `mirror_exception` (`inventory_item_id` → مخفي). الأخف تخزيناً، الأثقل قراءةً (يُحلّ بالـ cache/tags).

**ثوابt عبر الأوضاع:**
- طبقة العرض المنسّقة (صور/وصف/SEO) دائماً per-item وتبقى عبر تبديل الأوضاع — الأوضاع تدير الوجود/الظهور فقط، لا تدهس التنسيق.
- تبديل الوضع لا يحذف بيانات (published products تبقى).
- المتاح المعروض = رصيد ERP − المحجوز، في كل الأوضاع.

---

## 4) Endpoints

### أ) Admin API (`/api/v1/ecommerce/`) — داخل الـ ERP
CRUD قياسي لكل كيان + الخاص:
- `products` (CRUD + ربط بـ inventory_item · dedupe slug) · `categories` (CRUD/tree)
- `products/bulk-publish` (POST — قائمة inventory_item_ids → إنشاء دفعة بـ defaults · idempotent) · `products/bulk-candidates` (GET — أصناف مخزون غير منشورة)
- `catalog/rules` (CRUD — auto-publish rules · `rules/dry-run` GET) · `catalog/mirror-exceptions` (CRUD — إخفاء أصناف في mirror mode)
- `orders` (list/detail) · `orders/:id/status` (POST — تحديث الحالة) · `orders/:id/return` (POST — credit note)
- `affiliates` (CRUD + `:id/link` توليد) · `affiliates/:id/payout` (POST — بموافقة)
- `settings/payments` · `settings/shipping` · `settings/store` (CRUD — بما فيه `active_theme`)

### ب) Storefront API (`/api/v1/store/`) — يستهلكه الـ BFF
- `catalog` (GET — منتجات منشورة، static-friendly) · `products/:slug` (GET — static shell)
- `products/:id/live` (GET — **السعر + المتاح لحظياً**، dynamic island)
- `cart` (CRUD session-based) · `cart/recheck` (POST — إعادة تحقّق سعر/توفّر)
- `reservations` (POST بدء حجز · DELETE إلغاء)
- `checkout` (POST — إنشاء أوردر + reservation · **idempotency-key إلزامي**)
- `payments/initiate` (POST) · `payments/webhook/:gateway` (POST — عام، مُتحقّق) 
- `orders/track/:code` (GET — عام، guest)
- `attribution` (POST — تسجيل نقرة/كود)

**ملاحظات عقد:** الـ storefront endpoints تُرجع بنية `Storefront_fixtures.json`؛ الـ admin تُرجع `Admin_fixtures.json`. `products/:id/live` مفصول عمداً عن الـ static عشان الـ ISR ما يـ cache-ش السعر/المتاح.

---

## 5) Enforcement والصلاحيات (يوسّع FE_08)

- مفاتيح: `ecommerce.products.manage` · `orders.view` · `orders.manage` · `orders.refund` · `affiliates.manage` · `settings.manage`.
- **SoD:** `orders.refund` و `affiliates.payout` حسّاسان (حوكمة) — مفصولان عن التشغيل اليومي.
- **الـ Storefront API عام** (لا `can()` للمتسوّق) لكن: rate-limiting · idempotency · webhook signature verification · reservation ownership (session) — حمايات مستوى-التطبيق بدل الصلاحيات.
- كل حركات الـ admin (refund/payout/تغيير الثيم/البوابة) → `audit_log` غير قابل للحذف.

---

## 6) قواعد النزاهة (Integrity)

- **الأوردر المؤكّد ذو الفاتورة** يتبع قاعدة Sales: لا تُعدَّل الفاتورة، المرتجع بإشعار.
- **لا فاتورة قبل تأكيد الدفع** (webhook) — يمنع فواتير وهمية من أوردرات لم تُدفع.
- **الحجز ذرّي** — يمنع بيع آخر قطعة مرتين (السباق).
- **online_product لا يخزّن رصيد** — دايماً يقرأ من الـ ERP (مصدر حقيقة واحد).
- **صنف مخزون موقوف/محذوف** → المنتج الأونلاين يُخفى تلقائياً (graceful) بدل عرض غير متاح.
- **idempotency على الـ checkout والـ webhook** — لا أوردر/قيد مكرّر.

---

## 7) Migration & Contract tests

- **Migration:** جداول الموديول تُنشأ عند تفعيل `moduleFlag:"ecommerce"`. الـ storefront app منفصل deployment، يتصل بالـ Storefront API.
- **Contract tests (gate):** كل endpoint يطابق شكل الـ fixture المقابل. أهمها:
  - `products/:id/live` يرجع سعر+متاح منفصلين عن الـ static.
  - `checkout` بـ idempotency-key مكرّر → أوردر واحد.
  - `reservations` سباق آخر قطعة → حجز واحد ينجح.
  - `payments/webhook` غير مُتحقّق → مرفوض · مُتحقّق مكرّر → أثر واحد.
  - أوردر لا يصير `paid` بلا webhook · لا فاتورة قبل `paid`/COD-confirm.
  - عمولة الأفلييت على المؤكّd فقط · المرتجع يعكسها.
  - تغيير منتج → tag invalidation يصل كل الـ instances.
- **نقطة تُؤكَّد وقت التنفيذ:** سياسة توقيت العمولة (عند `paid` ولا `delivered`) — تُحسم مع أول tenant.

---

*نهاية الـ Backend block لـ FE_21 E-commerce.*
