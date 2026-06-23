# Flexova — أسس التصميم (Design Foundations)

> **المصدر الوحيد للحقيقة (Single Source of Truth) لنظام التصميم.**
> هذا المستند يوثّق الحالة **الفعلية المنفّذة** في الكود (`src/styles/globals.css`, `tailwind.config.ts`, `src/components/`)، لا التصوّر النظري.
> الإصدار: 2.0 — يونيو 2026 (يستبدل الإصدار 1.0)
> اللغة: شرح بالعربية · توكنات وكود بالإنجليزية كما هي في المشروع.
> عند أي تعارض بين هذا المستند وأي مستند آخر: **هذا المستند هو المرجع.**

---

## 0) كيف نستخدم هذا المستند

ده الـ **Design System المرجعي** لـ Flexova. أي شاشة في النواة أو في أي قطاع تلتزم بالـ tokens والمكوّنات والقواعد هنا. لو احتجنا مكوّن جديد مخصّص لقطاع، بيتبني **فوق** هذه الأسس مش بمعزل عنها.

**الأقسام:** المبادئ → الألوان → الشكل والظل → التايبوجرافي → المسافات والكسر → الـ Shell → مكوّنات shadcn → مكوّنات الأنماط (Patterns) → مكوّنات الـ Shell → الحالات → خريطة الألوان الدلالية → جرد المكوّنات.

---

## 1) مبادئ التصميم (Design Principles)

خمسة مبادئ تحكم كل قرار بصري:

1. **عربي-أولاً وRTL أصيل (Arabic-first).** الواجهة تُصمَّم من اليمين لليسار كأصل، والإنجليزية مرآة لها. كل المحاذاة والأيقونات الاتجاهية والمسافات تستخدم **الخصائص المنطقية (logical properties)** لا الفيزيائية — `start`/`end`، `ms-`/`me-`، `ps-`/`pe-`، `border-s/e` — ممنوع `left`/`right`.
2. **بساطة متطرفة (Radical Simplicity).** المستخدم غالباً غير تقني. الشاشة الواحدة تعمل مهمة واحدة واضحة. نقلّل الخيارات الظاهرة ونخبّي المتقدّم.
3. **الثقة مرئية (Visible Trust).** النظام بيمسك فلوس وبيانات ضريبية. الحالات المالية والـ ETA تبان بوضوح، والأخطاء صريحة وقابلة للتصحيح، والإجراءات الحسّاسة لها تأكيد.
4. **مقاومة الظروف (Resilient by Design).** النت المتقطّع واقع. الواجهة تتعامل مع **offline** كحالة أولى لا استثناء، وتوضّح حالة المزامنة بصراحة.
5. **أداء قبل الزخرفة (Performance over Decoration).** أجهزة العملاء متواضعة. نفضّل الحلول الخفيفة وزمن الاستجابة على أي تأثير بصري.

---

## 2) نظام الألوان (Color System)

### 2.1 الفلسفة
- **اللون الأساسي (Brand) فقط هو المتغيّر** بين الثيمات. المحايدات والألوان الدلالية ثابتة.
- كل الألوان مكتوبة كـ **HSL channels** (بدون `hsl()` wrapper) عشان تشتغل مع opacity modifiers في Tailwind (`bg-primary/50`).
- **التدرجات (Tints) مُولّدة لا ثابتة:** تُشتق عبر `color-mix` فتتكيّف تلقائياً مع الوضع الفاتح/الداكن. إضافة ثيم = تعريف `--brand` + `--brand-dark` فقط.
- **الوضعان (Light/Dark) من اليوم الأول:** كل ثيم يعمل في الوضعين، عبر `html[data-mode="dark"]`.

### 2.2 توكنات المحايدات (Neutral Surface Tokens)

