# Flexova — أسس التصميم (Design Foundations)

> **المصدر الوحيد للحقيقة (Single Source of Truth) لنظام التصميم.**
> يوثّق الحالة **الفعلية المنفّذة** في الكود (`globals.css`, `tailwind.config.ts`, `src/components/`).
> الإصدار: **3.0 — يوليو 2026** (يستبدل 2.0). يعكس مراجعة التصميم الشاملة على النواة.
> اللغة: شرح بالعربية · توكنات وكود بالإنجليزية كما هي.
> عند أي تعارض بين هذا المستند وأي مستند آخر: **هذا المستند هو المرجع.**

---

## 0) كيف نستخدم هذا المستند

ده الـ **Design System المرجعي** لـ Flexova. أي شاشة في النواة أو أي قطاع تلتزم بالـ tokens والمكوّنات والقواعد هنا. المكوّنات المخصّصة للقطاعات تُبنى **فوق** هذه الأسس لا بمعزل عنها.

**سجل الإصدارات:**
- **3.0 (يوليو 2026):** مراجعة تصميم شاملة — توحيد radius، إزالة outlines، Card/Table بلا حدود، ModalShell/DrawerShell/ConfirmDialog، نظام Alert/Toast، Button (tone×variant)، DatePicker، PageHeader جديد، Quick-Add hub، محاذاة RTL نهائية.
- **2.0 (يونيو 2026):** توثيق من الكود الفعلي.
- **1.0:** التصوّر النظري الأول.

---

## 1) مبادئ التصميم (Design Principles)

خمسة مبادئ تحكم كل قرار بصري:

1. **عربي-أولاً وRTL أصيل.** الواجهة تُصمَّم من اليمين لليسار كأصل. كل المحاذاة والأيقونات الاتجاهية والمسافات تستخدم **الخصائص المنطقية (logical properties)** لا الفيزيائية — `start`/`end`، `ms-`/`me-`، `ps-`/`pe-`، `border-s/e`. ممنوع `left`/`right`.
2. **بساطة متطرفة.** المستخدم غالباً غير تقني. الشاشة الواحدة مهمة واحدة واضحة. نقلّل الخيارات الظاهرة ونخبّي المتقدّم.
3. **الثقة مرئية.** النظام يمسك فلوس وبيانات ضريبية. الحالات المالية والـ ETA تبان بوضوح، والأخطاء صريحة قابلة للتصحيح، والإجراءات الحسّاسة لها تأكيد.
4. **مقاومة الظروف (offline-first).** النت المتقطّع واقع. الواجهة تتعامل مع offline كحالة أولى، وتوضّح حالة المزامنة بصراحة. الـ POS يعمل كاملاً offline.
5. **أداء قبل الزخرفة.** أجهزة العملاء متواضعة. نفضّل الحلول الخفيفة وزمن الاستجابة على أي تأثير بصري.

---

## 2) نظام الألوان (Color System)

### 2.1 الفلسفة
- **اللون الأساسي (Brand) فقط هو المتغيّر** بين الثيمات. المحايدات والألوان الدلالية ثابتة.
- كل الألوان **HSL channels** (بدون `hsl()` wrapper) لتعمل مع opacity modifiers (`bg-primary/50`).
- **التدرجات (Tints) مُولّدة عبر `color-mix`** فتتكيّف تلقائياً مع الوضع الفاتح/الداكن. إضافة ثيم = `--brand` + `--brand-dark` فقط.
- **الوضعان (Light/Dark) من اليوم الأول** عبر `html[data-mode="dark"]`.

### 2.2 توكنات المحايدات (Neutral Surface)

| Token | Light (HSL) | Light (HEX) | Dark (HSL) | الاستخدام |
|---|---|---|---|---|
| `--fx-bg` | `220 20% 98%` | `#F9FAFB` | `218 36% 9%` | خلفية الصفحة |
| `--fx-surface` | `0 0% 100%` | `#FFFFFF` | `215 29% 13%` | الكروت / sidebar |
| `--fx-tint-base` | `0 0% 100%` | `#FFFFFF` | `214 26% 16%` | أساس اشتقاق الـ tints |
| `--fx-ink` | `222 47% 11%` | `#0F172A` | `215 33% 93%` | النص الأساسي |
| `--fx-muted` | `215 16% 47%` | `#64748B` | `215 19% 64%` | النص الثانوي |
| `--fx-line` | `218 28% 92%` | `#E6EAF1` | `213 21% 20%` | الحدود والفواصل |

### 2.3 التوكنات الدلالية الصلبة (Semantic Solid)

| Token | Value (HSL) | الاستخدام |
|---|---|---|
| `--success` | `142 76% 36%` | نجاح (أخضر) |
| `--warning` | `32 95% 44%` | تحذير (كهرماني) |
| `--danger` | `0 72% 51%` | خطر (أحمر) |
| `--on-brand` | `0 0% 100%` | النص فوق أسطح brand الممتلئة |

