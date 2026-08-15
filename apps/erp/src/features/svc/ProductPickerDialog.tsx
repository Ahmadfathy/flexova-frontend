import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Search, ScanBarcode, Plus, Check, Flag } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { formatMoney } from "@/lib/format";
import type { Lang } from "@/stores/appearance";
import { useSvcProductStock, effectiveStock } from "@/stores/svcProductStock";
import { useCashierCatalog, type PosItem } from "@/features/pos/useCashierCatalog";
import { GridDensity } from "@/features/pos/GridDensity";
import { usePosTerminalSettings } from "@/stores/posTerminalSettings";
import { getCategoryIcon } from "@/features/pos/categoryIcons";

interface ProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  /** item_id -> qty already on the ticket, so cards can show the same "in cart" badge as POS. */
  qtyInTicket: Record<string, number>;
  onPick: (item: PosItem) => void;
}

/**
 * Product picker for the Service Ticket — same card/search/scanner/density language as FE_09's
 * `CashierGridPage`, but its own grid: `ProductCard`/`useCashierCatalog` read `usePosRegister`
 * directly (a different cart), so this is a parallel implementation against the ticket's own
 * lines (mirrors how F&B's `OrderMenuGrid` forked from the same POS pattern rather than reusing
 * the cashier's cart-bound components).
 */
export function ProductPickerDialog({ open, onOpenChange, lang, qtyInTicket, onPick }: ProductPickerDialogProps) {
  const { t } = useTranslation("svc");
  const { t: tPos } = useTranslation("pos");
  const { items, loading, error, isOffline, reload } = useCashierCatalog();
  const depleted = useSvcProductStock((s) => s.depleted);
  const gridDensity = usePosTerminalSettings((s) => s.gridDensity);
  const setGridDensity = usePosTerminalSettings((s) => s.setGridDensity);

  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sellable = useMemo(() => items.filter((i) => i.sold_by === "unit" && !i.is_model), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sellable;
    return sellable.filter(
      (i) => i.name_ar.includes(q) || i.name_en.toLowerCase().includes(q) || (i.barcode ?? "").includes(q)
    );
  }, [sellable, query]);

  function activate(item: PosItem) {
    if (effectiveStock(item.stock ?? 0, item.item_id, depleted) <= 0) return;
    onPick(item);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const code = query.trim();
    if (!code) return;
    const match = sellable.find((i) => i.barcode === code);
    if (match) { activate(match); setQuery(""); }
  }

  return (
    <ModalShell open={open} onOpenChange={onOpenChange} title={t("ticket.add_product")} size="lg">
      <div className="flex flex-col gap-3 h-[60vh]">
        {isOffline && <OfflineBanner message={tPos("grid.offline_note")} />}

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={tPos("search_placeholder")}
              className="ps-9 h-11 border-2 border-foreground/20 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            aria-label={tPos("scanner")}
            title={tPos("scanner")}
            className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded border-2 border-foreground/20 bg-muted text-foreground hover:border-brand hover:bg-brand-tint hover:text-brand-text transition-colors"
          >
            <ScanBarcode className="h-4 w-4" />
          </button>
          <GridDensity value={gridDensity} onChange={setGridDensity} />
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${gridDensity}, minmax(0, 1fr))` }}>
              {Array.from({ length: gridDensity * 2 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-lg" />)}
            </div>
          ) : error ? (
            <ErrorState title={tPos("grid.error_title")} description={tPos("grid.error_body")} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState title={tPos("grid.no_results_title", { query: query || "—" })} description={tPos("grid.no_results_body")} />
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${gridDensity}, minmax(0, 1fr))` }}>
              {filtered.map((item) => {
                const Icon = getCategoryIcon(item.category);
                const stock = effectiveStock(item.stock ?? 0, item.item_id, depleted);
                const oos = stock <= 0;
                const inTicket = qtyInTicket[item.item_id] ?? 0;
                const name = lang === "ar" ? item.name_ar : item.name_en;
                const etaMissing = item.eta_code === "";

                return (
                  <button
                    key={item.item_id}
                    type="button"
                    disabled={oos}
                    onClick={() => activate(item)}
                    className="group relative flex h-[150px] w-full flex-col overflow-hidden rounded-lg border border-border bg-card p-2 text-start transition-colors hover:border-brand/40 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="relative h-11 w-full shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      {oos && (
                        <span className="absolute inset-x-0 bottom-0 bg-danger-tint text-danger-text text-[9px] font-semibold text-center py-0.5">
                          {tPos("grid.oos")}
                        </span>
                      )}
                    </div>

                    {etaMissing && (
                      <span title={tPos("grid.no_eta_code_hint")} className="inline-flex items-center gap-0.5 rounded bg-warning-tint text-warning-text text-[10px] font-medium px-1 py-0.5 mt-1 self-start">
                        <Flag className="h-2.5 w-2.5" />
                      </span>
                    )}

                    <div className="min-h-0 flex-1 overflow-hidden mt-1">
                      <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{name}</p>
                    </div>

                    <div className="mt-auto flex shrink-0 items-center justify-between gap-1 pt-1.5">
                      <span className="min-w-0 flex-1 text-sm font-bold tabular-nums text-foreground truncate">
                        {formatMoney(item.price ?? 0, lang)}
                      </span>
                      {inTicket > 0 ? (
                        <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center gap-0.5 rounded-full bg-brand px-1.5 text-[11px] font-bold tabular-nums text-on-brand">
                          <Check className="h-3 w-3" />
                          {inTicket}
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-brand-tint group-hover:text-brand-text">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