| Token | Light (HSL) | Light (HEX) | Dark (HSL) | الاستخدام |
|---|---|---|---|---|
| `--fx-bg` | `220 20% 98%` | `#F9FAFB` | `218 36% 9%` | خلفية الصفحة |
| `--fx-surface` | `0 0% 100%` | `#FFFFFF` | `215 29% 13%` | الكروت / سطح الـ sidebar |
| `--fx-tint-base` | `0 0% 100%` | `#FFFFFF` | `214 26% 16%` | أساس اشتقاق الـ tints |
| `--fx-ink` | `222 47% 11%` | `#0F172A` | `215 33% 93%` | النص الأساسي |
| `--fx-muted` | `215 16% 47%` | `#64748B` | `215 19% 64%` | النص الثانوي |
| `--fx-line` | `218 28% 92%` | `#E6EAF1` | `213 21% 20%` | الحدود والفواصل |

### 2.3 التوكنات الدلالية الصلبة (Semantic Solid)

| Token | Value (HSL) | الاستخدام |
|---|---|---|
| `--success` | `142 76% 36%` | مؤشرات النجاح (أخضر) |
| `--warning` | `32 95% 44%` | مؤشرات التحذير (كهرماني) |
| `--danger` | `0 72% 51%` | مؤشرات الخطر (أحمر) |
| `--on-brand` | `0 0% 100%` | النص فوق أسطح الـ brand الممتلئة |

### 2.4 توكنات النص الدلالي (Semantic Text)

| Token | Light | Dark |
|---|---|---|
| `--success-text` | `hsl(var(--success))` | `color-mix(white 36%, success)` |
| `--warning-text` | `hsl(26 90% 37%)` | `color-mix(white 40%, warning)` |
| `--danger-text` | `hsl(var(--danger))` | `color-mix(white 38%, danger)` |
| `--brand-text` | `hsl(var(--brand-dark))` | `color-mix(white 38%, brand)` |

> في الوضع الداكن نُفتّح نصوص الدلالة والـ brand لأن اللون الغامق على خلفية غامقة ضعيف التباين.

### 2.5 توكنات التدرجات (Tints — عبر `color-mix`)

| Token | اللون الأساس | نسبة المزج |
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

تُضبط عبر `html[data-theme="..."]`. الافتراضي **nile**. مفعّل عند الإطلاق: nile · emerald · graphite (والباقي جاهز بالبنية).

| Key | `--brand` (HSL) | `--brand-dark` (HSL) | الحالة |
|---|---|---|---|
| `nile` (افتراضي) | `224 76% 48%` | `224 76% 42%` | مفعّل |
| `emerald` | `161 94% 30%` | `163 94% 24%` | مفعّل |
| `graphite` | `215 19% 35%` | `215 25% 27%` | مفعّل |
| `clay` | `17 75% 48%` | `18 85% 39%` | جاهز |
| `royal` | `263 70% 50%` | `263 69% 42%` | جاهز |
| `teal` | `175 84% 32%` | `175 83% 26%` | جاهز |

### 2.7 منطق التفعيل (Activation Logic)
- **الوضع (Light/Dark):** يتبع النظام افتراضياً عبر `prefers-color-scheme`، مع **override يدوي** للمستخدم. الأولوية: تفضيل المستخدم > النظام. تقنياً عبر `html[data-mode="dark"]`.
- **الثيم اللوني:** للـ tenant ثيم افتراضي، ويمكن لكل مستخدم تغييره لنفسه من صفحة التخصيص.
- التطبيق عبر `data-*` على `<html>`: `data-theme`, `data-mode`, `data-layout`, `data-density`, `data-collapsed`, `data-font-scale`, `data-font-ar`, `data-font-en`, `dir`, `lang`. التخزين: `flexova.appearance` (Zustand persist).

---

## 3) الشكل والظل (Shape & Shadow)

| Token | Value | ملاحظة |
|---|---|---|
| `--radius` | `16px` | الأساس؛ منه تُشتق md و sm |
| `--shadow` | `0 2px 4px rgba(15,23,42,.04), 0 12px 32px -12px rgba(15,23,42,.12)` | ظل ناعم منتشر |
| `--shadow-sm` | `0 1px 3px rgba(15,23,42,.06)` | حافة الكروت |

