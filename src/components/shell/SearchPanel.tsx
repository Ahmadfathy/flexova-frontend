import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  FileText,
  User,
  Package,
  Truck,
  UserCircle,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  mockSearchGlobal,
  getSearchHistory,
  pushSearchHistory,
} from "@/lib/mock/search";
import type { SearchItem, SearchGroup, SearchResultType } from "@/lib/mock/search";

const TYPE_ICON: Record<SearchResultType, LucideIcon> = {
  invoice:  FileText,
  customer: User,
  item:     Package,
  supplier: Truck,
  employee: UserCircle,
};

const TYPE_BOX_CLASS: Record<SearchResultType, string> = {
  invoice:  "bg-brand-tint   text-brand-text",
  customer: "bg-success-tint text-success-text",
  item:     "bg-warning-tint text-warning-text",
  supplier: "bg-danger-tint  text-danger-text",
  employee: "bg-brand-tint/60 text-brand-text",
};

export function SearchPanel() {
  const { t } = useTranslation("shell");
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [history, setHistory] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setGroups([]);
    setSearching(false);
    setHistory(getSearchHistory());
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (!q) {
      setGroups([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await mockSearchGlobal(q);
        setGroups(res.groups);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      pushSearchHistory(item);
      setOpen(false);
      navigate(item.href);
    },
    [navigate],
  );

  const isEmpty = query.trim() === "";
  const hasResults = groups.length > 0;
  const hasHistory = history.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="icon"
          size="icon"
          aria-label={t("topbar.search_open")}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[min(560px,calc(100vw-2rem))] p-0 rounded overflow-hidden"
        align="start"
        sideOffset={8}
        /* Let cmdk auto-focus its input */
        onOpenAutoFocus={e => e.preventDefault()}
      >
        {/*
          shouldFilter={false} — we run our own async search.
          The Command still handles keyboard navigation between items.
        */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("search.placeholder")}
            value={query}
            onValueChange={setQuery}
          />

          <CommandList className="max-h-[360px]">
            {isEmpty ? (
              hasHistory ? (
                <CommandGroup heading={t("search.recently_searched")}>
                  {history.map(item => {
                    const Icon = TYPE_ICON[item.type];
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item)}
                        className="gap-3 px-3 py-2 cursor-pointer"
                      >
                        <span className={cn("shrink-0 flex items-center justify-center w-8 h-8 rounded", TYPE_BOX_CLASS[item.type])}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-sm font-medium leading-5">{item.title}</span>
                          <span className="block truncate text-xs text-muted-foreground num" dir="ltr">{item.subtitle}</span>
                        </span>
                        <Clock className="shrink-0 w-3.5 h-3.5 text-muted-foreground/50" />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null
            ) : searching ? (
              <CommandEmpty>…</CommandEmpty>
            ) : hasResults ? (
              groups.map(group => {
                return (
                  <CommandGroup key={group.type} heading={t(group.labelKey)}>
                    {group.items.map(item => {
                      const Icon = TYPE_ICON[item.type];
                      return (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => handleSelect(item)}
                          className="gap-3 px-3 py-2 cursor-pointer"
                        >
                          <span className={cn("shrink-0 flex items-center justify-center w-8 h-8 rounded", TYPE_BOX_CLASS[item.type])}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block truncate text-sm font-medium leading-5">{item.title}</span>
                            <span className="block truncate text-xs text-muted-foreground num" dir="ltr">{item.subtitle}</span>
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })
            ) : (
              <CommandEmpty>{t("search.no_results")}</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
