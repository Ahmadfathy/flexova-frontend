import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * BUTTON SYSTEM — tone × variant
 * ─────────────────────────────────────────────────────────────
 * TONES (semantic color — new prop):
 *   primary · secondary · success · info · warning · danger · light · dark
 *
 * VARIANTS (fill style):
 *   solid   → colored bg + contrast text
 *   soft    → tint bg + semantic text
 *   outline → colored border + text, card bg, tint on hover
 *   ghost   → no bg, colored text, tint on hover
 *   link    → underlined text (tone-independent)
 *
 * USAGE CONVENTION
 *   Primary action (one per screen)     → default (or tone=primary solid)
 *   Primary destructive                 → variant="destructive" OR tone=danger solid
 *   Secondary destructive               → tone=danger soft/outline
 *   Secondary actions (export/print)    → variant="outline" OR tone=secondary soft
 *   Tertiary (cancel/close)             → variant="ghost"
 *   Status-driven CTAs                  → success/warning/info/light/dark — intentional, not decorative
 *
 * CONTENT SHAPES
 *   text-only · text+icon (size-4, gap-2, RTL-safe) · icon-only (size="icon")
 *   Icon-only buttons MUST include aria-label for accessibility.
 *
 * BACKWARD COMPATIBILITY
 *   variant="default"      → primary solid      (unchanged)
 *   variant="destructive"  → danger solid        (unchanged)
 *   variant="outline"      → secondary outline   (unchanged; pass tone=* to color it)
 *   variant="ghost"        → neutral ghost       (unchanged; pass tone=* to color it)
 *   variant="secondary"    → secondary soft      (unchanged)
 *   variant="link"         → link                (unchanged)
 *   variant="icon"         → neutral ghost icon  (unchanged)
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // ── New fill styles (colors come from compoundVariants below) ────
        solid:   "",
        soft:    "",

        // ── Outline / ghost — neutral base; tone compounds override ──────
        outline: "border border-input bg-card hover:bg-accent hover:text-accent-foreground",
        ghost:   "hover:bg-accent hover:text-accent-foreground",

        // ── Standalone ───────────────────────────────────────────────────
        link: "text-primary underline-offset-4 hover:underline",

        // ── Legacy aliases (backward-compatible — do not remove) ─────────
        default:     "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-danger text-white hover:bg-danger/90",
        secondary:   "bg-muted text-foreground hover:bg-muted/80",
        icon:        "text-muted-foreground hover:bg-accent hover:text-foreground",
      },

      tone: {
        primary:   "",
        secondary: "",
        success:   "",
        info:      "",
        warning:   "",
        danger:    "",
        light:     "",
        dark:      "",
      },

      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-9 px-3",
        lg:      "h-11 px-8",
        icon:    "h-10 w-10",
      },
    },

    compoundVariants: [
      // ── solid × tone ──────────────────────────────────────────────────
      { variant: "solid", tone: "primary",   class: "bg-brand text-on-brand hover:bg-brand-dark" },
      { variant: "solid", tone: "secondary", class: "bg-muted text-foreground hover:bg-muted/80" },
      { variant: "solid", tone: "success",   class: "bg-success text-white hover:bg-success/90" },
      { variant: "solid", tone: "info",      class: "bg-brand text-on-brand hover:bg-brand-dark" },
      { variant: "solid", tone: "warning",   class: "bg-warning text-white hover:bg-warning/90" },
      { variant: "solid", tone: "danger",    class: "bg-danger text-white hover:bg-danger/90" },
      { variant: "solid", tone: "light",     class: "bg-muted text-foreground hover:bg-muted/80" },
      { variant: "solid", tone: "dark",      class: "bg-foreground text-background hover:bg-foreground/90" },

      // ── soft × tone ───────────────────────────────────────────────────
      { variant: "soft", tone: "primary",   class: "bg-brand-tint text-brand-text hover:bg-brand/15" },
      { variant: "soft", tone: "secondary", class: "bg-muted text-foreground hover:bg-muted/80" },
      { variant: "soft", tone: "success",   class: "bg-success-tint text-success-text hover:bg-success/15" },
      { variant: "soft", tone: "info",      class: "bg-info-tint text-brand-text hover:bg-brand/10" },
      { variant: "soft", tone: "warning",   class: "bg-warning-tint text-warning-text hover:bg-warning/15" },
      { variant: "soft", tone: "danger",    class: "bg-danger-tint text-danger-text hover:bg-danger/15" },
      { variant: "soft", tone: "light",     class: "bg-card text-foreground border border-border hover:bg-muted" },
      { variant: "soft", tone: "dark",      class: "bg-foreground/10 text-foreground hover:bg-foreground/15" },

      // ── outline × tone (semantic colors override neutral base) ────────
      // Semantic token positions (13+) in tailwind.config come after core tokens (1-12),
      // so these compound classes always win the CSS cascade over the neutral base above.
      { variant: "outline", tone: "primary",   class: "border-brand text-brand hover:bg-brand-tint hover:text-brand" },
      { variant: "outline", tone: "secondary", class: "border-border text-foreground hover:bg-muted" },
      { variant: "outline", tone: "success",   class: "border-success text-success-text hover:bg-success-tint hover:text-success-text" },
      { variant: "outline", tone: "info",      class: "border-brand text-brand-text hover:bg-info-tint hover:text-brand-text" },
      { variant: "outline", tone: "warning",   class: "border-warning text-warning-text hover:bg-warning-tint hover:text-warning-text" },
      { variant: "outline", tone: "danger",    class: "border-danger text-danger-text hover:bg-danger-tint hover:text-danger-text" },
      { variant: "outline", tone: "light",     class: "border-border text-foreground hover:bg-muted" },
      { variant: "outline", tone: "dark",      class: "border-foreground/30 text-foreground hover:bg-foreground/10" },

      // ── ghost × tone (semantic colors override neutral base) ──────────
      { variant: "ghost", tone: "primary",   class: "text-brand hover:bg-brand-tint hover:text-brand" },
      { variant: "ghost", tone: "secondary", class: "text-foreground hover:bg-accent" },
      { variant: "ghost", tone: "success",   class: "text-success-text hover:bg-success-tint hover:text-success-text" },
      { variant: "ghost", tone: "info",      class: "text-brand-text hover:bg-info-tint hover:text-brand-text" },
      { variant: "ghost", tone: "warning",   class: "text-warning-text hover:bg-warning-tint hover:text-warning-text" },
      { variant: "ghost", tone: "danger",    class: "text-danger-text hover:bg-danger-tint hover:text-danger-text" },
      { variant: "ghost", tone: "light",     class: "text-muted-foreground hover:bg-accent" },
      { variant: "ghost", tone: "dark",      class: "text-foreground hover:bg-foreground/10" },
    ],

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonTone    = NonNullable<VariantProps<typeof buttonVariants>["tone"]>
export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, tone, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, tone, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
