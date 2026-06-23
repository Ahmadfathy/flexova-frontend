import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ['variant', '&:where(html[data-mode="dark"], html[data-mode="dark"] *)'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-active)", "system-ui", "sans-serif"],
      },
      colors: {
        // shadcn canonical (channels → hsl + alpha)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: { DEFAULT: "hsl(var(--card) / <alpha-value>)", foreground: "hsl(var(--card-foreground) / <alpha-value>)" },
        popover: { DEFAULT: "hsl(var(--popover) / <alpha-value>)", foreground: "hsl(var(--popover-foreground) / <alpha-value>)" },
        primary: { DEFAULT: "hsl(var(--primary) / <alpha-value>)", foreground: "hsl(var(--primary-foreground) / <alpha-value>)" },
        secondary: { DEFAULT: "hsl(var(--secondary) / <alpha-value>)", foreground: "hsl(var(--secondary-foreground) / <alpha-value>)" },
        muted: { DEFAULT: "hsl(var(--muted) / <alpha-value>)", foreground: "hsl(var(--muted-foreground) / <alpha-value>)" },
        accent: { DEFAULT: "hsl(var(--accent) / <alpha-value>)", foreground: "hsl(var(--accent-foreground) / <alpha-value>)" },
        destructive: { DEFAULT: "hsl(var(--destructive) / <alpha-value>)", foreground: "hsl(var(--destructive-foreground) / <alpha-value>)" },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        // Flexova extensions — semantics + brand
        brand: { DEFAULT: "hsl(var(--brand) / <alpha-value>)", dark: "hsl(var(--brand-dark) / <alpha-value>)" },
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        danger:  "hsl(var(--danger) / <alpha-value>)",
        "on-brand": "hsl(var(--on-brand) / <alpha-value>)",
        // text-on-tint (full colors — no alpha modifier)
        "brand-text":   "var(--brand-text)",
        "success-text": "var(--success-text)",
        "warning-text": "var(--warning-text)",
        "danger-text":  "var(--danger-text)",
        // tints (full colors)
        "brand-tint":   "var(--brand-tint)",
        "success-tint": "var(--success-tint)",
        "warning-tint": "var(--warning-tint)",
        "danger-tint":  "var(--danger-tint)",
        "info-tint":    "var(--info-tint)",
      },
      borderRadius: {
        lg: "var(--radius)",                          // 14
        md: "calc(var(--radius) - 2px)",              // 12
        sm: "calc(var(--radius) - 4px)",              // 10
      },
      boxShadow: { DEFAULT: "var(--shadow)", sm: "var(--shadow-sm)" },
      // base-4 spacing already in Tailwind: 1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64
      transitionTimingFunction: { brand: "cubic-bezier(.2,.8,.2,1)" },
      keyframes: {
        pulse: { "0%,100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: ".4", transform: "scale(.75)" } },
        popin: { from: { opacity: "0", transform: "translateY(-6px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "eta-pulse": "pulse 1.1s var(--ease,cubic-bezier(.2,.8,.2,1)) infinite",
        popin: "popin .18s var(--ease,cubic-bezier(.2,.8,.2,1))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