الوضع الداكن يستخدم `rgba(0,0,0,...)` بكثافة أعلى.

**سلّم أنصاف الأقطار في Tailwind:**

| Key | Value | Pixels |
|---|---|---|
| `rounded-lg` | `var(--radius)` | 16px |
| `rounded-md` | `calc(var(--radius) - 2px)` | 14px |
| `rounded-sm` | `calc(var(--radius) - 4px)` | 12px |

---

## 4) التايبوجرافي (Typography)

### 4.1 نظام الخطوط

| العنصر | Token / القيمة |
|---|---|
| الخط العربي | `--font-ar: "IBM Plex Sans Arabic"` (بديل: `"Cairo"` عبر `data-font-ar="cairo"`) |
| الخط الإنجليزي | `--font-en: "Inter"` (بديل: `"IBM Plex Sans"` عبر `data-font-en="plex-sans"`) |
| الخط النشط | `--font-active` — يتبدّل حسب `html[lang]` |
| الحجم الأساسي | `--font-base: 14px` (افتراضي) |

```ts
// tailwind.config.ts
fontFamily: { sans: ["var(--font-active)", "system-ui", "sans-serif"] }
```

### 4.2 مقاسات الخط (Font Scale)

عبر `data-font-scale` على `<html>` — يُضبط `--font-base`:

| المقاس | `data-font-scale` | الحجم |
|---|---|---|
| صغير | `sm` | 12px |
| متوسط (افتراضي) | `md` | 15px |
| كبير | `lg` | 18px |

> `font-size` يُضبط على `<html>` (لا `body`) حتى تتناسب كل وحدات `rem` في Tailwind مع `--font-base`.

### 4.3 المقياس الطباعي الفعلي (Tailwind `rem` → px)

محسوب على أساس `--font-base = 14px`:

| Tailwind | rem | px (افتراضي) |
|---|---|---|
| `text-xs` | 0.75rem | 10.5px |
| `text-sm` | 0.875rem | 12.25px |
| `text-base` | 1rem | 14px |
| `text-lg` | 1.125rem | 15.75px |
| `text-xl` | 1.25rem | 17.5px |
| `text-2xl` | 1.5rem | 21px |

كلها تتناسب تلقائياً عند تغيير `data-font-scale`.

### 4.4 الأرقام والعملة
- **الأرقام الغربية (0-9)** هي الافتراضي للقيم المالية.
- `font-variant-numeric: tabular-nums` لمحاذاة الأرقام عمودياً — عبر الكلاس `.num`.
- العملة: `ج.م` بعد الرقم في العربي، فاصل آلاف، خانتان عشريتان عند الحاجة. مثال: `48,260.00 ج.م`.
- الأرقام والكلمات اللاتينية والأكواد (TRN/UUID) تُعرض LTR ضمن سياق RTL (bidi).

---

## 5) المسافات ونقاط الكسر (Spacing & Breakpoints)

### 5.1 مقياس المسافات
Base-4: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64` (بكسل). الوحدة الأساسية للتنفّس = `16px`.

### 5.2 نقاط الكسر
- `mobile` < 640px — عمود واحد، الـ side nav يختفي ويتحوّل لـ drawer.
- `tablet` 640–1024px — شريط جانبي مطوي.
- `desktop` > 1024px — كامل.

### 5.3 الكثافة (Density)
`data-density`: `comfortable` (افتراضي) / `compact` — يؤثر على ارتفاع الصفوف والمسافات.

### 5.4 الحركة (Motion)
- `--ease: cubic-bezier(.2,.8,.2,1)` (في Tailwind: `ease-brand`).
- `animate-eta-pulse`: نبضة نقطة الـ EtaBadge (1.1s infinite).
- `animate-popin`: دخول الـ dropdown/popover (0.18s).
- `prefers-reduced-motion` يوقف كل الـ transitions والـ animations عالمياً.

---

## 6) الـ Shell (App Frame)

### 6.1 مقاييس الـ Shell

| Token | Value |
|---|---|
| `--nav-w` | `240px` — عرض الـ sidebar |
| `--nav-w-collapsed` | `72px` — الـ mini rail المطوي |
| `--topbar-h` | `60px` |

### 6.2 شبكة الـ Shell (`.app`)

CSS Grid يقود إطار التطبيق كله:

```
grid-areas:  "nav top"
             "nav main"
