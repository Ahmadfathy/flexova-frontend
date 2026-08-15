import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, PackageCheck, Lock, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useWholesaleOrders } from "@/stores/wholesaleOrders";
import { useWholesaleDeliveryNotes, nextDeliveryNoteNumber } from "@/stores/wholesaleDeliveryNotes";
import { useWholesaleStockMovements } from "@/stores/wholesaleStockMovements";
import { getItems, getWarehouses } from "@/lib/mock/wholesale";
import { toBase, fromBase } from "@/lib/wholesale/pricing";
import { getAvailableStockBase } from "@/lib/wholesale/stock";
import type { DeliveryNote, DeliveryNoteLine, SalesOrderStatus } from "@/types/wholesale";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Sum of qty_picked (in `targetUom`) for `itemId` across a set of delivery notes. */
function sumPicked(itemId: string, notes: DeliveryNote[], targetUom: string): number {
  return notes.reduce((sum, note) => {
    const line = note.lines.find((l) => l.item_id === itemId);
    if (!line) return sum;
    return sum + fromBase(toBase(line.qty_picked, line.uom_id), targetUom);
  }, 0);
}

export function OrderPickPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();

  const orders = useWholesaleOrders((s) => s.orders);
  const updateOrder = useWholesaleOrders((s) => s.updateOrder);
  const order = orders.find((o) => o.id === id);

  const notes = useWholesaleDeliveryNotes((s) => s.notes);
  const addNote = useWholesaleDeliveryNotes((s) => s.addNote);
  const updateNote = useWholesaleDeliveryNotes((s) => s.updateNote);

  const stockEntries = useWholesaleStockMovements((s) => s.entries);
  const addIssue = useWholesaleStockMovements((s) => s.addIssue);

  const items = useMemo(() => getItems(), []);
  const warehouses = useMemo(() => getWarehouses(), []);

  const notesForOrder = useMemo(() => notes.filter((n) => n.order_id === id), [notes, id]);
  const deliveredNotes = useMemo(() => notesForOrder.filter((n) => n.status === "delivered"), [notesForOrder]);
  const draftNote = useMemo(() => notesForOrder.find((n) => n.status === "draft"), [notesForOrder]);

  const [date, setDate] = useState(draftNote?.date ?? todayStr());
  const [receiverName, setReceiverName] = useState(draftNote?.receiver_name ?? "");
  const [noteText, setNoteText] = useState(draftNote?.note ?? "");
  const [picked, setPicked] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (!order) return init;
    for (const line of order.lines) {
      const alreadyDelivered = sumPicked(line.item_id, deliveredNotes, line.uom_id);
      const remaining = Math.max(round2(line.qty - alreadyDelivered), 0);
      const draftLine = draftNote?.lines.find((l) => l.item_id === line.item_id);
      init[line.item_id] = draftLine ? draftLine.qty_picked : remaining;
    }
    return init;
  });

  const blocked = !!order && (order.status === "draft" || order.status === "cancelled");
  const warehouse = order ? warehouses.find((w) => w.id === order.warehouse_id) : undefined;

  const rows = useMemo(() => {
    if (!order) return [];
    return order.lines.map((line) => {
      const item = items.find((i) => i.id === line.item_id);
      const alreadyDelivered = round2(sumPicked(line.item_id, deliveredNotes, line.uom_id));
      const remaining = Math.max(round2(line.qty - alreadyDelivered), 0);
      const issuedBase = stockEntries
        .filter((e) => e.item_id === line.item_id && e.warehouse_id === order.warehouse_id)
        .reduce((s, e) => s + e.qty_base, 0);
      const availableBase = getAvailableStockBase(line.item_id, order.warehouse_id, issuedBase);
      const availableInUom = availableBase == null ? null : fromBase(availableBase, line.uom_id);
      const pickedQty = picked[line.item_id] ?? 0;
      const insufficient = availableInUom != null && pickedQty > availableInUom;
      const outOfRange = pickedQty < 0 || pickedQty > remaining;
      return { line, item, alreadyDelivered, remaining, availableInUom, pickedQty, insufficient, outOfRange };
    });
  }, [order, items, deliveredNotes, stockEntries, picked]);

  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);
  const hasRangeError = rows.some((r) => r.outOfRange);

  if (!order) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("order_pick.title")} />
        <EmptyState icon={PackageCheck} title={t("order_editor.not_found")} description="" />
      </div>
    );
  }

  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  if (blocked) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t("order_pick.title")}
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(`/wholesale/orders/${order.id}`)}>
              <BackIcon className="h-4 w-4 me-1" />
              {t("order_pick.back_to_order")}
            </Button>
          }
        />
        <EmptyState
          icon={Lock}
          title={t("order_pick.guard_blocked_title")}
          description={order.status === "draft" ? t("order_pick.guard_blocked_draft") : t("order_pick.guard_blocked_cancelled")}
        />
      </div>
    );
  }

  function buildNoteLines(): DeliveryNoteLine[] {
    return rows
      .filter((r) => r.pickedQty > 0)
      .map((r) => ({
        item_id: r.line.item_id,
        uom_id: r.line.uom_id,
        qty_ordered: r.line.qty,
        qty_delivered_before: r.alreadyDelivered,
        qty_picked: r.pickedQty,
        qty_remaining: round2(r.remaining - r.pickedQty),
      }));
  }

  function saveDraft() {
    if (!order) return;
    const lines = buildNoteLines();
    if (draftNote) {
      updateNote(draftNote.id, { date, receiver_name: receiverName, note: noteText, lines });
    } else {
      addNote({
        id: crypto.randomUUID(),
        number: nextDeliveryNoteNumber(notes),
        order_id: order.id,
        date,
        warehouse_id: order.warehouse_id,
        status: "draft",
        receiver_name: receiverName,
        note: noteText,
        invoice_id: null,
        lines,
      });
    }
    if (order.status === "approved") {
      updateOrder(order.id, { status: "picking" as SalesOrderStatus });
    }
    toast.success(t("order_pick.saved_draft_toast"));
  }

  function deliver() {
    if (!order) return;
    if (hasRangeError) {
      toast.error(t("order_pick.error_picked_range"));
      return;
    }
    const lines = buildNoteLines();
    const noteId = draftNote?.id ?? crypto.randomUUID();
    const noteObj: DeliveryNote = {
      id: noteId,
      number: draftNote?.number ?? nextDeliveryNoteNumber(notes),
      order_id: order.id,
      date,
      warehouse_id: order.warehouse_id,
      status: "delivered",
      receiver_name: receiverName,
      note: noteText,
      invoice_id: null,
      lines,
    };
    if (draftNote) {
      updateNote(noteId, noteObj);
    } else {
      addNote(noteObj);
    }

    // Stock issue movement (mock) — one per picked line.
    for (const r of rows) {
      if (r.pickedQty > 0) {
        addIssue({ item_id: r.line.item_id, warehouse_id: order.warehouse_id, qty_base: toBase(r.pickedQty, r.line.uom_id), source_ref: noteObj.number });
      }
    }

    // Recompute the order's overall delivered_pct across ALL delivered notes (incl. this one).
    const allDeliveredNotes = [...deliveredNotes, noteObj];
    let totalOrderedBase = 0;
    let totalDeliveredBase = 0;
    for (const line of order.lines) {
      const orderedBase = toBase(line.qty, line.uom_id);
      const deliveredForItemUom = sumPicked(line.item_id, allDeliveredNotes, line.uom_id);
      totalOrderedBase += orderedBase;
      totalDeliveredBase += Math.min(toBase(deliveredForItemUom, line.uom_id), orderedBase);
    }
    const pct = totalOrderedBase > 0 ? Math.round((totalDeliveredBase / totalOrderedBase) * 100) : 0;
    const newStatus: SalesOrderStatus = pct >= 100 ? "delivered" : "partial";
    updateOrder(order.id, { status: newStatus, delivered_pct: pct });

    toast.success(pct >= 100 ? t("order_pick.delivered_full_toast") : t("order_pick.delivered_partial_toast"));
    navigate("/wholesale/deliveries");
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={`${t("order_pick.title")} — ${order.number}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(`/wholesale/orders/${order.id}`)}>
            <BackIcon className="h-4 w-4 me-1" />
            {t("order_pick.back_to_order")}
          </Button>
        }
      />

      {totalRemaining === 0 && (
        <div className="rounded px-3 py-2 text-sm bg-success-tint text-success-text">
          {t("order_pick.fully_delivered_notice")}
        </div>
      )}

      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("order_pick.field_warehouse")}</label>
            <div className="h-10 px-3 flex items-center rounded border border-border bg-muted/30 text-sm text-muted-foreground">
              {warehouse ? (lang === "ar" ? warehouse.name_ar : warehouse.name_en) : "—"}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("order_pick.field_date")}</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("order_pick.field_receiver")}</label>
            <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("order_pick.field_note")}</label>
            <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          </div>
        </div>
      </PageSection>

      <PageSection padded={false}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs">{t("order_pick.col_item")}</TableHead>
              <TableHead className="text-xs w-24">{t("order_pick.col_ordered")}</TableHead>
              <TableHead className="text-xs w-28">{t("order_pick.col_already_delivered")}</TableHead>
              <TableHead className="text-xs w-24">{t("order_pick.col_remaining")}</TableHead>
              <TableHead className="text-xs w-32">{t("order_pick.col_picked")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const name = r.item ? (lang === "ar" ? r.item.name_ar : r.item.name_en) : r.line.item_id;
              return (
                <TableRow key={r.line.item_id} className={cn(r.outOfRange && "bg-danger-tint/30")}>
                  <TableCell className="text-sm font-medium">{name}</TableCell>
                  <TableCell className="tabular-nums text-sm text-muted-foreground">{r.line.qty}</TableCell>
                  <TableCell className="tabular-nums text-sm text-muted-foreground">{r.alreadyDelivered}</TableCell>
                  <TableCell className="tabular-nums text-sm">{r.remaining}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Input
                        type="number" min={0} max={r.remaining} step="any"
                        value={r.pickedQty}
                        onChange={(e) => setPicked((prev) => ({ ...prev, [r.line.item_id]: parseFloat(e.target.value) || 0 }))}
                        className={cn("h-8 text-xs tabular-nums w-24", r.insufficient && "border-danger text-danger")}
                      />
                      <span className={cn("text-[11px]", r.insufficient ? "text-danger-text flex items-center gap-1" : "text-muted-foreground")}>
                        {r.insufficient && <AlertTriangle className="h-3 w-3 shrink-0" />}
                        {r.availableInUom == null ? t("order_pick.stock_unknown") : t("order_pick.stock_available", { qty: round2(r.availableInUom) })}
                      </span>
                      {r.outOfRange && (
                        <span className="text-[11px] text-danger-text">{t("order_pick.error_picked_range")}</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </PageSection>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={saveDraft}>
          <Save className="h-4 w-4 me-1.5" />
          {t("order_pick.save_draft")}
        </Button>
        <Button onClick={deliver} disabled={hasRangeError}>
          <PackageCheck className="h-4 w-4 me-1.5" />
          {t("order_pick.deliver")}
        </Button>
      </div>
    </div>
  );
}
