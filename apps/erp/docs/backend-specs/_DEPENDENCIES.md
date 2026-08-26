# Flexova — Module Dependencies (تراكمي)

> يُسجَّل وقت العمل على كل موديول (لا يُجمَّع من الذاكرة في الآخر). منه تُبنى ملفات التجزئة/الباكدجينج النهائية.
> لكل موديول: يعتمد على (hard/soft) · يعتمد عليه · أضيق مجموعة تشغّله.

---

## Inventory

**يعتمد على (depends on):**
- **Core shell** — hard (التنقّل/الـ layout/الـ appearance/i18n).
- **Permissions** — hard (كل إجراء محكوم بدور + نطاق branch/warehouse؛ الصلاحيات الجديدة: `inventory.attribute.manage`, `inventory.item.variants`, `inventory.item.opening`, وبعد DD-2: `inventory.batch.manual_pick`, `inventory.batch.issue_override`, `inventory.batch.hold`, `inventory.batch.quarantine`، وبعد DD-3: `inventory.cost.view`, `inventory.cost.export`, `inventory.costing.overage_cost`, `inventory.costing.method_edit`).
- لا يعتمد على أي موديول تشغيلي آخر (هو الأساس).

**يعتمد عليه (depended on by):**
- **Sales / ETA** — hard (يستهلك الصنف: سعر/ضريبة/eta_code/الوحدات؛ بعد التعميق: على مستوى **variant**).
- **Purchasing** — hard (حركات وارد + WAC per variant).
- **Accounting** — soft (تقييم المخزون valuation يغذّي القيود؛ الـ posting في Accounting. بعد DD-3: العقد `CostEvent` جاهز عند الـ seam — Inventory بيحسب ويصدّر، Accounting هو اللي يرحّل، صفر journal entries في Inventory).
- **CRM** — soft (قوائم الأسعار المُسندة للعملاء).
- **POS** — hard (يقرأ الأصناف/الأرصدة/الـ variants، offline-first).
- **E-commerce** — hard (كتالوج المنتجات = product parents + variants + صور).
- **Healthcare** — hard (مستلزمات طبية؛ Batch/Expiry متاح من DD-2).
- **Manufacturing** — hard لاحقاً (BOM فوق الأصناف/الـ variants).

**أضيق مجموعة تشغّله (minimal viable bundle):**
`Core shell + Permissions + Inventory`.

**اعتماديات داخلية بين ميزات التعميق (feature-level):**
- Variants (DD-1) → أساس تبني عليه: Batch/Expiry · Serial · Reserved/In-transit (كلها تركب فوق balance-carrier = variant).
- **Batch/Expiry (DD-2) — مبني.** حامل الرصيد اتعمّق لـ `(variant × warehouse × batch)`؛ بنى محرّك اختيار الدفعة (`selectBatchesForIssue`, FEFO/FIFO) اللي DD-3 استهلك ناتجه.
- **FIFO/FEFO Costing (DD-3) — مبني.** اعتمد على محرّك اختيار الدفعة بتاع DD-2 (batch items بيتكلّفوا بنفس ترتيب الاختيار الفيزيائي، صفر افتراق). محرّك التكلفة (`costing.ts`) طبقة إضافية بس فوق الـ movements — مفيش تغيير في شكل DD-1/DD-2. صيغة المتوسط المرجّح مُعاد كتابتها محلياً من MFG (`mfgItemStock`) بلا أي `import` — Manufacturing لسه مايستهلكش تكلفة Inventory دي (توحيد لاحق، مسجّل مش منفّذ).
- Qty-break tiers (DD-6) ← يعتمد على price lists (v1) + variant pricing (DD-1).
- Bundles/Kits (DD-12) ← يعتمد على item/variant model + balance.

---

*يُحدَّث مع كل موديول/ميزة.*