### 2.4 توكنات النص الدلالي (Semantic Text)

| Token | Light | Dark |
|---|---|---|
| `--success-text` | `hsl(var(--success))` | `color-mix(white 36%, success)` |
| `--warning-text` | `hsl(26 90% 37%)` | `color-mix(white 40%, warning)` |
| `--danger-text` | `hsl(var(--danger))` | `color-mix(white 38%, danger)` |
| `--brand-text` | `hsl(var(--brand-dark))` | `color-mix(white 38%, brand)` |

> في الوضع الداكن نُفتّح نصوص الدلالة والـ brand لتحسين التباين.

### 2.5 توكنات التدرجات (Tints — عبر `color-mix`)

| Token | الأساس | النسبة |
|---|---|---|
| `--brand-tint` | brand | 12% |
| `--success-tint` | success | 14% |
| `--warning-tint` | warning | 14% |
| `--danger-tint` | danger | 14% |
| `--info-tint` | brand | 10% |

```css
--brand-tint   : color-mix(in srgb, var(--brand) 12%, var(--tint-base));
--success-tint : color-mix(in srgb, var(--success) 14%, var(--tint-base));
--warning-tint : color-mix(in srgb, var(--warning) 14%, var(--tint-base));
--danger-tint  : color-mix(in srgb, var(--danger) 14%, var(--tint-base));
--info-tint    : color-mix(in srgb, var(--brand) 10%, var(--tint-base));
```

### 2.6 لوحة الثيمات (Brand Palette)

عبر `html[data-theme="..."]`. الافتراضي **nile**. مفعّل عند الإطلاق: nile · emerald · graphite.

| Key | `--brand` (HSL) | `--brand-dark` (HSL) | الحالة |
|---|---|---|---|
| `nile` (افتراضي) | `224 76% 48%` | `224 76% 42%` | مفعّل |
| `emerald` | `161 94% 30%` | `163 94% 24%` | مفعّل |
| `graphite` | `215 19% 35%` | `215 25% 27%` | مفعّل |
| `clay` | `17 75% 48%` | `18 85% 39%` | جاهز |
| `royal` | `263 70% 50%` | `263 69% 42%` | جاهز |
| `teal` | `175 84% 32%` | `175 83% 26%` | جاهز |

### 2.7 منطق التفعيل
- **الوضع (Light/Dark):** يتبع النظام افتراضياً (`prefers-color-scheme`) + override يدوي. الأولوية: المستخدم > النظام. عبر `html[data-mode="dark"]`.
- **الثيم اللوني:** للـ tenant ثيم افتراضي، وكل مستخدم يغيّره لنفسه من صفحة التخصيص.
- التطبيق عبر `data-*` على `<html>`: `data-theme`, `data-mode`, `data-layout`, `data-density`, `data-collapsed`, `data-font-scale`, `data-font-ar`, `data-font-en`, `dir`, `lang`. التخزين: `flexova.appearance` (Zustand persist).

---

## 3) الشكل والظل (Shape & Shadow)

### 3.1 سلّم أنصاف الأقطار (Radius Scale) — **مُحدّث في 3.0**

قيم **ثابتة (static)** في `tailwind.config.ts` (لا `calc`, لا `var(--radius)`):

| Class | القيمة | الاستخدام |
|---|---|---|
| `rounded` (DEFAULT) | **0.25rem** (4px) | **كل العناصر التفاعلية والحاويات** (الافتراضي الحاكم) |
| `rounded-sm` | **0.40rem** (~6.4px) | **Card · Table · PageSection فقط** |
| `rounded-md` | **0.55rem** (~8.8px) | متاح، نادر الاستخدام |
| `rounded-lg` | **0.75rem** (12px) | متاح، نادر الاستخدام |
| `rounded-xl` | **1rem** (16px) | متاح، حالات خاصة |
| `rounded-full` | 9999px | نقاط الحالة (status dots) فقط |

```ts
// tailwind.config.ts → theme.extend.borderRadius
{ DEFAULT: '0.25rem', sm: '0.40rem', md: '0.55rem', lg: '0.75rem', xl: '1rem' }
```

### 3.2 قاعدة التوحيد الحاكمة (Radius Unification) — **جوهري**
- **كل عنصر تفاعلي أو حاوية** يستخدم `rounded`: buttons · links · inputs · selects · textareas · badges · switches (track+thumb) · checkboxes · avatars · icon background boxes · menu/nav items · كل الحاويات العائمة (dialog · sheet · popover · dropdown · tooltip · hovercard · command · search panel · quick-add).
- **الاستثناء الوحيد:** `Card` · `Table` · `PageSection` = `rounded-sm`.
- **نقاط الحالة (status dots)** الصغيرة (EtaBadge dot، StatusPill dot) تبقى `rounded-full`. الأيقونة نفسها لا تُلمس؛ **خلفيتها (box)** هي التي تأخذ `rounded`.

