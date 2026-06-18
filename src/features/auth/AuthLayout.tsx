import { Outlet } from "react-router-dom";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/stores/appearance";

function ModeIcon({ mode }: { mode: "system" | "light" | "dark" }) {
  if (mode === "dark")   return <Moon   className="h-4 w-4" />;
  if (mode === "light")  return <Sun    className="h-4 w-4" />;
  return                        <Monitor className="h-4 w-4" />;
}

function BrandLogo() {
  const { branding } = useAppearance();
  const { t } = useTranslation("common");

  if (branding.logoUrl) {
    return (
      <img
        src={branding.logoUrl}
        alt={branding.companyName || t("app_name")}
        className="h-12 object-contain"
      />
    );
  }

  const name = branding.companyName || t("app_name");

  return (
    <div className="flex items-center gap-2.5">
      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
        <span className="text-primary-foreground font-bold text-lg leading-none">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
      <span className="text-xl font-bold tracking-tight">{name}</span>
    </div>
  );
}

export function AuthLayout() {
  const { t }             = useTranslation("auth");
  const { lang, setLang, mode, setMode } = useAppearance();

  const toggleLang = () => setLang(lang === "ar" ? "en" : "ar");
  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Controls — top trailing corner */}
      <div className="fixed top-4 end-4 flex items-center gap-1.5 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={toggleLang}
        >
          {t("switch_lang")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={toggleMode}
          title={t("theme_toggle")}
        >
          <ModeIcon mode={mode} />
        </Button>
      </div>

      {/* Content column */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <BrandLogo />
        </div>

        {/* Card — each auth page renders its own CardHeader / CardContent / CardFooter */}
        <Card className="shadow-md">
          <Outlet />
        </Card>
      </div>
    </div>
  );
}
