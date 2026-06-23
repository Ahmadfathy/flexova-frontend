# Flexova Frontend — UI Reference

Complete reference for design tokens, Tailwind config, globals.css, and every component in the system.

---

## 1. Design Token System (`src/styles/globals.css`)

### 1.1 Color Tokens (CSS Custom Properties)

All colors are expressed as **HSL channels** (no `hsl()` wrapper) so they compose with Tailwind's alpha modifier syntax (`bg-primary/50`).

#### Neutral Surface Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--fx-bg` | `220 20% 98%` (#F9FAFB) | `218 36% 9%` | Page background |
| `--fx-surface` | `0 0% 100%` (#FFFFFF) | `215 29% 13%` | Card / sidebar surface |
| `--fx-tint-base` | `0 0% 100%` | `214 26% 16%` | Base for `color-mix` tints |
| `--fx-ink` | `222 47% 11%` (#0F172A) | `215 33% 93%` | Primary text |
| `--fx-muted` | `215 16% 47%` (#64748B) | `215 19% 64%` | Secondary / muted text |
| `--fx-line` | `218 28% 92%` (#E6EAF1) | `213 21% 20%` | Borders, dividers |

#### Semantic Solid Tokens

| Token | Value | Usage |
|---|---|---|
| `--success` | `142 76% 36%` | Green indicators |
| `--warning` | `32 95% 44%` | Amber indicators |
| `--danger` | `0 72% 51%` | Red / error indicators |
| `--on-brand` | `0 0% 100%` | Text on brand-filled surfaces |

#### Semantic Text Tokens (Full HSL)

| Token | Light | Dark |
|---|---|---|
| `--success-text` | `hsl(var(--success))` | `color-mix(white 36%, success)` |
| `--warning-text` | `hsl(26 90% 37%)` | `color-mix(white 40%, warning)` |
| `--danger-text` | `hsl(var(--danger))` | `color-mix(white 38%, danger)` |
| `--brand-text` | `hsl(var(--brand-dark))` | `color-mix(white 38%, brand)` |

#### Tint Tokens (12–14% tint via `color-mix`)

| Token | Base color | Opacity in mix |
|---|---|---|
| `--brand-tint` | brand | 12% |
| `--success-tint` | success | 14% |
| `--warning-tint` | warning | 14% |
| `--danger-tint` | danger | 14% |
| `--info-tint` | brand | 10% |

#### Brand Palette (Theme Variants)

Set via `html[data-theme="..."]`. Default is **nile**.

| Key | `--brand` HSL | `--brand-dark` HSL |
|---|---|---|
| `nile` (default) | `224 76% 48%` | `224 76% 42%` |
| `emerald` | `161 94% 30%` | `163 94% 24%` |
| `graphite` | `215 19% 35%` | `215 25% 27%` |
| `clay` | `17 75% 48%` | `18 85% 39%` |
| `royal` | `263 70% 50%` | `263 69% 42%` |
| `teal` | `175 84% 32%` | `175 83% 26%` |

### 1.2 Shape & Shadow Tokens

| Token | Value | Note |
|---|---|---|
| `--radius` | `16px` | Base radius; `--radius - 2px` = md, `--radius - 4px` = sm |
| `--shadow` | `0 2px 4px rgba(15,23,42,.04), 0 12px 32px -12px rgba(15,23,42,.12)` | Soft diffuse |
| `--shadow-sm` | `0 1px 3px rgba(15,23,42,.06)` | Card chrome |

Dark mode shadows use `rgba(0,0,0,...)` at higher opacity.

### 1.3 Font System

| Attribute | Token / Value |
|---|---|
| Arabic font | `--font-ar: "IBM Plex Sans Arabic"` (alt: `"Cairo"` via `data-font-ar="cairo"`) |
| English font | `--font-en: "Inter"` (alt: `"IBM Plex Sans"` via `data-font-en="plex-sans"`) |
| Active font | `--font-active` — switches via `html[lang]` attribute |
| Base size | `--font-base: 14px` (default) |
| Scale small | `data-font-scale="sm"` → 12px |
| Scale medium | `data-font-scale="md"` → 15px |
| Scale large | `data-font-scale="lg"` → 18px |

`font-size` is set on `<html>` (not `body`) so all `rem` Tailwind utilities scale with `--font-base`.

### 1.4 Shell Metrics

| Token | Value |
|---|---|
| `--nav-w` | `240px` — sidebar width |
| `--nav-w-collapsed` | `72px` — collapsed mini rail |
| `--topbar-h` | `60px` |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` |

### 1.5 App Shell Grid (`.app`)

CSS Grid layout that drives the entire app frame:

```
grid-areas:  "nav top"
             "nav main"
```

| Layout (`html[data-layout]`) | Grid columns |
|---|---|
| `sidebar` (default) | `240px 1fr` → `72px 1fr` when collapsed |
| `sidebar-split` | `292px 1fr` (rail 72px + panel 220px) → `72px 1fr` when collapsed / sub-panel closed |
| `horizontal` | `1fr` — no side nav, header auto-height |
| `horizontal-dropdown` | same as horizontal |
| Mobile (`≤640px`) | always `1fr` — side nav hidden |

### 1.6 Utility Classes

| Class | Effect |
|---|---|
| `.num` | `font-variant-numeric: tabular-nums` — use on all numbers |
| `.nav-scroll` | Thin scrollbar (`3px`), theme-aware, for HorizontalNav rows |
| `.drawer-panel` | RTL-aware slide animation (`drawer-in/out-ltr/rtl` at `.22s`) |
| `:focus-visible` | `2px solid ring` outline, `outline-offset:2px`, `border-radius:6px` |
| `::selection` | `var(--brand-tint)` background |

`prefers-reduced-motion` kills all transitions and animations globally.

---

## 2. Tailwind Config (`tailwind.config.ts`)

### 2.1 Dark Mode

```ts
darkMode: ['variant', '&:where(html[data-mode="dark"], html[data-mode="dark"] *)']
```
Dark mode is driven by `html[data-mode="dark"]`, **not** the `media` strategy.

### 2.2 Color Aliases (extend)

All mapped to CSS custom properties with alpha-value support:

| Tailwind token | CSS var |
|---|---|
| `background` / `foreground` | `--background` / `--foreground` |
| `card` / `card-foreground` | `--card` / `--card-foreground` |
| `popover` / `popover-foreground` | `--popover` / `--popover-foreground` |
| `primary` / `primary-foreground` | `--primary` / `--primary-foreground` |
| `secondary` / `secondary-foreground` | `--secondary` / `--secondary-foreground` |
| `muted` / `muted-foreground` | `--muted` / `--muted-foreground` |
| `accent` / `accent-foreground` | `--accent` / `--accent-foreground` |
| `destructive` / `destructive-foreground` | `--destructive` / `--destructive-foreground` |
| `border` / `input` / `ring` | `--border` / `--input` / `--ring` |
| **Flexova extensions** | |
| `brand` / `brand.dark` | `--brand` / `--brand-dark` |
| `success` / `warning` / `danger` | `--success` / `--warning` / `--danger` |
| `on-brand` | `--on-brand` |
| `brand-text` / `success-text` / `warning-text` / `danger-text` | Full CSS color (no alpha) |
| `brand-tint` / `success-tint` / `warning-tint` / `danger-tint` | Full CSS color (no alpha) |

### 2.3 Border Radius

| Key | Value | Pixels |
|---|---|---|
| `rounded-lg` | `var(--radius)` | 16px |
| `rounded-md` | `calc(var(--radius) - 2px)` | 14px |
| `rounded-sm` | `calc(var(--radius) - 4px)` | 12px |

### 2.4 Box Shadow

| Key | Value |
|---|---|
| `shadow` | `var(--shadow)` |
| `shadow-sm` | `var(--shadow-sm)` |

### 2.5 Font Family

```ts
sans: ["var(--font-active)", "system-ui", "sans-serif"]
```

### 2.6 Easing

| Key | Value |
|---|---|
| `ease-brand` | `cubic-bezier(.2,.8,.2,1)` |

### 2.7 Keyframes & Animations

| Animation | Keyframes | Duration | Use |
|---|---|---|---|
| `animate-eta-pulse` | scale 1→0.75 + opacity fade | 1.1s infinite | EtaBadge syncing dot |
| `animate-popin` | `translateY(-6px) → 0` + fade | 0.18s | Dropdown / popover entrance |

### 2.8 Plugin

`tailwindcss-animate` — powers `animate-in`, `animate-out`, `fade-in-*`, `slide-in-from-*`, `zoom-in-*` etc. used by shadcn overlays.

---

## 3. shadcn/ui Primitive Components (`src/components/ui/`)

These are **Radix UI** primitives styled with Tailwind. All accept `className` for overrides.

### `Button`

```tsx
<Button variant="default" size="default" asChild={false} />
```

| Prop | Type | Default |
|---|---|---|
| `variant` | see table | `"default"` |
| `size` | see table | `"default"` |
| `asChild` | boolean | `false` — renders as `<Slot>` when true |

**Variant → Role mapping (enforced in comments):**

| Variant | Use for | Visual |
|---|---|---|
| `default` | Primary: New, Save, Submit | Brand-filled, white text |
| `outline` | Secondary: Export, Import, Print | Card surface + border |
| `ghost` | Tertiary: Cancel, Clear, Close | Text-only, accent hover |
| `destructive` | Danger: Delete, Revoke, Suspend | Red-filled |
| `icon` | Icon-only toolbar/row buttons | Muted text, accent hover |
| `link` | Inline text links | Brand color, underline on hover |
| `secondary` | **Do not use** — inconsistent | shadcn secondary token |

**Size options:**

| Size | Height | Padding |
|---|---|---|
| `default` | `h-10` | `px-4 py-2` |
| `sm` | `h-9` | `px-3` |
| `lg` | `h-11` | `px-8` |
| `icon` | `h-10 w-10` | — |

Base classes: `inline-flex items-center gap-2 rounded-md text-sm font-medium`, `disabled:opacity-50`.

---

### `Badge`

```tsx
<Badge variant="default" />
```

| Variant | Visual |
|---|---|
| `default` | Brand-filled, `rounded-full` |
| `secondary` | Secondary-filled |
| `destructive` | Danger-filled |
| `outline` | Border only, foreground text |

Base: `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold`.

---

### `Input`

Standard `<input>` styled as: `h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm`. Focus: `ring-2 ring-ring`. Disabled: `cursor-not-allowed opacity-50`.

---

### `Textarea`

Same styling as Input but multi-line. Use with `FormField` for consistent label/error layout.

---

### `Label`

`text-sm font-medium leading-none`. Wired via `htmlFor`.

---

### `Dialog`

Centered modal. Parts: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`.

- **Overlay**: `bg-black/80 fixed inset-0 z-50`
- **Content**: `fixed left-1/2 top-1/2 -translate-1/2 max-w-lg rounded-lg border bg-background p-6 shadow-lg`
- **Close button**: absolute `end-4 top-4` (logical, RTL-aware)
- Animations: `animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2`

---

### `Sheet`

Side panel. Same Radix Dialog primitive, different presentation.

| `side` | Slide direction |
|---|---|
| `right` (default) | slides in from right, `inset-y-0 right-0 w-3/4 sm:max-w-sm` |
| `left` | slides in from left |
| `top` / `bottom` | slides in from top/bottom |

Parts: `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`.

---

### `Table`

Parts: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`.

- `Table`: wraps in `div.relative.w-full.overflow-auto`
- `TableHead`: `h-12 px-4 text-start font-semibold text-muted-foreground`
- `TableCell`: `p-4 align-middle`
- `TableRow`: hover `bg-muted/50`, selected `bg-muted`
- RTL-safe: uses `text-start` not `text-left`

---

### `Select`

Radix Select with custom trigger and content. Parts: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`.

---

### `Checkbox`

Radix Checkbox. `h-4 w-4 rounded border border-primary`. Checked: brand-filled.

---

### `Switch`

Toggle switch. `h-6 w-11 rounded-full`. Checked: brand background.

---

### `RadioGroup` / `RadioGroupItem`

Radix RadioGroup. Each item: `h-4 w-4 rounded-full border border-primary`.

---

### `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent`

Radix Tabs. `TabsList`: `h-10 rounded-md bg-muted p-1`. Active trigger: `bg-background text-foreground shadow-sm`.

---

### `Popover` / `PopoverTrigger` / `PopoverContent`

Content: `z-50 rounded-md border bg-popover p-4 shadow-md`. Animates in/out.

---

### `Tooltip` / `TooltipTrigger` / `TooltipContent` / `TooltipProvider`

Content: `z-50 rounded-md border bg-popover px-3 py-1.5 text-sm shadow-md`. `TooltipProvider delayDuration={300}` wraps entire sidebar.

---

### `DropdownMenu`

Radix DropdownMenu. Content: `z-50 min-w-32 rounded-md border bg-popover p-1 shadow-md`. Items: `h-8 px-2 text-sm rounded-sm`, focus `bg-accent`.

---

### `Avatar` / `AvatarImage` / `AvatarFallback`

`h-10 w-10 rounded-full`. Fallback: `bg-muted text-muted-foreground`. Used in `EntityCell` with `rounded-md` override.

---

### `Card` / `CardContent` / `CardHeader` / `CardTitle` / `CardDescription` / `CardFooter`

`rounded-lg border bg-card text-card-foreground shadow-sm`. Content: `p-6`.

---

### `Separator`

`h-px bg-border` (horizontal) or `w-px bg-border` (vertical).

---

### `ScrollArea` / `ScrollBar`

Radix ScrollArea with styled custom thumb. Used in Sidebar. Thumb adapts to theme.

---

### `Skeleton`

`animate-pulse rounded-md bg-muted`. Used in all loading skeletons.

---

### `Sonner` (Toast)

Themed to match app surface/foreground. Import from `@/components/ui/sonner`.

---

### `AlertDialog`

Destructive-action confirmation. Parts: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`.

---

### `Command`

Command palette primitive (used inside SearchPanel). Parts: `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`.

---

### `HoverCard`

`z-50 rounded-md border bg-popover p-4 shadow-md`. Animates in/out.

---

### `NavigationMenu`

Multi-level desktop nav. Used only in HorizontalNav.

---

## 4. Pattern Components (`src/components/patterns/`)

Higher-level building blocks composed from shadcn primitives.

### `StatusPill`

Colored badge with a leading dot. Wraps shadcn `Badge variant="outline"`.

```tsx
<StatusPill variant="approved" label="Approved" />
```

| `variant` | Background | Text | Dot |
|---|---|---|---|
| `paid` / `approved` | `bg-success-tint` | `text-success-text` | `bg-success` |
| `credit` / `pending` / `in-progress` | `bg-warning-tint` | `text-warning-text` | `bg-warning` |
| `sent` / `active` | `bg-brand-tint` | `text-brand-text` | `bg-brand` |
| `rejected` | `bg-danger-tint` | `text-danger-text` | `bg-danger` |
| `inactive` / `default` | `bg-muted` | `text-muted-foreground` | `bg-muted-foreground` |

Props: `variant`, `label`, `className`.

---

### `DataTable<T>`

Full-featured sortable table with built-in loading/error/empty states.

```tsx
<DataTable
  columns={cols}
  data={rows}
  loading={false}
  error={null}
  onRetry={fn}
  keyExtractor={(r) => r.id}
/>
```

**Column definition:**

```ts
interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;   // click header to sort (asc → desc → none)
  numeric?: boolean;    // right-aligns + tabular-nums
  className?: string;
}
```

- Header row: sticky, `bg-muted/30 backdrop-blur-sm`, `text-xs uppercase tracking-wide`
- Row hover: `bg-muted/40`
- States: renders `<TableSkeleton>` / `<ErrorState>` / `<EmptyState>` automatically

**Sub-components exported from the same file:**

#### `EntityCell`
Avatar + name + subtitle in a table cell.
```tsx
<EntityCell name="Ahmed" sub="EMP-001" avatarFallback="AH" avatarSrc="..." avatarClass="bg-brand-tint" />
```

#### `ActionCell`
Row of compact icon buttons (h-7 w-7).
```tsx
<ActionCell actions={[{ icon: <Edit />, label: "Edit", onClick: fn, variant: "ghost" }]} />
```
Destructive variant: `hover:text-danger hover:bg-danger-tint`.

---

### `StatCard`

KPI card with optional sparkline area or bar chart at the bottom edge.

```tsx
<StatCard label="Revenue" value="1,234" delta="+12%" deltaPositive sparkline={[10,20,15,30]} tone="brand" />
```

| Prop | Type | Default |
|---|---|---|
| `label` | string | required |
| `value` | string \| number | required |
| `delta` | string | optional |
| `deltaPositive` | boolean | optional |
| `sparkline` | number[] | area chart |
| `bars` | number[] | bar chart (takes precedence over sparkline) |
| `tone` | `"plain" \| "brand" \| "success" \| "warning" \| "danger"` | `"plain"` |

Tones affect card background, label color, and value color. Sparkline bleeds to card edges (`-mx-5 -mb-5`). Uses recharts with resolved CSS colors (theme-adaptive).

---

### `KpiCard`

Icon + label + large value + optional delta. Simpler than StatCard (no sparkline).

```tsx
<KpiCard icon={TrendingUp} label="Sales" value="5,200" delta="+8%" deltaPositive tone="brand" />
```

| `tone` | Card bg | Icon color | Text color |
|---|---|---|---|
| none | default card | `text-brand` in `bg-brand-tint` box | `text-foreground` |
| `brand` / `info` | `bg-brand-tint` | `text-brand` | `text-brand-text` |
| `success` | `bg-success-tint` | `text-success` | `text-success-text` |
| `warning` | `bg-warning-tint` | `text-warning` | `text-warning-text` |
| `danger` | `bg-danger-tint` | `text-danger` | `text-danger-text` |

Icon box: `h-9 w-9 rounded-md bg-white/40` (on tinted cards) or `bg-brand-tint`.

---

### `ListRow`

General-purpose list item: tinted icon box + title/subtitle + trailing slot + optional chevron.

```tsx
<ListRow
  leading={<Icon />}
  title="Item Name"
  subtitle="Secondary info"
  trailing={<StatusPill ... />}
  chevron
  tone="brand"
  onClick={fn}
/>
```

| `tone` | Icon box |
|---|---|
| `brand` | `bg-brand-tint text-brand` |
| `success` | `bg-success-tint text-success` |
| `warning` | `bg-warning-tint text-warning` |
| `danger` | `bg-danger-tint text-danger` |
| `muted` | `bg-muted text-muted-foreground` |

- Density-aware: compact → `py-2.5 h-8 w-8` icon, default → `py-3.5 h-10 w-10`
- `onClick` renders as `<button>` with focus styles; without → `<div>`
- Chevron is RTL-aware (ChevronLeft in RTL, ChevronRight in LTR)

---

### `ProgressRow`

Labeled horizontal progress bar.

```tsx
<ProgressRow label="Inventory" value={74} displayValue="74%" tone="brand" />
```

| `tone` | Bar color |
|---|---|
| `brand` | `bg-brand` |
| `success` | `bg-success` |
| `warning` | `bg-warning` |
| `danger` | `bg-danger` |

- Track: `h-2 rounded-full bg-muted`
- Fill: animated with `transition-[width] duration-500 ease-brand`
- `value` clamped 0–100. `displayValue` overrides the trailing text (e.g. `"1,234 ج.م"`)

---

### `FormSection`

Titled block grouping related fields. Renders a heading + `<Separator>` + content grid.

```tsx
<FormSection title="Basic Info" subtitle="Fill in the required fields">
  <FormField label="Name" htmlFor="name" required>
    <Input id="name" />
  </FormField>
</FormSection>
```

---

### `FormField`

Label above + control + helper/error text below.

```tsx
<FormField label="Email" htmlFor="email" required helper="We'll never share it" error="Required">
  <Input id="email" type="email" />
</FormField>
```

- Error state: label turns `text-danger-text`, helper replaced by error in `text-danger-text`
- Required asterisk: `text-danger` (red `*`)

---

### `FormGrid`

Responsive column grid for field rows.

```tsx
<FormGrid cols={2}>
  <FormField .../>
  <FormField .../>
</FormGrid>
```

| `cols` | Grid |
|---|---|
| `1` | `grid-cols-1` always |
| `2` (default) | `grid-cols-1 sm:grid-cols-2` |
| `3` | `grid-cols-1 sm:grid-cols-3` |

---

### `FormActions`

Cancel + Save button row, flush to logical end. Shows spinner inside Save when `saving={true}`.

```tsx
<FormActions
  onCancel={fn}
  onSave={fn}
  saveLabel="Create"
  saving={false}
  disabled={false}
  start={<DeleteButton />}
/>
```

- `start` renders on the logical start of the row (e.g. Delete button)
- Falls back to `t("common:cancel")` / `t("common:save")` for labels
- Save uses `min-w-24` so it doesn't shrink during spinner state

---

### `MiniChart` — Sparkline & Gauge Suite

All charts resolve CSS color tokens to real values via a temporary DOM element (adapts to theme/mode changes at runtime).

#### `SparkArea`
```tsx
<SparkArea data={[10,20,15,30]} tone="brand" height={48} />
```
Inline area chart with gradient fill. `tone`: `brand | success | warning | danger`.

#### `SparkBar`
```tsx
<SparkBar data={[10,20,15,30]} tone="success" height={48} />
```
Mini bar chart. `fillOpacity={0.55}`, `radius={[2,2,0,0]}`.

#### `RadialGauge`
Half-donut (180°→0°) percentage gauge with center label.
```tsx
<RadialGauge value={74} label="Utilization" tone="brand" size={120} />
```
- `value`: 0–100, clamped
- Center text: `text-xl font-bold tabular-nums`
- Track: `hsl(var(--border))`

#### `DonutGauge`
Full 360° multi-slice donut with center value.
```tsx
<DonutGauge
  slices={[{ label: "A", value: 60, tone: "brand" }, { label: "B", value: 40, tone: "success" }]}
  centerLabel="Total"
  centerValue="5,230"
  size={140}
/>
```

---

### `PageHeader`

Page-level heading with breadcrumb, title, subtitle, and actions slot.

```tsx
<PageHeader
  title="Invoices"
  subtitle="Manage all sales invoices"
  actions={<Button>New Invoice</Button>}
  crumbLabel="INV-001"    // null on list pages
  crumbLoading={false}
/>
```

- `h1 text-xl font-semibold`
- Breadcrumb auto-built via `useBreadcrumb` hook; shows skeleton when `crumbLoading`
- Actions: `flex items-center gap-2 shrink-0`

---

### `PageSection`

Card container with optional title/actions header. The standard wrapper for table sections, form blocks, etc.

```tsx
<PageSection title="Recent Orders" actions={<Button>Export</Button>} padded={false}>
  <DataTable ... />
</PageSection>
```

| Prop | Type | Default |
|---|---|---|
| `title` | string | optional |
| `subtitle` | string | optional |
| `actions` | ReactNode | optional |
| `padded` | boolean | `true` — adds `p-6` to content div |
| `className` | string | optional |

`padded={false}` for full-bleed content (tables, images). Header: `px-6 py-4 border-b`.

---

### `ModuleTabs`

Router-linked tab bar. Uses `NavLink` (not Radix Tabs) so active state derives from URL.

```tsx
<ModuleTabs tabs={[
  { label: "List", href: "/sales/invoices" },
  { label: "Draft", href: "/sales/invoices/draft" },
]} />
```

Visual language matches shadcn `TabsList` + `TabsTrigger`. Active: `bg-background text-foreground shadow-sm`. Scrollable (`overflow-x-auto`) for many tabs.

---

### `EmptyState`

Centered empty illustration + text + optional action.

```tsx
<EmptyState
  icon={Package}
  title="No products yet"
  description="Add your first product to get started"
  action={{ label: "Add Product", onClick: fn }}
/>
```

Layout: `py-16 flex-col items-center gap-4`. Icon box: `h-12 w-12 rounded-lg bg-muted`.

---

### `ErrorState`

Displayed by DataTable on fetch error. Shows error text + optional Retry button.

```tsx
<ErrorState description="Failed to load data" onRetry={fn} />
```

---

### `Skeletons`

#### `TableSkeleton`
```tsx
<TableSkeleton rows={5} cols={4} />
```
Fading pulse bars mimicking a table. Opacity decreases per row for visual depth.

#### `KpiSkeleton`
Single KPI card skeleton: label bar + icon square + value bar.

#### `Skeleton` (base)
```tsx
<Skeleton className="h-4 w-24" />
```
`animate-pulse rounded-md bg-muted`. Use directly for custom loading states.

---

### `Breadcrumb`

Auto-rendered by `PageHeader` via `useBreadcrumb` hook. Links each path segment. Last segment is plain text (not a link). Supports a loading skeleton for dynamic segments.

---

### `OfflineBanner`

Fixed banner shown when the app detects offline state. Not manually instantiated.

---

## 5. Shell Components (`src/components/shell/`)

### `AppShell`

Root layout wrapper. Applies `.app` CSS grid and renders the correct nav based on `layout` setting.

```
layout="sidebar"         → <Sidebar> + <Topbar> + <main>
layout="sidebar-split"   → <SidebarSplit> + <Topbar> + <main>
layout="horizontal"      → <Topbar> (includes HorizontalNav) + <main>
layout="horizontal-dropdown" → same as horizontal
```

`<main>` always: `[grid-area:main] overflow-auto p-6 bg-background`.

---

### `Topbar`

Sticky header, `z-40`, `bg-card/80 backdrop-blur-sm border-b`. Height: `var(--topbar-h)` = 60px.

**Row 1 (always):**

| Element | Condition |
|---|---|
| Hamburger (`Menu`) | Mobile only (`sm:hidden`) — opens `MobileDrawer` |
| Collapse toggle (`PanelLeft`) | Desktop sidebar layouts only |
| Brand wordmark | Horizontal layouts, desktop only |
| Home button | Always |
| `SearchPanel` | Always |
| `QuickAdd` | Always |
| (spacer) | |
| `EtaBadge` | Always |
| Fullscreen button | Desktop only |
| Notifications bell | Always — red dot indicator `bg-danger` |
| `UserMenu` | Always |

**Row 2** (horizontal layouts only): `HorizontalModuleBar` or `HorizontalDropdownModuleBar`

**Row 3** (horizontal only): `HorizontalSubBar`

---

### `Sidebar`

Left nav, `[grid-area:nav] bg-card border-e border-border`. Hidden on mobile.

**Expanded mode:**
- Brand logo + company name in topbar-height header
- Two groups: Core (`MENU_CORE`) and Admin (`MENU_ADMIN`) separated by `GroupHeader`
- Accordion items: expand on click, active module stays open
- Active item: `bg-brand-tint text-brand-text font-medium` + brand left-bar (`before:`)
- "Soon" items: muted, `cursor-not-allowed`, shows `Badge` with "Soon"

**Collapsed mode (mini rail):**
- Icon-only, 72px wide
- Hover tooltip on items without sub-items
- Hover popover flyout on items with sub-items (150ms close delay)

---

### `SidebarSplit`

Two-column sidebar: 72px icon rail + 220px sub-panel. Sub-panel shows module sub-items when a module is active.

---

### `EtaBadge`

ETA connection status indicator in the Topbar.

```tsx
<EtaBadge state="connected" />   // green
<EtaBadge state="syncing" />     // brand + pulse animation
<EtaBadge state="offline" />     // amber
```

Shape: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium` + colored dot.

---

### `UserChip` / `UserMenu`

User avatar + name in Topbar end. Opens a dropdown with profile/settings/logout options.

---

### `SearchPanel`

Global search popover. `w-[min(560px,calc(100vw-2rem))]` — essentially full-width on mobile.

---

### `QuickAdd`

"+ New" outlined button that opens a dropdown of quick-create actions per module.

---

### `MobileDrawer`

RTL-aware slide-in drawer for mobile navigation. Uses `drawer-panel` class for animation.
- LTR: slides from left (`translateX(-100%) → 0`)
- RTL: slides from right (`translateX(100%) → 0`)
- Animation: `0.22s var(--ease)`
- Renders the `Sidebar` in `inDrawer` mode (accordion only, no outer chrome)

---

### `AuthGuard`

Route wrapper that redirects to `/auth/login` if no active session. Wraps the entire app router outlet.

---

## 6. Component Inventory by Directory

```
src/components/
├── ui/                          shadcn / Radix primitives
│   ├── alert-dialog.tsx         Destructive confirm dialog
│   ├── avatar.tsx               Avatar + AvatarImage + AvatarFallback
│   ├── badge.tsx                Pill badge (4 variants)
│   ├── breadcrumb.tsx           shadcn Breadcrumb primitive
│   ├── button.tsx               Button (6 variants × 4 sizes)
│   ├── card.tsx                 Card + CardContent/Header/Footer/Title/Description
│   ├── checkbox.tsx             Radix Checkbox
│   ├── command.tsx              Command palette primitive
│   ├── dialog.tsx               Centered modal
│   ├── dropdown-menu.tsx        Radix DropdownMenu
│   ├── hover-card.tsx           HoverCard
│   ├── input.tsx                Text input
│   ├── label.tsx                Form label
│   ├── navigation-menu.tsx      Horizontal nav (Radix)
│   ├── popover.tsx              Radix Popover
│   ├── radio-group.tsx          Radix RadioGroup
│   ├── scroll-area.tsx          Radix ScrollArea (custom scrollbar)
│   ├── select.tsx               Radix Select
│   ├── separator.tsx            Horizontal/vertical divider
│   ├── sheet.tsx                Side panel (4 sides)
│   ├── skeleton.tsx             Pulse skeleton base
│   ├── sonner.tsx               Toast notifications
│   ├── switch.tsx               Toggle switch
│   ├── table.tsx                Table + all sub-parts
│   ├── tabs.tsx                 Radix Tabs
│   ├── textarea.tsx             Multi-line input
│   └── tooltip.tsx              Radix Tooltip + Provider
│
├── patterns/                    Flexova design patterns
│   ├── Breadcrumb.tsx           Auto-breadcrumb from route
│   ├── Card.tsx                 PageSection alias (re-export)
│   ├── DataTable.tsx            Sortable table + EntityCell + ActionCell
│   ├── EmptyState.tsx           Empty illustration + CTA
│   ├── ErrorState.tsx           Error message + retry
│   ├── FormLayout.tsx           FormSection + FormField + FormGrid + FormActions
│   ├── KpiCard.tsx              Icon KPI card (5 tones)
│   ├── ListRow.tsx              Icon + title/subtitle + trailing + chevron
│   ├── MiniChart.tsx            SparkArea + SparkBar + RadialGauge + DonutGauge
│   ├── ModuleTabs.tsx           Router NavLink tabs
│   ├── OfflineBanner.tsx        Offline state banner
│   ├── PageHeader.tsx           h1 + breadcrumb + actions
│   ├── PageSection.tsx          Card container with header
│   ├── ProgressRow.tsx          Labeled progress bar (4 tones)
│   ├── Skeletons.tsx            TableSkeleton + KpiSkeleton + Skeleton
│   └── StatusPill.tsx           Dot + label badge (10 variants)
│
└── shell/                       App chrome
    ├── AppShell.tsx             Root grid layout switcher
    ├── AuthGuard.tsx            Session-based route guard
    ├── EtaBadge.tsx             ETA connection indicator
    ├── HorizontalNav.tsx        Module bar + sub-bar + dropdown bar
    ├── MobileDrawer.tsx         RTL-aware mobile slide drawer
    ├── QuickAdd.tsx             "+ New" dropdown
    ├── SearchPanel.tsx          Global search popover
    ├── Sidebar.tsx              Accordion sidebar + mini rail
    ├── SidebarSplit.tsx         Rail + sub-panel layout
    ├── Topbar.tsx               Sticky header (60px)
    └── UserChip.tsx             User avatar menu
```

---

## 7. Quick-Reference: Tone / Semantic Color Map

| Tone | bg class | text class | dot/fill class |
|---|---|---|---|
| brand | `bg-brand-tint` | `text-brand-text` | `bg-brand` |
| success | `bg-success-tint` | `text-success-text` | `bg-success` |
| warning | `bg-warning-tint` | `text-warning-text` | `bg-warning` |
| danger | `bg-danger-tint` | `text-danger-text` | `bg-danger` |
| muted | `bg-muted` | `text-muted-foreground` | `bg-muted-foreground` |

---

## 8. Typography Scale (Tailwind `rem` → px at 14px base)

| Tailwind | rem | px (default) |
|---|---|---|
| `text-xs` | 0.75rem | 10.5px |
| `text-sm` | 0.875rem | 12.25px |
| `text-base` | 1rem | 14px |
| `text-lg` | 1.125rem | 15.75px |
| `text-xl` | 1.25rem | 17.5px |
| `text-2xl` | 1.5rem | 21px |

All scale proportionally when `data-font-scale` changes on `<html>`.
