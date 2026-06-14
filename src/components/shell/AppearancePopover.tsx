import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppearance } from "@/stores/appearance";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-sm px-3 py-1 text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-brand-tint text-brand-text border-brand/30"
          : "border-border text-muted-foreground hover:bg-background"
      )}
    >
      {children}
    </button>
  );
}

const THEMES = ["nile", "emerald", "graphite"] as const;
const THEME_COLORS: Record<string, string> = {
  nile: "hsl(224 76% 48%)",
  emerald: "hsl(161 94% 30%)",
  graphite: "hsl(215 19% 35%)",
};

export function AppearancePopover() {
  const { t } = useTranslation("shell");
  const { theme, mode, nav, density, lang, setTheme, setMode, setNav, setDensity, setLang } = useAppearance();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="icon" size="icon" aria-label={t("appearance.title")}>
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-4">
        <p className="font-semibold text-sm">{t("appearance.title")}</p>

        <OptionGroup label={t("appearance.theme")}>
          {THEMES.map((th) => (
            <button
              key={th}
              onClick={() => setTheme(th)}
              title={th}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                theme === th ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ background: THEME_COLORS[th] }}
            />
          ))}
        </OptionGroup>

        <Separator />

        <OptionGroup label={t("appearance.mode")}>
          {(["system", "light", "dark"] as const).map((m) => (
            <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
              {t(`appearance.mode_${m}`)}
            </Chip>
          ))}
        </OptionGroup>

        <Separator />

        <OptionGroup label={t("appearance.nav")}>
          {(["vertical", "horizontal"] as const).map((n) => (
            <Chip key={n} active={nav === n} onClick={() => setNav(n)}>
              {t(`appearance.nav_${n}`)}
            </Chip>
          ))}
        </OptionGroup>

        <Separator />

        <OptionGroup label={t("appearance.density")}>
          {(["comfortable", "compact"] as const).map((d) => (
            <Chip key={d} active={density === d} onClick={() => setDensity(d)}>
              {t(`appearance.density_${d}`)}
            </Chip>
          ))}
        </OptionGroup>

        <Separator />

        <OptionGroup label={t("appearance.language")}>
          <Chip active={lang === "ar"} onClick={() => setLang("ar")}>{t("appearance.lang_ar")}</Chip>
          <Chip active={lang === "en"} onClick={() => setLang("en")}>{t("appearance.lang_en")}</Chip>
        </OptionGroup>
      </PopoverContent>
    </Popover>
  );
}
