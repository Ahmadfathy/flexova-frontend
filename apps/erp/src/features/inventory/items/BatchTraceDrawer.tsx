/**
 * DD-2 §2.10 — Traceability view: a batch's full chronological movement
 * timeline (receipt → transfers → issues → quarantine → write-off), read-only.
 * Serves pharma/food recall (business spec: "بضغطة واحدة تعرف كل حبة راحت فين").
 */
import { useTranslation } from "react-i18next";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { EmptyState } from "@/components/patterns/EmptyState";
import type { InventoryLedgerRow, InventoryWarehouse, StockBatch } from "./types";

const TYPE_KEY: Record<string, string> = {
  opening: "type_opening", receipt: "type_receipt", issue: "type_issue",
  transfer_in: "type_transfer_in", transfer_out: "type_transfer_out",
  adjustment: "type_adj", in: "type_in", out: "type_out", transfer: "type_transfer", stocktake: "type_stocktake",
};

interface BatchTraceDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  batch: StockBatch | null;
  ledger: InventoryLedgerRow[];
  warehouses: InventoryWarehouse[];
  lang: "ar" | "en";
}

export function BatchTraceDrawer({ open, onOpenChange, batch, ledger, warehouses, lang }: BatchTraceDrawerProps) {
  const { t } = useTranslation("inventory");
  const rows = batch
    ? [...ledger.filter((m) => m.batch_id === batch.id)].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    : [];

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("batch.trace")}
      description={batch ? `${batch.lot_number} · ${batch.expiry_date ?? "—"}` : undefined}
      size="md"
    >
      {rows.length === 0 ? (
        <EmptyState title={t("batch.empty")} description="" />
      ) : (
        <ol className="relative space-y-4 ps-4 border-s border-border">
          {rows.map((m) => {
            const wh = warehouses.find((w) => w.id === m.warehouse_id);
            return (
              <li key={m.id} className="relative">
                <span className={`absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full ${m.qty < 0 ? "bg-danger" : "bg-success"}`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{t(`ledger.${TYPE_KEY[m.type] ?? "type_opening"}`)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{m.date}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lang === "ar" ? wh?.name_ar : wh?.name_en} · {m.source_ref} · {m.user}
                </p>
                <p className={`text-sm tabular-nums ${m.qty < 0 ? "text-destructive" : ""}`}>{m.qty}</p>
              </li>
            );
          })}
        </ol>
      )}
    </DrawerShell>
  );
}
