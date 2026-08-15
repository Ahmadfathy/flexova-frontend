import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, LogOut, Palette, Sun, Moon } from "lucide-react";
import { useAppearance } from "@/stores/appearance";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  name?: string;
  role?: string;
  branch?: string;
  avatarUrl?: string;
}

export function UserMenu({
  name = "أحمد فتحي",
  role = "مدير",
  branch = "الفرع الرئيسي",
  avatarUrl,
}: UserMenuProps) {
  const { t } = useTranslation("shell");
  const { lang, setLang, mode, setMode } = useAppearance();
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const [sysDark, setSysDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSysDark(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const isDark = mode === "dark" || (mode === "system" && sysDark);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-7 w-7">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-start leading-tight">
            <p className="text-xs font-semibold">{name}</p>
            <p className="text-[10px] text-muted-foreground">{branch}</p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 p-2">
        {/* User info header — non-interactive */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="leading-tight min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{role} · {branch}</p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2 text-muted-foreground">
          <User className="h-4 w-4 shrink-0" />
          {t("user.profile")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Language toggle — custom section, not a DropdownMenuItem */}
        <div className="px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
            {t("user.language")}
          </p>
          <div className="flex gap-1">
            {(["ar", "en"] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "flex-1 h-8 rounded text-xs font-medium transition-colors border",
                  lang === l
                    ? "bg-brand-tint text-brand-text border-brand/30"
                    : "border-border text-muted-foreground hover:bg-background hover:text-foreground"
                )}
              >
                {l === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
        </div>

        {/* Dark mode toggle — custom section */}
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {t("user.dark_mode")}
            </div>
            <button
              onClick={() => setMode(isDark ? "light" : "dark")}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded border-2 border-transparent transition-colors",
                isDark ? "bg-brand" : "bg-muted-foreground/30"
              )}
              role="switch"
              aria-checked={isDark}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded bg-white shadow-sm ring-0 transition-transform",
                  isDark ? "translate-x-4 rtl:-translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="gap-2 text-muted-foreground">
          <Link to="/settings/appearance">
            <Palette className="h-4 w-4 shrink-0" />
            {t("user.appearance")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2 text-danger-text focus:text-danger-text focus:bg-danger-tint">
          <LogOut className="h-4 w-4 shrink-0" />
          {t("user.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { UserMenu as UserChip };
