import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Check, Upload, X } from "lucide-react";
import { useAppearance, type Layout, type Mode, type FontScale, type FontAr, type FontEn, type Theme } from "@/stores/appearance";
import { cn } from "@/lib/utils";
import { PageSection } from "@/components/patterns/PageSection";

/* ── Option card (layout + mode) ─────────────────────────────── */
function OptionCard({
  label, description, selected, onClick, preview,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  preview: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 p-3 rounded-lg border-2 text-start transition-all hover:border-brand/50",
        selected ? "border-brand bg-brand-tint" : "border-border bg-card hover:bg-background"
      )}
    >
      <div className="w-full h-20 rounded-md overflow-hidden bg-background border border-border">
        {preview}
      </div>
      <div>
        <p className={cn("text-xs font-semibold", selected ? "text-brand-text" : "text-foreground")}>
          {label}
        </p>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {selected && <Check className="h-3.5 w-3.5 text-brand self-end mt-auto" />}
    </button>
  );
}

/* ── Layout previews (mini SVG diagrams) ─────────────────────── */
const LayoutPreviews: Record<Layout, React.ReactNode> = {
  sidebar: (
    <svg viewBox="0 0 80 48" className="w-full h-full" aria-hidden>
      <rect x="0" y="0" width="18" height="48" rx="2" fill="currentColor" className="text-muted/20" />
      <rect x="0" y="0" width="80" height="10" rx="0" fill="currentColor" className="text-muted/10" />
      <rect x="22" y="14" width="50" height="6" rx="2" fill="currentColor" className="text-muted/15" />
      <rect x="22" y="24" width="38" height="4" rx="2" fill="currentColor" className="text-muted/10" />
      <rect x="22" y="32" width="44" height="4" rx="2" fill="currentColor" className="text-muted/10" />
    </svg>
  ),
  "sidebar-split": (
    <svg viewBox="0 0 80 48" className="w-full h-full" aria-hidden>
      <rect x="0" y="0" width="10" height="48" rx="2" fill="currentColor" className="text-muted/20" />
      <rect x="12" y="0" width="22" height="48" rx="2" fill="currentColor" className="text-muted/10" />
      <rect x="0" y="0" width="80" height="10" rx="0" fill="currentColor" className="text-muted/10" />
      <rect x="36" y="14" width="36" height="6" rx="2" fill="currentColor" className="text-muted/15" />
      <rect x="36" y="24" width="28" height="4" rx="2" fill="currentColor" className="text-muted/10" />
    </svg>
  ),
  horizontal: (
    <svg viewBox="0 0 80 48" className="w-full h-full" aria-hidden>
      <rect x="0" y="0" width="80" height="16" rx="2" fill="currentColor" className="text-muted/20" />
      <rect x="6" y="20" width="68" height="6" rx="2" fill="currentColor" className="text-muted/15" />
      <rect x="6" y="30" width="52" height="4" rx="2" fill="currentColor" className="text-muted/10" />
      <rect x="6" y="38" width="60" height="4" rx="2" fill="currentColor" className="text-muted/10" />
    </svg>
  ),
  "horizontal-dropdown": (
    /* 2-row header: topbar + module bar; dropdown panel visible below active tab */
    <svg viewBox="0 0 80 48" className="w-full h-full" aria-hidden>
      {/* Topbar row */}
      <rect x="0" y="0" width="80" height="11" fill="currentColor" className="text-muted/20" />
      {/* Module bar row */}
      <rect x="0" y="12" width="80" height="8" fill="currentColor" className="text-muted/10" />
      {/* Active module underline indicator */}
      <rect x="4" y="18" width="16" height="2" rx="1" fill="currentColor" className="text-brand/60" />
      {/* Dropdown panel */}
      <rect x="4" y="22" width="26" height="18" rx="2" fill="currentColor" className="text-muted/20" />
      <rect x="7" y="26" width="16" height="2.5" rx="1" fill="currentColor" className="text-muted/40" />
      <rect x="7" y="30.5" width="12" height="2.5" rx="1" fill="currentColor" className="text-muted/25" />
      <rect x="7" y="35" width="18" height="2.5" rx="1" fill="currentColor" className="text-muted/25" />
      {/* Content area hint */}
      <rect x="4" y="43" width="48" height="3" rx="1" fill="currentColor" className="text-muted/10" />
    </svg>
  ),
};

