# Flexova — Module Dependencies (تراكمي)

> يُسجَّل وقت العمل على كل موديول (لا يُجمَّع من الذاكرة في الآخر). منه تُبنى ملفات التجزئة/الباكدجينج النهائية.
> لكل موديول: يعتمد على (hard/soft) · يعتمد عليه · أضيق مجموعة تشغّله.

---

## Inventory

**يعتمد على (depends on):**
- **Core shell** — hard (التنقّل/الـ layout/الـ appearance/i18n).
- **Permissions** — hard (كل إجراء محكوم بدور + نطاق branch/warehouse؛ الصلاحيات الجديدة: `inventory.attribute.manage`, `inventory.item.variants`, `inventory.item.opening`).
- لا يعتمد على أي موديول تشغيلي آخر (هو الأساس).

**يعتمد عليه (depended on by):**
- **Sales / ETA** — hard (يستهلك الصنف: سعر/ضريبة/eta_code/الوحدات؛ بعد التعميق: على مستوى **variant**).
- **Purchasing** — hard (حركات وارد + WAC per variant).
- **Accounting** — soft (تقييم المخزون valuation يغذّي القيود؛ الـ posting في Accounting).
- **CRM** — soft (قوائم الأسعار المُسندة للعملاء).
- **POS** — hard (يقرأ الأصناف/الأرصدة/الـ variants، offline-first).
- **E-commerce** — hard (كتالوج المنتجات = product parents + variants + صور).
- **Healthcare** — hard (مستلزمات طبية؛ Batch/Expiry لاحقاً).
- **Manufacturing** — hard لاحقاً (BOM فوق الأصناف/الـ variants).

**أضيق مجموعة تشغّله (minimal viable bundle):**
`Core shell + Permissions + Inventory`.

**اعتماديات داخلية بين ميزات التعميق (feature-level):**
- Variants (DD-1) → أساس تبني عليه: Batch/Expiry · Serial · Reserved/In-transit (كلها تركب فوق balance-carrier = variant).
- FIFO/FEFO (DD-3) ← يعتمد على Batch/Expiry (DD-2) لمنطق FEFO.
- Qty-break tiers (DD-6) ← يعتمد على price lists (v1) + variant pricing (DD-1).
- Bundles/Kits (DD-12) ← يعتمد على item/variant model + balance.

---

*يُحدَّث مع كل موديول/ميزة.*