### 3.3 الظلال

| Token | Value | ملاحظة |
|---|---|---|
| `--shadow` | `0 2px 4px rgba(15,23,42,.04), 0 12px 32px -12px rgba(15,23,42,.12)` | ظل ناعم منتشر |
| `--shadow-sm` | `0 1px 3px rgba(15,23,42,.06)` | حافة الكروت |

الوضع الداكن يستخدم `rgba(0,0,0,...)` بكثافة أعلى. **Card/Table/PageSection: بلا border، تعتمد على `shadow-sm` فقط** (تحديث 3.0 — الحدود أُزيلت، الظل الناعم هو الفاصل).

---

## 4) التايبوجرافي (Typography)

### 4.1 نظام الخطوط

| العنصر | Token / القيمة |
|---|---|
| الخط العربي | `--font-ar: "IBM Plex Sans Arabic"` (بديل: `"Cairo"` عبر `data-font-ar="cairo"`) |
| الخط الإنجليزي | `--font-en: "Inter"` (بديل: `"IBM Plex Sans"` عبر `data-font-en="plex-sans"`) |
| الخط النشط | `--font-active` — يتبدّل حسب `html[lang]` |
| الحجم الأساسي | `--font-base: 14px` (افتراضي، على `<html>`) |

```ts
fontFamily: { sans: ["var(--font-active)", "system-ui", "sans-serif"] }
```

### 4.2 مقاسات الخط (Font Scale)
عبر `data-font-scale` على `<html>` — يضبط `--font-base`:

| المقاس | `data-font-scale` | الحجم |
|---|---|---|
| صغير | `sm` | 12px |
| متوسط (افتراضي) | `md` | 15px |
| كبير | `lg` | 18px |

> `font-size` على `<html>` (لا `body`) لترث كل وحدات `rem`.

### 4.3 المقياس الطباعي (Tailwind `rem` → px عند base=14px)

| Tailwind | rem | px |
|---|---|---|
| `text-xs` | 0.75 | 10.5 |
| `text-sm` | 0.875 | 12.25 |
| `text-base` | 1 | 14 |
| `text-lg` | 1.125 | 15.75 |
| `text-xl` | 1.25 | 17.5 |
| `text-2xl` | 1.5 | 21 |

### 4.4 الأرقام والعملة — **قواعد RTL محدّثة في 3.0**
- **الأرقام الغربية (0-9)** هي الافتراضي للقيم المالية.
- `font-variant-numeric: tabular-nums` عبر كلاس `.num` للمحاذاة العمودية.
- العملة: `ج.م` بعد الرقم، فاصل آلاف، خانتان عند الحاجة. مثال: `48,260.00 ج.م`.
- **محاذاة الأرقام والأكواد في الجداول = `text-start`** (يمين في RTL) مع الرأس — **أُلغيت قاعدة "numeric = end" القديمة**. الأرقام تحتفظ بـ tabular-nums.
- **الأرقام في الـ inputs (العربي) = start-aligned** (تبدأ من اليمين طبيعياً).
- **الأكواد/التواريخ:** لا يُفرض `dir="ltr"` على الخلية إطلاقاً. المحاذاة start، وترتيب الأحرف الداخلي يُحمى عند الحاجة بـ `<bdi>` أو `dir="auto"` على القيمة فقط. التاريخ يبقى `dd/MM/yyyy`.

---

## 5) المسافات ونقاط الكسر (Spacing & Breakpoints)