/* ── Theme swatch ────────────────────────────────────────────── */
const THEME_COLORS: Record<Theme, string> = {
  nile:     "hsl(224 76% 48%)",
  emerald:  "hsl(161 94% 30%)",
  graphite: "hsl(215 19% 35%)",
};

/* ── Main page ───────────────────────────────────────────────── */
export function AppearanceSettings() {
  const { t } = useTranslation("settings");
  const {
    layout, setLayout,
    theme, setTheme,
    mode, setMode,
    fontScale, setFontScale,
    fontAr, setFontAr,
    fontEn, setFontEn,
    branding, setBranding,
  } = useAppearance();

  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBranding({ logoUrl: url });
  };

  const LAYOUTS: { value: Layout; labelKey: string; descKey: string }[] = [
    { value: "sidebar",              labelKey: "layout_sidebar",             descKey: "layout_sidebar_desc" },
    { value: "sidebar-split",        labelKey: "layout_split",               descKey: "layout_split_desc" },
    { value: "horizontal",           labelKey: "layout_horizontal",          descKey: "layout_horizontal_desc" },
    { value: "horizontal-dropdown",  labelKey: "layout_horizontal_dropdown", descKey: "layout_horizontal_dropdown_desc" },
  ];

  const MODES: { value: Mode; labelKey: string }[] = [
    { value: "system", labelKey: "mode_system" },
    { value: "light",  labelKey: "mode_light" },
    { value: "dark",   labelKey: "mode_dark" },
  ];

  const FONT_SCALES: { value: FontScale; labelKey: string }[] = [
    { value: "sm", labelKey: "font_sm" },
    { value: "md", labelKey: "font_md" },
    { value: "lg", labelKey: "font_lg" },
  ];

  const segmentCls = (active: boolean) =>
    cn(
      "flex-1 h-8 text-xs font-medium rounded-sm border transition-colors",
      active
        ? "bg-brand-tint text-brand-text border-brand/30"
        : "border-border text-muted-foreground hover:bg-background hover:text-foreground"
    );

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-bold">{t("appearance.title")}</h1>
      </div>

      {/* Layout */}
      <PageSection title={t("appearance.layout")}>
        <div className="grid grid-cols-2 gap-3">
          {LAYOUTS.map(({ value, labelKey, descKey }) => (
            <OptionCard
              key={value}
              label={t(`appearance.${labelKey}`)}
              description={t(`appearance.${descKey}`)}
              selected={layout === value}
              onClick={() => setLayout(value)}
              preview={LayoutPreviews[value]}
            />
          ))}
        </div>
      </PageSection>

      {/* Color theme */}
      <PageSection title={t("appearance.theme")}>
        <div className="flex gap-3 flex-wrap">
          {(Object.keys(THEME_COLORS) as Theme[]).map(th => (
            <button
              key={th}
              onClick={() => setTheme(th)}
              className={cn(
                "flex items-center gap-2 h-10 px-4 rounded-sm border-2 text-sm font-medium transition-all",
                theme === th
                  ? "border-brand bg-brand-tint text-brand-text"
                  : "border-border bg-card text-foreground hover:border-brand/40"
              )}
            >
              <span
                className="h-4 w-4 rounded-full shrink-0"
                style={{ background: THEME_COLORS[th] }}
              />
              {t(`appearance.theme_${th}`)}
            </button>
          ))}
        </div>
      </PageSection>

      {/* Mode */}
      <PageSection title={t("appearance.mode")}>
        <div className="flex gap-1 p-1 bg-muted rounded-sm w-fit">
          {MODES.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={cn(
                "h-8 px-4 text-sm font-medium rounded-sm transition-colors",
                mode === value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(`appearance.${labelKey}`)}
            </button>
          ))}
        </div>
      </PageSection>

      {/* Font size */}
      <PageSection title={t("appearance.font_size")}>
        <div className="flex gap-1">
          {FONT_SCALES.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => setFontScale(value)}
              className={segmentCls(fontScale === value)}
            >
              {t(`appearance.${labelKey}`)}
            </button>
          ))}
        </div>
      </PageSection>

      {/* Fonts */}
      <PageSection title={`${t("appearance.font_ar")} · ${t("appearance.font_en")}`}>
        <div className="grid grid-cols-2 gap-4">
          {/* Arabic font */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("appearance.font_ar")}</p>
            <div className="flex flex-col gap-1">
              {(["plex-arabic", "cairo"] as FontAr[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFontAr(f)}
                  className={cn(
                    "flex flex-col items-start h-auto py-2 px-3 rounded-sm border text-start transition-colors",
                    fontAr === f
                      ? "border-brand bg-brand-tint"
                      : "border-border hover:border-brand/40 bg-card"
                  )}
                >
                  <span className={cn("text-xs font-semibold", fontAr === f ? "text-brand-text" : "text-foreground")}>
                    {f === "plex-arabic" ? t("appearance.font_ar_plex") : t("appearance.font_ar_cairo")}
                  </span>
                  <span
                    className="text-sm mt-0.5 text-muted-foreground"
                    style={{ fontFamily: f === "plex-arabic" ? '"IBM Plex Sans Arabic"' : '"Cairo"' }}
                  >
                    {t("appearance.font_preview")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* English font */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("appearance.font_en")}</p>
            <div className="flex flex-col gap-1">
              {(["inter", "plex-sans"] as FontEn[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFontEn(f)}
                  className={cn(
                    "flex flex-col items-start h-auto py-2 px-3 rounded-sm border text-start transition-colors",
                    fontEn === f
                      ? "border-brand bg-brand-tint"
                      : "border-border hover:border-brand/40 bg-card"
                  )}
                >
                  <span className={cn("text-xs font-semibold", fontEn === f ? "text-brand-text" : "text-foreground")}>
                    {f === "inter" ? t("appearance.font_en_inter") : t("appearance.font_en_plex")}
                  </span>
                  <span
                    className="text-sm mt-0.5 text-muted-foreground"
                    style={{ fontFamily: f === "inter" ? '"Inter"' : '"IBM Plex Sans"' }}
                  >
                    {t("appearance.font_preview")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </PageSection>

      {/* Branding */}
      <PageSection title={t("appearance.branding")}>
        <div className="space-y-4">
          {/* Logo */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t("appearance.logo")}</p>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-md border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                {branding.logoUrl
                  ? <img src={branding.logoUrl} alt="logo" className="h-full w-full object-contain" />
                  : <span className="text-2xl font-bold text-brand select-none">F</span>
                }
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogo}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-border bg-card text-xs font-medium text-foreground hover:bg-background transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t("appearance.logo_upload")}
                </button>
                {branding.logoUrl && (
                  <button
                    onClick={() => setBranding({ logoUrl: null })}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-border bg-card text-xs font-medium text-danger-text hover:bg-danger-tint transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("appearance.logo_remove")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Company name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              {t("appearance.company_name")}
            </label>
            <input
              type="text"
              value={branding.companyName}
              onChange={e => setBranding({ companyName: e.target.value })}
              placeholder={t("appearance.company_placeholder")}
              className="w-full h-9 px-3 rounded-sm border border-border bg-background text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>
        </div>
      </PageSection>
    </div>
  );
}
