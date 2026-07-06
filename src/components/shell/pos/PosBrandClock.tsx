import { useEffect, useState } from "react";
import { useAppearance } from "@/stores/appearance";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Live date + running clock (ticks every second). Locale-aware wording
 * (ar/en) but forced Latin digits — cash-register clocks read
 * left-to-right regardless of interface language.
 */
export function PosBrandClock() {
  const { lang } = useAppearance();
  const now = useNow();
  const locale = lang === "ar" ? "ar-EG" : "en-US";

  const dateStr = new Intl.DateTimeFormat(locale, {
    weekday: "short", day: "numeric", month: "short",
    numberingSystem: "latn",
  }).format(now);

  const timeStr = new Intl.DateTimeFormat(locale, {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    numberingSystem: "latn",
  }).format(now);

  return (
    <div className="hidden md:flex flex-col leading-tight min-w-0 shrink-0 pe-2 me-1 border-e border-border">
      <span className="text-[11px] text-muted-foreground truncate tabular-nums" dir="ltr">{dateStr}</span>
      <span className="text-sm font-semibold text-foreground tabular-nums" dir="ltr">{timeStr}</span>
    </div>
  );
}