### 5.1 مقياس المسافات
Base-4: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64` (px). وحدة التنفّس الأساسية = `16px`.

### 5.2 نقاط الكسر
- `mobile` < 640px — عمود واحد، الـ side nav → drawer.
- `tablet` 640–1024px — شريط جانبي مطوي.
- `desktop` > 1024px — كامل.

### 5.3 الكثافة
`data-density`: `comfortable` (افتراضي) / `compact` — يؤثر على ارتفاع الصفوف والمسافات.

### 5.4 قاعدة padding المحتوى — **جديد في 3.0**
- `<main>` يوفّر الـ padding الأفقي الوحيد (`p-6`). **لا صفحة تضيف padding/margin أفقي داخلي إضافي**؛ المحتوى يمتد لحواف الـ main.
- المسافات الرأسية بين العناصر (breadcrumb/title row · alerts · content) تبقى عبر `space-y-*` / `gap-*`.
- padding المكوّنات الداخلي (كروت، خلايا) لا يتأثر.

### 5.5 الحركة (Motion)
- `--ease: cubic-bezier(.2,.8,.2,1)` (Tailwind: `ease-brand`).
- `animate-eta-pulse` (1.1s)، `animate-popin` (0.18s).
- `prefers-reduced-motion` يوقف كل الـ transitions/animations عالمياً.

---

## 6) قواعد التفاعل والحدود (Interaction & Borders) — **جديد في 3.0**

### 6.1 إزالة الـ Outline
- **كل العناصر التفاعلية** (a/href · button · input · select · textarea · checkbox · switch · radio) **بلا `outline` في كل الحالات** (default/focus/focus-visible/active/hover). أُزيل `focus-visible:ring-*` من كل المكوّنات.

### 6.2 بديل الـ Focus للحقول
- **Input · Textarea · Select trigger:** الحد الافتراضي `border-input`. عند **hover/focus/active** الحد يصير **غامق** = `border-foreground` (`--fx-ink`). في الوضع الداكن يصير فاتحاً على غامق (تباين عالٍ صحيح).
- عرض الحد ثابت 1px (لا layout shift). `transition-colors`.
- ملاحظة معمارية: الحد الغامق هو الـ focus affordance البديل بعد إزالة الـ ring — قرار تصميمي معتمد.

---

## 7) الـ Shell (App Frame)

### 7.1 المقاييس

| Token | Value |
|---|---|
| `--nav-w` | `240px` |
| `--nav-w-collapsed` | `72px` (mini rail) |
| `--topbar-h` | `60px` |

### 7.2 شبكة الـ Shell (`.app`)
CSS Grid: `grid-areas: "nav top" / "nav main"`.

| Layout (`html[data-layout]`) | أعمدة |
|---|---|
| `sidebar` (افتراضي) | `240px 1fr` → `72px 1fr` عند الطي |
| `sidebar-split` | `292px 1fr` (rail 72 + panel 220) → `72px 1fr` |
| `horizontal` | `1fr` (header بارتفاع تلقائي، 3 صفوف) |
| `horizontal-dropdown` | `1fr` (صفّان + dropdown) |
| Mobile (`≤640px`) | `1fr` (nav → drawer) |

`<main>`: `[grid-area:main] overflow-auto p-6 bg-background`.

### 7.3 الأنماط الأربعة (Layouts)
كلها تقرأ نفس **menu registry** (`src/config/menu.ts`)؛ المستخدم يختار (`data-layout`).

- **`sidebar`:** عمود واحد، accordion للـ subItems، يطوي لـ mini rail (أيقونات + flyout عند hover). active = `brand-tint box` + شريط brand على حافة الـ start.
- **`sidebar-split`:** rail أيقونات (size-9) + panel للـ subItems. active = brand-tint box؛ popover للاسم ناحية المحتوى.
- **`horizontal`:** 3 صفوف — topbar / موديولات / subItems (ثابت). سكرول أفقي داخلي (`min-width:0`).
- **`horizontal-dropdown`:** صفّان، الموديول يفتح dropdown بالـ subItems.
- **موبايل:** كل الأنماط → drawer من جهة الـ end + scrim + body-lock + زر X + لوجو.

### 7.4 كلاسات مساعدة

| Class | الأثر |
|---|---|
| `.num` | `tabular-nums` على الأرقام |
| `.nav-scroll` | scrollbar رفيع 3px لصفوف الـ nav |
| `.fx-scroll` / الافتراضي العام | scrollbar موحّد 6px (§8.12) |
| `.drawer-panel` | أنيميشن انزلاق RTL (0.22s) |
| `::selection` | خلفية `--brand-tint` |

> **إزالة `:focus-visible` outline** (كان 2px ring) — استُبدل بقاعدة §6.

### 7.5 الوضع الداكن في Tailwind
```ts
darkMode: ['variant', '&:where(html[data-mode="dark"], html[data-mode="dark"] *)']
```

### 7.6 الـ Topbar
ترتيب (start→end): `Collapse · Home · Search · Quick-Add(+) · ETA status · Fullscreen · Notifications · User menu`.
- **Search:** command palette (cmdk) — recent فارغ، نتائج مجمّعة بالنوع، أكواد LTR.
- **Quick-Add:** hub الإنشاء (§13).
- **EtaBadge:** مؤشر حالة (§9). حالياً 3 حالات؛ سيتوسّع لـ 4 مع الـ ETA connector.
- **Dashboard:** صفحة Home (أيقونة + اللوجو لينك لها) — ليست موديول.
- **موبايل:** يُزال wordmark الوسط؛ Home + Search يبقيان (≥44px لمس).

---

## 8) المكوّنات (Components)

كلها أساسها **Radix/shadcn** بـ Tailwind، radius = `rounded` (عدا Card/Table/PageSection = `rounded-sm`)، بلا outline، RTL-safe، i18n keys فقط.

### 8.1 Button — **نظام tone × variant (محدّث 3.0)**
نموذج `tone × variant` عبر cva.

**Tones (8):** `primary` (brand) · `secondary` · `success` · `info` · `warning` · `danger` · `light` · `dark`.
**Variants (fill):** `solid` (خلفية صريحة + نص متباين) · `soft` (tint + نص ملوّن) · `outline` (حد ملوّن + شفاف) · `ghost` (نص ملوّن + hover tint) · `link`.

| Size | Height | Padding |
|---|---|---|
| `default` | h-10 | px-4 py-2 |
| `sm` | h-9 | px-3 |
| `lg` | h-11 | px-8 |
| `icon` | h-10 w-10 | — |

Base: `inline-flex items-center justify-center gap-2 rounded text-sm font-medium transition-colors disabled:opacity-50`.

**tone × solid:** primary→bg-brand/on-brand (hover brand-dark) · success→bg-success/white · warning→bg-warning/white · danger→bg-danger/white · info→bg-brand/white · light→bg-muted/foreground · dark→bg-foreground/background · secondary→bg-secondary.
**tone × soft:** `bg-{tone}-tint` + `text-{tone}-text` (primary→brand-tint/brand-text، وهكذا).
**tone × outline/ghost:** حد/نص باللون، hover = tone tint.

**أشكال المحتوى (متّسقة):** text-only · text+icon (`size-4`, gap-2, أيقونة على الـ start، RTL-safe) · icon-only (`size="icon"` + aria-label).

**Convention (موثّق، غير مفروض):** primary solid = الإجراء الرئيسي (واحد لكل شاشة) · danger = الهدّام · outline/secondary soft = ثانوي (تصدير/استيراد/طباعة) · ghost = ثالثي (إلغاء/إغلاق) · success/warning/info/light/dark تُستخدم بقصد لا زخرفة.

**توافق خلفي:** الـ API القديم (`variant="default|destructive|outline|ghost|secondary|link|icon"`) مربوط بالنموذج الجديد فلا تنكسر الشاشات.

### 8.2 Badge / StatusPill / EtaBadge
- **Badge:** `rounded` (كان full)، `border px-2.5 py-0.5 text-xs font-semibold`. variants: default/secondary/destructive/outline.
- **StatusPill:** يغلّف Badge + نقطة حالة (`rounded-full`) في المقدّمة. 10 حالات (paid/approved→success · pending/credit/in-progress→warning · sent/active→brand · rejected→danger · inactive/default→muted). الـ box نفسه `rounded`، النقطة `rounded-full`.
- **EtaBadge:** مؤشر topbar، `rounded` (كان full). حالات: connected(أخضر) · syncing(brand+نبضة) · offline(كهرماني). النقطة `rounded-full`.

### 8.3 Input / Textarea / Label / Select
- **Input/Textarea:** `h-10 rounded border border-input px-3 py-2 text-sm`، بلا outline، **hover/focus → border-foreground** (§6). العربي: أرقام start-aligned.
- **Select:** Radix، trigger `rounded` + قاعدة الحد الغامق، SelectContent `rounded`.
- **Label:** `text-sm font-medium`، موصول بـ `htmlFor`.

### 8.4 Checkbox / Switch / Radio — **RTL + rounded (محدّث 3.0)**
- **Checkbox:** `h-4 w-4 rounded border` (كان sm)، checked = brand. الأيقونة مركزية، مسافات logical.
- **Switch:** track + thumb الاثنان `rounded` (كانا full). **RTL-aware:** الـ thumb يستقر عند الـ start ويتحرك للـ end، منعكس صحيحاً في RTL/LTR. الحجم (h-6 w-11) واللون ثابتان.
- **Radio:** `h-4 w-4 rounded-full border` (يبقى دائري — طبيعة الراديو).

### 8.5 ModalShell — **جديد 3.0** (`patterns/ModalShell.tsx`)
غلاف موحّد فوق Dialog. بنية: **Header ثابت** (title + description? + زر X على الـ end + border-b) · **Body قابل للتمرير** (`flex-1 overflow-y-auto`، هو وحده يـscroll) · **Footer ثابت** (أزرار على الـ end + border-t، اختياري).
- `flex flex-col max-h-[85vh] p-0 gap-0`، `bg-card`، `rounded`.
- Props: `open, onOpenChange, title, description?, footer?, size?(sm/md/lg)`.
- Convention: footer = Cancel(ghost) + Save(primary).

### 8.6 DrawerShell — **جديد 3.0** (`patterns/DrawerShell.tsx`)
غلاف موحّد فوق Sheet، **full-height**، نفس بنية ModalShell (header/body-scroll/footer)، `bg-card`, `flex flex-col h-full`. يفتح من الـ **end** (متّسق مع MobileDrawer)، RTL-safe. Props مثل ModalShell + `side?`.

### 8.7 ConfirmDialog — **جديد 3.0** (`patterns/ConfirmDialog.tsx`)
فوق AlertDialog (يحفظ دلالات الـ alertdialog + focus trap)، بنفس بنية ModalShell البصرية. للتأكيدات الهدّامة/التحذيرية. Props: `open, onOpenChange, title, description?, confirmLabel, cancelLabel, confirmTone(danger/primary/warning), onConfirm, loading?, children?`. يمكن أن يحوي `Alert` تحذيري في الـ body. كل الـ Dialogs/AlertDialogs مهاجرة لـ ModalShell/ConfirmDialog.

### 8.8 Alert — **جديد 3.0** (`ui/alert.tsx`)
تنبيه inline بخلفيات tint دلالية. **6 variants:** success · danger · warning · info · light (muted) · white (card+border).
- بنية: `flex items-start gap-3 rounded border px-4 py-3` · أيقونة variant على الـ start (size-5) · title? (`text-sm font-semibold`) + body (`text-sm`) · زر إغلاق اختياري على الـ end.
- الألوان: `bg-{tone}-tint` + `border-{tone}/30` + `text-{tone}-text` + أيقونة `text-{tone}` (CheckCircle2/XCircle/AlertTriangle/Info).

### 8.9 Toast (Sonner)
نفس منظومة الـ Alert: success/error/warning/info/default بنفس الـ tint backgrounds + الأيقونات، `rounded`، ظلّنا، موضع RTL-safe، dark-mode صحيح.

### 8.10 DatePicker — **جديد 3.0** (`patterns/DatePicker.tsx`)
يستبدل native date/time/datetime. مبني على Popover + Calendar (react-day-picker). trigger كحقل (outline، `rounded`، حد غامق عند hover/focus، أيقونة تقويم على الـ start). RTL calendar بالعربي (locale ar-EG) مع **أرقام غربية**. Props: `value, onChange, placeholder, disabled, min/max, mode(date/time/datetime)`. يربط مع rhf عبر Controller.

### 8.11 مكوّنات العرض والبيانات
- **DataTable\<T\>:** فرز كامل + حالات مدمجة. أعمدة `numeric` و`code` = **text-start** (يمين RTL) + رأس start؛ numeric يحتفظ بـ tabular-nums؛ **لا `dir="ltr"`** على الخلايا (`<bdi>` عند الحاجة). فرعية: EntityCell (أفاتار `rounded` + اسم + sub) · ActionCell (§8.13).
- **StatCard / KpiCard:** قيمة كبيرة + label + delta + sparkline/bars. tones (plain/brand/success/warning/danger). icon box `rounded`.
- **ListRow:** icon box `rounded` ملوّن + عنوان + subtitle + slot + chevron (RTL). density-aware.
- **ProgressRow:** شريط تقدّم ملوّن.
- **FormLayout:** FormSection/FormField/FormGrid/FormActions. label فوق، helper/error تحت، أزرار على الـ end. مبني على rhf+zod.
- **MiniChart:** SparkArea/SparkBar/RadialGauge/DonutGauge (Recharts، ألوان من التوكنات).
- **Card / PageSection:** **بلا border · shadow-sm · rounded-sm** (محدّث 3.0). الفواصل الداخلية (header divider, row lines) تبقى.

### 8.12 Scrollbar — **موحّد 3.0**
scrollbar عام ~6px، thumb `rounded` بلون `--fx-line` (hover `--fx-muted`)، track شفاف، `background-clip: padding-box`. Firefox: `scrollbar-width: thin`. مطبّق على main/modals/popovers/tables. dark-mode + RTL تلقائي. `.nav-scroll` (3px) يبقى لصفوف الـ nav.

### 8.13 Actions في الجداول — **محدّث 3.0**
- **dropdown:** `min-w-44`، padding `p-1.5`، `rounded`.
- **items:** `px-3 py-2`، أيقونة معبّرة على الـ start (View→Eye · Edit→Pencil · Delete→Trash2 · Duplicate→Copy · Print→Printer · Download→Download · Send→Send · Approve→CheckCircle2 · Cancel→XCircle)، **cursor-pointer** (disabled→cursor-not-allowed)، الهدّام danger-styled.
- **كل action مربوط بـ handler فعلي وينفّذ** (view/edit/delete via ConfirmDialog+toast/...) على صف صحيح، مفلتر بالصلاحية. لا actions معطّلة/وهمية.

### 8.14 مكوّنات الصفحة
- **PageHeader** (§10) · **PageSection** · **ModuleTabs** (تبويبات مربوطة بالراوتر).

### 8.15 مكوّنات الحالة
EmptyState (icon box `rounded`) · ErrorState (+retry) · Skeletons · Breadcrumb (§10) · OfflineBanner.

---

## 9) خريطة الألوان الدلالية (Quick Reference)

| Tone | bg | text | dot/fill |
|---|---|---|---|
| brand | `bg-brand-tint` | `text-brand-text` | `bg-brand` |
| success | `bg-success-tint` | `text-success-text` | `bg-success` |
| warning | `bg-warning-tint` | `text-warning-text` | `bg-warning` |
| danger | `bg-danger-tint` | `text-danger-text` | `bg-danger` |
| muted | `bg-muted` | `text-muted-foreground` | `bg-muted-foreground` |

---

## 10) ترتيب الصفحة و PageHeader — **محدّث 3.0**

### 10.1 ترتيب عناصر الصفحة (صارم)
```
(1) PageHeader  →  (2) Page-level Alert(s)  →  (3) Content
```
الـ alert **لا يقع أبداً** بين الـ breadcrumb والـ title، ولا فوق الـ PageHeader. الـ PageHeader (بعنوانه و breadcrumb) دائماً أول شيء، ثم التنبيهات، ثم المحتوى.

### 10.2 PageHeader (قسمان)
`flex items-start justify-between gap-4` (RTL-safe):
- **الـ start (يمين RTL) — كتلة رأسية (`flex flex-col gap-1`):**
  - **سطر علوي:** `page title` (h1, text-xl font-semibold) + **count pill** اختياري بجانبه — badge ملوّن (brand soft، `rounded`) يظهر فقط عند تمرير عدّاد (مثل "1 تسوية").
  - **سطر سفلي:** `Breadcrumb` — **سطر واحد دائماً** (flex-nowrap, whitespace-nowrap)، يُختصر بالوسط بـ "…"، لا يلتف. فاصل chevron (`›`, ChevronLeft في RTL).
- **الـ end (شمال RTL):** أزرار الإجراءات (`flex items-center gap-2 shrink-0`).

Props: `title` · `count?` + `countLabel?` (يرسم الـ pill) · `actions?` · breadcrumb تلقائي من `useBreadcrumb`.

### 10.3 عنوان المستند (Document Title)
`useDocumentTitle` (يُستدعى من PageHeader): `<title>` = **`{pageTitle} — Flexova`** (بالعربي: `{العنوان} — Flexova`)، fallback `Flexova`.

### 10.4 قواعد أخرى
- **subItems في الـ shell فقط** — لا تتكرر كتبويبات أعلى كل صفحة. التبويبات داخل شاشة واحدة (بطاقة الصنف) = محتوى الشاشة، تبقى.
- **toolbar الجدول** (search/filters/date/toggles) **داخل كارت الجدول** من فوقه (padding `py-6`)، كنمط `inventory/items`. الـ PageHeader يبقى خارج الكارت فوقه — لا تدخل أزرار الصفحة الكارت.
- كل منيو scrollable داخل حاويته فقط (`min-width:0` على الـ flex parents).

---

## 11) menu registry (`src/config/menu.ts`)
عناصر بـ: `key` (i18n) · `icon` (lucide) · `route` · `group` (core/sector/admin) · `order` · `permission?` · `moduleFlag?` · `status?` (active/"soon"→معطّل+badge "قريباً") · `subItems?`.
- يُعرض: Dashboard ثم CORE ثم مجموعة Sector (عنوانها = القطاع النشط) ثم ADMIN.
- الفلترة: `moduleFlag` مفعّل **و** `can(permission)`. كل موديول عنصر مستقل؛ subItems تبويبات داخله، **لا تُعشَّش موديول كتبويب في آخر**.

---

## 12) قواعد الصفحات (تُطبَّق على كل الموديولات)
- **كل محتوى داخل card** (PageSection/ContentCard).
- **الفورمات حسب الحجم:** قصير→modal (ModalShell) · متوسط→drawer (DrawerShell) · طويل/معقّد→صفحة كاملة (route).
- **أزرار حسب الدور** (§8.1 convention): primary/secondary/ghost/danger موحّدة.
- **رؤوس الجداول:** start + semibold. numeric/code → start + (tabular للأرقام).
- thumbnails: صورة الصنف أو placeholder محايد (~36px، `rounded`، lazy، object-cover).
- **مكوّنات متكرّرة:** Header ثابت · Sidebar حسب الدور · جدول قياسي (بحث/فلترة/ترتيب/pagination/تصدير) · modal/drawer قياسي · KPI card · إيصال قابل للطباعة · شارات حالة · الحالات الخمس.

---

## 13) Quick-Add — hub الإنشاء الشامل — **جديد 3.0**

الـ Quick-Add (`+` في الـ topbar) = **مرجع شامل لكل عمليات إنشاء الكيانات الجديدة** في النظام، مجمّع بالموديول.

### 13.1 المبدأ
- كل عملية **create new record** موجودة فعلاً في أي صفحة → لها shortcut في Quick-Add.
- **يحترم الطريقة الأصلية للإنشاء:**
  - إنشاء عبر **modal/drawer** → Quick-Add يفتح نفس الـ modal/drawer **فوق الصفحة الحالية** (بلا navigation).
  - إنشاء عبر **صفحة كاملة** (فاتورة…) → Quick-Add **يـnavigate** للراوت.
- سلوك مطابق تماماً لزر "الإنشاء" الأصلي في صفحة الكيان.

### 13.2 المعمار — Global Create Dispatcher
- `openCreate(entityKey, params?)` (Zustand/context على مستوى الـ shell) يُركّب الـ modal/drawer الصحيح فوق أي صفحة نشطة.
- زر "جديد" في صفحة القائمة **و** Quick-Add كلاهما ينادي نفس `openCreate(entityKey)`.
- عند النجاح: يُغلق الـ modal ويُحدّث القائمة الحالية؛ **لا** navigation قسري بعيداً عن صفحة المستخدم.

### 13.3 create-actions registry (مصدر واحد)
كل create له: `entityKey` · `label` (i18n) · module · permission · moduleFlag · icon · `method: modal|drawer|page` (+route للـ page). **أي صفحة إنشاء جديدة مستقبلاً تُسجّل هنا** لتظهر في Quick-Add.

### 13.4 العرض
mega-menu مجمّع بالموديول (عناوين = أسماء الموديولات)، مفلتر بـ moduleFlag + can(permission)، أيقونة معبّرة، cursor-pointer، RTL-safe، يـscroll لو طال، موبايل 1–2 عمود. **لا روابط لكيانات/صفحات غير موجودة.**

---

## 14) الحالات (States) — قسم حرج
كل شاشة بيانات تتعامل مع الخمس حالات، قابلة للاختبار عبر `?mock=loading|empty|error|no_results|offline`:
1. **Loading:** Skeletons.
2. **Empty:** EmptyState (رسالة + أيقونة + CTA).
3. **Error:** ErrorState (رسالة مفهومة + retry، لا أكواد خام).
4. **No-results:** متميّزة عن empty، تعكس الفلاتر.
5. **Offline:** OfflineBanner + حالة لكل عنصر (محلي/قيد المزامنة/تمت/تعارض). POS كامل offline.

---

## 15) جرد المكوّنات (Component Inventory)

```
src/components/
├── ui/        shadcn/Radix primitives
│   alert(جديد) · alert-dialog · avatar · badge · breadcrumb · button(tone×variant)
│   calendar(جديد) · card · checkbox · command · dialog · dropdown-menu · hover-card
│   input · label · navigation-menu · popover · radio-group · scroll-area · select
│   separator · sheet · skeleton · sonner · switch · table · tabs · textarea · tooltip
│
├── patterns/  Flexova patterns
│   Breadcrumb · ConfirmDialog(جديد) · DataTable(+EntityCell +ActionCell)
│   DatePicker(جديد) · DrawerShell(جديد) · EmptyState · ErrorState · FormLayout
│   KpiCard · ListRow · MiniChart · ModalShell(جديد) · ModuleTabs · OfflineBanner
│   PageHeader(محدّث) · PageSection · ProgressRow · Skeletons · StatCard · StatusPill
│
└── shell/     App chrome
    AppShell · AuthGuard · EtaBadge · HorizontalNav · MobileDrawer · QuickAdd(hub)
    SearchPanel · Sidebar · SidebarSplit · Topbar · UserChip
    + create-dispatcher (openCreate) — جديد
