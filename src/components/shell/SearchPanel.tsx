import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  SlidersHorizontal,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  mockSearchGlobal,
  getSearchHistory,
  pushSearchHistory,
} from "@/lib/mock/search";
import type { SearchItem, SearchGroup, SearchResultType } from "@/lib/mock/search";

// ─── Type → icon / colour mapping ─────────────────────────────────────────────

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

// ─── Single result row ─────────────────────────────────────────────────────────

function ResultRow({
  item,
  onSelect,
}: {
  item: SearchItem;
  onSelect: (item: SearchItem) => void;
}) {
  const Icon = TYPE_ICON[item.type];
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-start",
        "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
        "transition-colors",
      )}
    >
      {/* Icon box — always at logical start */}
      <span
        className={cn(
          "shrink-0 flex items-center justify-center w-8 h-8 rounded-md",
          TYPE_BOX_CLASS[item.type],
        )}
      >
        <Icon className="w-4 h-4" />
      </span>

      <span className="flex-1 min-w-0">
        <span className="block truncate text-sm font-medium leading-5">
          {item.title}
        </span>
        {/* Code/reference renders LTR with tabular digits regardless of app dir */}
        <span
          className="block truncate text-xs text-muted-foreground num"
          dir="ltr"
        >
          {item.subtitle}
        </span>
      </span>
    </button>
  );
}

// ─── Recent-history row (adds a clock icon on the trailing side) ───────────────

function RecentRow({
  item,
  onSelect,
}: {
  item: SearchItem;
  onSelect: (item: SearchItem) => void;
}) {
  const Icon = TYPE_ICON[item.type];
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-start",
        "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
        "transition-colors",
      )}
    >
      <span
        className={cn(
          "shrink-0 flex items-center justify-center w-8 h-8 rounded-md",
          TYPE_BOX_CLASS[item.type],
        )}
      >
        <Icon className="w-4 h-4" />
      </span>

      <span className="flex-1 min-w-0">
        <span className="block truncate text-sm font-medium leading-5">
          {item.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground num" dir="ltr">
          {item.subtitle}
        </span>
      </span>

      <Clock className="shrink-0 w-3.5 h-3.5 text-muted-foreground/50" />
    </button>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground select-none">
      {label}
    </p>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SearchPanel() {
  const { t } = useTranslation("shell");
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [history, setHistory] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state and load history every time the panel opens
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setGroups([]);
    setSearching(false);
    setHistory(getSearchHistory());
  }, [open]);

  // Debounced search — fires 200 ms after the user stops typing
  useEffect(() => {
    if (!open) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const q = query.trim();
    if (!q) {
      setGroups([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await mockSearchGlobal(q);
        setGroups(res.groups);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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
        /* Override the default w-72 p-4 from popover.tsx */
        className="w-[min(560px,calc(100vw-2rem))] p-0 rounded-lg overflow-hidden"
        align="start"
        sideOffset={8}
        /* Autofocus the input instead of the popover container */
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        {/* ── Search input row ── */}
        <div className="flex items-center gap-2 px-3 h-11 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none"
          />
          <button
            type="button"
            aria-label={t("search.filter")}
            className="shrink-0 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── Results body (scrolls independently, page never scrolls) ── */}
        <ScrollArea className="max-h-[360px]">
          <div className="py-1.5" role="listbox">
            {isEmpty ? (
              /* ── No query: show recent history ── */
              hasHistory ? (
                <>
                  <SectionLabel label={t("search.recently_searched")} />
                  {history.map((item) => (
                    <RecentRow key={item.id} item={item} onSelect={handleSelect} />
                  ))}
                </>
              ) : null
            ) : searching ? (
              /* ── Searching indicator ── */
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                …
              </p>
            ) : hasResults ? (
              /* ── Grouped results ── */
              groups.map((group) => (
                <div key={group.type}>
                  <SectionLabel label={t(group.labelKey)} />
                  {group.items.map((item) => (
                    <ResultRow key={item.id} item={item} onSelect={handleSelect} />
                  ))}
                </div>
              ))
            ) : (
              /* ── No results ── */
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                {t("search.no_results")}
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