```

| Layout (`html[data-layout]`) | أعمدة الـ grid |
|---|---|
| `sidebar` (افتراضي) | `240px 1fr` → `72px 1fr` عند الطي |
| `sidebar-split` | `292px 1fr` (rail 72px + panel 220px) → `72px 1fr` عند الطي/إغلاق اللوحة |
| `horizontal` | `1fr` — لا nav جانبي، الـ header بارتفاع تلقائي |
| `horizontal-dropdown` | مثل horizontal |
| Mobile (`≤640px`) | دائماً `1fr` — الـ nav الجانبي مخفي |

`<main>` دائماً: `[grid-area:main] overflow-auto p-6 bg-background`.

### 6.3 كلاسات مساعدة (Utility)

| Class | الأثر |
|---|---|
| `.num` | `font-variant-numeric: tabular-nums` — على كل الأرقام |
| `.nav-scroll` | scrollbar رفيع (3px) متوافق مع الثيم — لصفوف الـ HorizontalNav |
| `.drawer-panel` | أنيميشن انزلاق متوافق مع RTL (`drawer-in/out-ltr/rtl` بـ 0.22s) |
| `:focus-visible` | إطار `2px solid ring`، `outline-offset:2px`, `border-radius:6px` |
| `::selection` | خلفية `var(--brand-tint)` |

### 6.4 الوضع الداكن في Tailwind

```ts
darkMode: ['variant', '&:where(html[data-mode="dark"], html[data-mode="dark"] *)']
```
مدفوع بـ `html[data-mode="dark"]` — لا استراتيجية `media`.

---

## 7) مكوّنات shadcn/ui الأساسية (`src/components/ui/`)

كلها أساسها **Radix UI** بـ Tailwind، وتقبل `className` للتجاوز.

### 7.1 Button
```tsx
<Button variant="default" size="default" asChild={false} />
```
**خريطة Variant → الدور (مُلزِمة):**

| Variant | الاستخدام | المظهر |
|---|---|---|
| `default` | أساسي: جديد/حفظ/إرسال | brand ممتلئ، نص أبيض |
| `outline` | ثانوي: تصدير/استيراد/طباعة | سطح كارت + حد |
| `ghost` | ثالثي: إلغاء/مسح/إغلاق | نص فقط، hover بـ accent |
| `destructive` | هدّام: حذف/إلغاء صلاحية/تعليق | أحمر ممتلئ |
| `icon` | أزرار أيقونة (toolbar/صف) | نص muted، hover بـ accent |
| `link` | روابط نصية | لون brand، underline عند hover |
| `secondary` | **لا يُستخدم** — غير متّسق | — |

**الأحجام:**

| Size | Height | Padding |
|---|---|---|
| `default` | `h-10` | `px-4 py-2` |
| `sm` | `h-9` | `px-3` |
| `lg` | `h-11` | `px-8` |
| `icon` | `h-10 w-10` | — |

Base: `inline-flex items-center gap-2 rounded-md text-sm font-medium`, `disabled:opacity-50`.

### 7.2 Badge
| Variant | المظهر |
|---|---|
| `default` | brand ممتلئ، `rounded-full` |
| `secondary` | secondary ممتلئ |
| `destructive` | danger ممتلئ |
| `outline` | حد فقط + نص foreground |

Base: `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold`.

### 7.3 Input / Textarea / Label
- **Input:** `h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm`. Focus: `ring-2 ring-ring`. Disabled: `cursor-not-allowed opacity-50`.
- **Textarea:** نفس الـ Input متعدد الأسطر.
- **Label:** `text-sm font-medium leading-none`، موصول بـ `htmlFor`.

### 7.4 Dialog / Sheet
- **Dialog (مودال مركزي):** Overlay `bg-black/80 fixed inset-0 z-50`. Content `fixed left-1/2 top-1/2 -translate-1/2 max-w-lg rounded-lg border bg-background p-6 shadow-lg`. زر الإغلاق `end-4 top-4` (منطقي RTL). أنيميشن `animate-in fade-in-0 zoom-in-95`.
- **Sheet (لوحة جانبية):** نفس Radix Dialog. `side`: `right` (افتراضي، `inset-y-0 right-0 w-3/4 sm:max-w-sm`) / `left` / `top` / `bottom`.

### 7.5 Table
أجزاء: `Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption`.
- `Table`: داخل `div.relative.w-full.overflow-auto`.
- `TableHead`: `h-12 px-4 text-start font-semibold text-muted-foreground`.
- `TableCell`: `p-4 align-middle`.
- `TableRow`: hover `bg-muted/50`، selected `bg-muted`.
- RTL-safe: `text-start` لا `text-left`.

### 7.6 عناصر الإدخال والتنقّل
- **Select:** Radix Select بـ trigger ومحتوى مخصّص.
- **Checkbox:** `h-4 w-4 rounded border border-primary`، checked = brand ممتلئ.
- **Switch:** `h-6 w-11 rounded-full`، checked = خلفية brand.
- **RadioGroup:** كل عنصر `h-4 w-4 rounded-full border border-primary`.
- **Tabs:** `TabsList` = `h-10 rounded-md bg-muted p-1`، الـ trigger النشط `bg-background text-foreground shadow-sm`.
- **Popover:** `z-50 rounded-md border bg-popover p-4 shadow-md`.
- **Tooltip:** `z-50 rounded-md border bg-popover px-3 py-1.5 text-sm shadow-md`، `TooltipProvider delayDuration={300}`.
- **DropdownMenu:** المحتوى `z-50 min-w-32 rounded-md border bg-popover p-1 shadow-md`، العناصر `h-8 px-2 text-sm rounded-sm`، focus `bg-accent`.
- **HoverCard:** `z-50 rounded-md border bg-popover p-4 shadow-md`.
- **NavigationMenu:** تنقّل أفقي متعدد المستويات (في HorizontalNav فقط).

### 7.7 عناصر العرض والحالة
- **Avatar:** `h-10 w-10 rounded-full`، fallback `bg-muted text-muted-foreground`. (في EntityCell بتجاوز `rounded-md`.)
- **Card:** `rounded-lg border bg-card text-card-foreground shadow-sm`، المحتوى `p-6`.
- **Separator:** `h-px bg-border` (أفقي) / `w-px bg-border` (رأسي).
- **ScrollArea:** Radix بـ thumb مخصّص متوافق مع الثيم.
- **Skeleton:** `animate-pulse rounded-md bg-muted`.
- **Sonner (Toast):** متناسق مع سطح/نص التطبيق.
- **AlertDialog:** تأكيد الإجراءات الهدّامة.
- **Command:** أساس الـ command palette (داخل SearchPanel).

---

## 8) مكوّنات الأنماط (`src/components/patterns/`)

لبنات أعلى مستوى مركّبة من أساسيات shadcn.

### 8.1 StatusPill
شارة ملوّنة بنقطة في المقدّمة، تغلّف `Badge variant="outline"`. **10 variants:**

| variant | Background | Text | Dot |
|---|---|---|---|
| `paid` / `approved` | `bg-success-tint` | `text-success-text` | `bg-success` |
| `credit` / `pending` / `in-progress` | `bg-warning-tint` | `text-warning-text` | `bg-warning` |
| `sent` / `active` | `bg-brand-tint` | `text-brand-text` | `bg-brand` |
| `rejected` | `bg-danger-tint` | `text-danger-text` | `bg-danger` |
| `inactive` / `default` | `bg-muted` | `text-muted-foreground` | `bg-muted-foreground` |

### 8.2 DataTable\<T\>
جدول فرز كامل بحالات loading/error/empty مدمجة.
```ts
interface Column<T> {
  key: string; header: string; cell: (row: T) => React.ReactNode;
  sortable?: boolean;  // asc → desc → none
  numeric?: boolean;   // محاذاة end + tabular-nums
  className?: string;
}
```
- رأس: sticky، `bg-muted/30 backdrop-blur-sm`، `text-xs uppercase tracking-wide`.
- hover الصف: `bg-muted/40`.
- يعرض `TableSkeleton` / `ErrorState` / `EmptyState` تلقائياً.

**مكوّنات فرعية من نفس الملف:**
- **EntityCell:** أفاتار + اسم + subtitle في خلية. `<EntityCell name sub avatarFallback avatarSrc avatarClass />`.
- **ActionCell:** صف أزرار أيقونة مدمجة (`h-7 w-7`). الـ destructive: `hover:text-danger hover:bg-danger-tint`.

### 8.3 StatCard
كارت KPI باختيار sparkline أو bar chart عند الحافة السفلية.

| Prop | Type | Default |
|---|---|---|
| `label` | string | required |
| `value` | string \| number | required |
| `delta` | string | optional |
| `deltaPositive` | boolean | optional |
| `sparkline` | number[] | area chart |
| `bars` | number[] | bar chart (أولوية على sparkline) |
| `tone` | `plain` \| `brand` \| `success` \| `warning` \| `danger` | `plain` |

الـ tones تؤثر على خلفية الكارت ولون الـ label والقيمة. الـ sparkline يمتد للحواف (`-mx-5 -mb-5`). recharts بألوان مُحلّلة من التوكنات (تتكيّف مع الثيم).

### 8.4 KpiCard
أيقونة + label + قيمة كبيرة + delta اختياري. أبسط من StatCard (بدون sparkline).

| tone | خلفية الكارت | لون الأيقونة | لون النص |
|---|---|---|---|
| none | كارت افتراضي | `text-brand` في box `bg-brand-tint` | `text-foreground` |
| `brand` / `info` | `bg-brand-tint` | `text-brand` | `text-brand-text` |
| `success` | `bg-success-tint` | `text-success` | `text-success-text` |
| `warning` | `bg-warning-tint` | `text-warning` | `text-warning-text` |
| `danger` | `bg-danger-tint` | `text-danger` | `text-danger-text` |

box الأيقونة: `h-9 w-9 rounded-md bg-white/40` (على الكروت الملوّنة) أو `bg-brand-tint`.

### 8.5 ListRow
عنصر قائمة عام: box أيقونة ملوّن + عنوان/subtitle + slot نهائي + chevron اختياري.
- tones: `brand`/`success`/`warning`/`danger`/`muted` (كل واحد `bg-*-tint text-*`).
- density-aware: compact → `py-2.5` + أيقونة `h-8 w-8`؛ default → `py-3.5` + `h-10 w-10`.
- مع `onClick` يصبح `<button>` بـ focus styles؛ بدونه `<div>`.
- chevron متوافق RTL (ChevronLeft في RTL).

### 8.6 ProgressRow
شريط تقدّم أفقي مُعنوَن. tones: brand/success/warning/danger.
- Track: `h-2 rounded-full bg-muted`. Fill: `transition-[width] duration-500 ease-brand`.
- `value` مقيّد 0–100. `displayValue` يتجاوز النص النهائي (مثل `"1,234 ج.م"`).

### 8.7 مكوّنات الفورم (`FormLayout.tsx`)
- **FormSection:** كتلة مُعنونة (عنوان + Separator + grid).
- **FormField:** label فوق + control + helper/error تحت. الخطأ: الـ label يصير `text-danger-text` والـ helper يُستبدل بالخطأ. النجمة المطلوبة `text-danger`.
- **FormGrid:** `cols=1` (دائماً عمود) / `cols=2` افتراضي (`grid-cols-1 sm:grid-cols-2`) / `cols=3`.
- **FormActions:** صف Cancel + Save على الـ end المنطقي. spinner داخل Save عند `saving`. `start` slot (مثل زر حذف). Save بـ `min-w-24`.

### 8.8 MiniChart (Sparkline & Gauge Suite)
كل الـ charts تحلّل توكنات الألوان لقيم فعلية وقت التشغيل (تتكيّف مع الثيم/الوضع).
- **SparkArea:** area chart مدمج بتعبئة gradient. tones.
- **SparkBar:** bar chart مصغّر. `fillOpacity=0.55`, `radius=[2,2,0,0]`.
- **RadialGauge:** نصف-دونات (180°) نسبة مئوية بنص مركزي. Track `hsl(var(--border))`.
- **DonutGauge:** دونات كامل 360° متعدد الشرائح بقيمة مركزية.

### 8.9 مكوّنات الصفحة
- **PageHeader:** `h1 text-xl font-semibold` + breadcrumb (عبر `useBreadcrumb`) + subtitle + actions (`flex items-center gap-2 shrink-0`). `crumbLabel` = null في صفحات القوائم.
- **PageSection:** حاوية كارت برأس اختياري. `padded` (افتراضي true، `p-6`)؛ `padded=false` للمحتوى الممتد للحواف (الجداول). الرأس: `px-6 py-4 border-b`.
- **ModuleTabs:** شريط تبويبات مربوط بالـ router (`NavLink`، الحالة النشطة من الـ URL). لغة بصرية = `TabsList`+`TabsTrigger`. النشط `bg-background text-foreground shadow-sm`. scrollable.

### 8.10 مكوّنات الحالة
- **EmptyState:** أيقونة + عنوان + وصف + action اختياري. `py-16 flex-col items-center gap-4`، box الأيقونة `h-12 w-12 rounded-lg bg-muted`.
- **ErrorState:** نص الخطأ + زر Retry اختياري.
- **Skeletons:** `TableSkeleton` (rows/cols، opacity متناقص للعمق) · `KpiSkeleton` · `Skeleton` (الأساس).
- **Breadcrumb:** يُرسَم تلقائياً عبر PageHeader/`useBreadcrumb`. كل جزء لينك عدا الأخير. skeleton للأجزاء الديناميكية.
- **OfflineBanner:** بانر ثابت عند اكتشاف offline.

---

## 9) مكوّنات الـ Shell (`src/components/shell/`)

- **AppShell:** غلاف الجذر؛ يطبّق `.app` CSS grid ويعرض الـ nav الصحيح حسب `layout`.
- **Topbar:** رأس sticky، `z-40`، `bg-card/80 backdrop-blur-sm border-b`، ارتفاع 60px. (تفاصيل الصفوف في §6.)
- **Sidebar:** nav جانبي، `bg-card border-e`. موسّع: accordion بمجموعتي Core/Admin، النشط `bg-brand-tint text-brand-text font-medium` + شريط brand. مطوي: mini rail 72px أيقونات + tooltip/flyout.
- **SidebarSplit:** عمودان — rail أيقونات 72px + sub-panel 220px.
- **HorizontalNav:** module bar + sub-bar + dropdown bar.
- **MobileDrawer:** drawer منزلق متوافق RTL (`drawer-panel`). LTR من اليسار، RTL من اليمين. 0.22s. يعرض Sidebar في وضع `inDrawer`.
- **EtaBadge:** مؤشر حالة ETA في الـ Topbar. الحالات الحالية: `connected` (أخضر) · `syncing` (brand + نبضة) · `offline` (كهرماني). الشكل `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium` + نقطة ملوّنة.
- **SearchPanel:** popover بحث عام، `w-[min(560px,calc(100vw-2rem))]`.
- **QuickAdd:** زر `+ New` (outline) يفتح dropdown إجراءات إنشاء سريعة per-module.
- **UserChip / UserMenu:** أفاتار + اسم في نهاية الـ Topbar، dropdown (بروفايل/إعدادات/خروج).
- **AuthGuard:** يعيد التوجيه لـ `/auth/login` بدون جلسة نشطة.

---

## 10) الحالات (States) — قسم حرج

كل شاشة بيانات تتعامل مع الحالات الخمس بوضوح، قابلة للاختبار عبر `?mock=loading|empty|error|no_results|offline`:

1. **تحميل (Loading):** Skeletons بدل سبينر فارغ.
2. **فارغ (Empty):** EmptyState — رسالة ودّية + أيقونة + CTA. لا شاشة بيضاء.
3. **خطأ (Error):** ErrorState — رسالة مفهومة + إعادة محاولة. لا أكواد تقنية للمستخدم.
4. **نتيجة بحث فارغة (No-results):** متميّزة عن "فارغ"، تعكس الفلاتر.
5. **غير متصل (Offline):** OfflineBanner ثابت + بيان الحفظ المحلي + حالة لكل عنصر (محلي/قيد المزامنة/تمت/تعارض). الـ POS يعمل كاملاً offline.

---

## 11) خريطة الألوان الدلالية (Quick Reference)

| Tone | bg class | text class | dot/fill class |
|---|---|---|---|
| brand | `bg-brand-tint` | `text-brand-text` | `bg-brand` |
| success | `bg-success-tint` | `text-success-text` | `bg-success` |
| warning | `bg-warning-tint` | `text-warning-text` | `bg-warning` |
| danger | `bg-danger-tint` | `text-danger-text` | `bg-danger` |
| muted | `bg-muted` | `text-muted-foreground` | `bg-muted-foreground` |

---

## 12) جرد المكوّنات (Component Inventory)

```
src/components/
├── ui/                          shadcn / Radix primitives (27)
│   ├── alert-dialog · avatar · badge · breadcrumb · button · card
│   ├── checkbox · command · dialog · dropdown-menu · hover-card · input
│   ├── label · navigation-menu · popover · radio-group · scroll-area
│   ├── select · separator · sheet · skeleton · sonner · switch
│   ├── table · tabs · textarea · tooltip
│
├── patterns/                    Flexova design patterns (16)
│   ├── Breadcrumb · Card (PageSection alias) · DataTable (+EntityCell +ActionCell)
│   ├── EmptyState · ErrorState · FormLayout (Section/Field/Grid/Actions)
│   ├── KpiCard · ListRow · MiniChart (SparkArea/SparkBar/RadialGauge/DonutGauge)
│   ├── ModuleTabs · OfflineBanner · PageHeader · PageSection
│   ├── ProgressRow · Skeletons (Table/Kpi/base) · StatusPill
│
└── shell/                       App chrome (12)
    ├── AppShell · AuthGuard · EtaBadge · HorizontalNav · MobileDrawer
    ├── QuickAdd · SearchPanel · Sidebar · SidebarSplit · Topbar · UserChip
```

**الستاك:** React 18 · Vite · TypeScript · TailwindCSS v3.4 · shadcn/ui (Radix، رسمي) · react-i18next · Zustand · TanStack Table · react-hook-form + zod · Recharts · lucide-react · mock layer (JSON fixtures).

---

## 13) ما لا يُلمَس دون إذن صريح
- `globals.css` (التوكنات) و `tailwind.config.ts` (الثيمات).
- الـ Shell (الأنماط الأربعة + Topbar + menus).

---

*نهاية المستند — أسس التصميم، الإصدار 2.0 (موثّق من الكود الفعلي، يونيو 2026).*