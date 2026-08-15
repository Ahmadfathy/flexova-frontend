import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Layers } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { usePosTerminalSettings } from "@/stores/posTerminalSettings";
import { GridDensity } from "@/features/pos/GridDensity";
import { getProducts } from "@/lib/mock/play";
import { usePlayChecks } from "@/stores/playChecks";
import type { Check } from "@/features/play/types";

interface CafeteriaOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  check: Check;
}

/**
 * "+ Cafeteria" overlay (FE_15 §5.4). No literal reusable F&B/POS product-grid overlay
 * exists to drop in unchanged — F&B's `OrderMenuGrid` is inline and fixture-bound, and SVC's
 * `ProductPickerDialog` (the actual overlay+density pattern) is itself hard-wired to POS's
 * catalog and documents itself as a parallel fork, not a shared component. This mirrors that
 * exact shape (ModalShell + GridDensity + search + tap-to-add cards) sourced from Play's own
 * `getProducts()`, matching the codebase's own established precedent for this situation.
 */
export function CafeteriaOverlay({ open, onOpenChange, check }: CafeteriaOverlayProps) {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();

  const gridDensity = usePosTerminalSettings((s) => s.gridDensity);
  const setGridDensity = usePosTerminalSettings((s) => s.setGridDensity);
  const addCafeteriaLine = usePlayChecks((s) => s.addCafeteriaLine);

  const [search, setSearch] = useState("");

  const products = useMemo(() => getProducts(), []);
  const filtered = search.trim()
    ? products.filter((p) => p.name_ar.includes(search) || p.name_en.toLowerCase().includes(search.trim().toLowerCase()))
    : products;

  function qtyInCheck(productId: string): number {
    return check.cafeteria_lines.find((l) => l.product_id === productId)?.qty ?? 0;
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("floor.cafeteria_overlay_title")}
      size="lg"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("floor.cafeteria_search_placeholder")} className="ps-9" />
          </div>
          <GridDensity value={gridDensity} onChange={setGridDensity} />
        </div>

        {products.length === 0 ? (
          <EmptyState title={t("floor.cafeteria_no_products")} />
        ) : filtered.length === 0 ? (
          <EmptyState title={t("floor.no_results_title")} description={t("floor.no_results_body")} />
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${gridDensity}, minmax(0, 1fr))` }}
          >
            {filtered.map((product) => {
              const qty = qtyInCheck(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addCafeteriaLine(check.id, product)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 text-center min-h-[96px] transition-colors",
                    "border-border bg-card hover:border-brand/40"
                  )}
                >
                  {product.has_bom && (
                    <span
                      className="absolute top-1.5 start-1.5 h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center"
                      title={t("floor.cafeteria_bom_note")}
                    >
                      <Layers className="h-3 w-3" />
                    </span>
                  )}
                  {qty > 0 && (
                    <Badge className="absolute top-1.5 end-1.5 border-transparent bg-brand text-on-brand px-1.5 min-w-5 justify-center tabular-nums">
                      {qty}
                    </Badge>
                  )}
                  <span className="text-sm font-medium truncate max-w-full">
                    {lang === "ar" ? product.name_ar : product.name_en}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {formatMoney(product.price, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