```

**الستاك:** React 18 · Vite · TypeScript · Tailwind v3.4 · shadcn/ui (Radix، رسمي) · react-i18next · Zustand · TanStack Table · react-hook-form + zod · Recharts · react-day-picker · lucide-react · mock layer (JSON fixtures).

---

## 16) ما لا يُلمَس دون إذن صريح
- `globals.css` (التوكنات) و `tailwind.config.ts` (الثيمات + سلّم radius).
- الـ Shell (الأنماط الأربعة + Topbar + menus).

---

## 17) نقاط مفتوحة / مؤجّلة
- **ETA connector:** تحويل ETA لـ connector صريح بـ 4 حالات (disconnected/connecting/connected/error) + زر ربط + wizard (TRN→e-seal→sandbox→go live). القرارات (صرامة المنع · مكان الزر · مستوى tenant/branch) مؤجّلة لخلاصة محاسب ضرائب. الـ EtaBadge سيتوسّع من 3 لـ 4 حالات.
- **نواقص تصميم بسيطة:** مؤجّلة لمرحلة بناء أعمق (لا تؤثر على الأساس).
- **التسعير/الباقات:** مؤجّل.
- **FE_00 §14:** توثيقي (اندمج جوهره هنا).

---

*نهاية المستند — أسس التصميم، الإصدار 3.0 (يوليو 2026).*
