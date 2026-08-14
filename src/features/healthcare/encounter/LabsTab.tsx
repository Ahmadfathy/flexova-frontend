import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { formatMoney } from "@/lib/format";
import { getCatalog } from "@/lib/mock/healthcare";
import type { HcOrder } from "@/features/healthcare/types";

const ORDER_STATUS_VARIANT = {
  pending: "pending", in_progress: "in-progress", ready: "approved", delivered: "approved", issued: "approved",
} as const;

interface LabsTabProps {
  orders: HcOrder[];
  lang: "ar" | "en";
  readOnly: boolean;
  onAddCatalog: (catalogId: string) => void;
  onAddManual: (input: { name_ar: string; price: number; type: "lab" | "radiology" | "procedure" }) => void;
  onRemove: (orderId: string) => void;
}

/** Labs/Radiology tab (spec §4.3.3) — orders here enter the lab queue (§7) and auto-appear as invoice lines. */
export function LabsTab({ orders, readOnly, onAddCatalog, onAddManual, onRemove }: LabsTabProps) {
  const { t } = useTranslation("healthcare");
  const [search, setSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");

  const catalog = useMemo(() => getCatalog().filter((c) => c.active && c.type !== "consult"), []);
  const filtered = useMemo(
    () => catalog.filter((c) => c.name_ar.toLowerCase().includes(search.trim().toLowerCase())),
    [catalog, search]
  );
  const noResults = search.trim().length > 0 && filtered.length === 0;

  function handleManualAdd() {
    const price = Number(manualPrice);
    if (!manualName.trim() || !Number.isFinite(price) || price <= 0) return;
    onAddManual({ name_ar: manualName.trim(), price, type: "procedure" });
    setManualName(""); setManualPrice(""); setSearch("");
  }

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <EmptyState title={t("encounter.labs_empty")} />
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span className="text-sm font-medium text-foreground">{o.name_ar}</span>
              <div className="flex items-center gap-2 shrink-0">
                <StatusPill variant={ORDER_STATUS_VARIANT[o.status]} label={t(`orderStatus.${o.status}`)} />
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(o.id)} aria-label={t("common:delete")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("encounter.labs_search")} />

          {noResults ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t("encounter.labs_no_results")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder={t("encounter.labs_manual_name")} />
                <Input
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder={t("encounter.labs_manual_price")}
                  className="w-28 tabular-nums"
                  inputMode="decimal"
                />
                <Button size="sm" variant="outline" onClick={handleManualAdd}>
                  <Plus className="h-3.5 w-3.5 me-1.5" /> {t("encounter.labs_manual_add")}
                </Button>
              </div>
            </div>
          ) : (
            <Select value="" onValueChange={onAddCatalog}>
              <SelectTrigger><SelectValue placeholder={t("encounter.labs_pick_placeholder")} /></SelectTrigger>
              <SelectContent>
                {filtered.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_ar} — {formatMoney(c.price, "ar")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
