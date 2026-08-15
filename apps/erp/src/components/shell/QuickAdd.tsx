import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MENU, type MenuItem } from "@/config/menu";
import { QUICK_ADD, type QuickAddAction } from "@/config/quickAdd";
import { useCan } from "@/lib/permissions";
import { isFlagEnabled } from "@/lib/flags";
import { useCreateDispatcher } from "@/stores/createDispatcher";

interface QuickAddGroup {
  module: MenuItem;
  actions: QuickAddAction[];
}

function useQuickAddGroups(can: ReturnType<typeof useCan>): QuickAddGroup[] {
  const allowed = QUICK_ADD.filter(
    a => can(a.permission ?? "") && isFlagEnabled(a.moduleFlag)
  );
  return MENU
    .map(m => ({ module: m, actions: allowed.filter(a => a.group === m.key) }))
    .filter(g => g.actions.length > 0);
}

export function QuickAdd() {
  const { t } = useTranslation("shell");
  const navigate = useNavigate();
  const can = useCan();
  const openCreate = useCreateDispatcher(s => s.openCreate);
  const [open, setOpen] = useState(false);
  const groups = useQuickAddGroups(can);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (el.isContentEditable) return;
      e.preventDefault();
      setOpen(v => !v);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleAction = useCallback(
    (action: QuickAddAction) => {
      setOpen(false);
      if (action.method === "page") {
        navigate(action.route!);
      } else {
        openCreate(action.key);
      }
    },
    [navigate, openCreate]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("quick_add.trigger")}
          aria-expanded={open}
          className="shrink-0 h-9 px-2 sm:px-2.5 sm:gap-1.5"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline text-xs">{t("quick_add.btn_label")}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-[min(520px,calc(100vw-1rem))] p-0"
        onCloseAutoFocus={e => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-sm font-semibold">{t("quick_add.title")}</span>
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground select-none">
            C
          </kbd>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px p-3">
            {groups.map(({ module, actions }) => (
              <div key={module.key} className="p-2">
                <DropdownMenuLabel className="flex items-center gap-1.5 px-1 pb-1.5 pt-0">
                  <module.icon className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 truncate">
                    {t(`nav.${module.key}`)}
                  </span>
                </DropdownMenuLabel>

                <div className="space-y-0.5">
                  {actions.map(action => (
                    <DropdownMenuItem
                      key={action.key}
                      onClick={() => handleAction(action)}
                      className="h-8 px-2 gap-2 text-sm text-muted-foreground cursor-pointer"
                    >
                      <action.icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{t(`quick_add.${action.key}`)}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
