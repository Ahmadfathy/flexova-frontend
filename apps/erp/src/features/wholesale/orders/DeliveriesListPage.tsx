import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Receipt, Truck } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { StatusPill } from "@/components/patterns/StatusPill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useWholesaleDeliveryNotes } from "@/stores/wholesaleDeliveryNotes";
import { useWholesaleOrders } from "@/stores/wholesaleOrders";
import { useWholesaleCustomers } from "@/stores/wholesaleCustomers";
import { getWarehouses } from "@/lib/mock/wholesale";
import type { WholesaleInvoicePrefillLine } from "./wholesaleInvoicing";

export function DeliveriesListPage() {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const navigate = useNavigate();

  const notes = useWholesaleDeliveryNotes((s) => s.notes);
  const orders = useWholesaleOrders((s) => s.orders);
  const customers = useWholesaleCustomers((s) => s.customers);
  const warehouses = useMemo(() => getWarehouses(), []);

  const orderMap = useMemo(() => Object.fromEntries(orders.map((o) => [o.id, o])), [orders]);
  const customerMap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function invoiceSelected() {
    if (selected.size === 0) {
      toast.error(t("deliveries.error_no_selection"));
      return;
    }
    const selectedNotes = notes.filter((n) => selected.has(n.id));
    if (selectedNotes.some((n) => n.invoice_id)) {
      toast.error(t("deliveries.error_already_invoiced"));
      return;
    }

    const customerIds = new Set(
      selectedNotes.map((n) => orderMap[n.order_id]?.customer_id).filter(Boolean),
    );
    if (customerIds.size !== 1) {
      toast.error(t("deliveries.error_mixed_customers"));
      return;
    }
    const customerId = [...customerIds][0] as string;
    const firstOrder = orderMap[selectedNotes[0].order_id];

    const lineMap = new Map<string, WholesaleInvoicePrefillLine>();
    for (const note of selectedNotes) {
      const order = orderMap[note.order_id];
      for (const line of note.lines) {
        const key = `${line.item_id}|${line.uom_id}`;
        const orderLine = order?.lines.find((l) => l.item_id === line.item_id);
        const existing = lineMap.get(key);
        if (existing) {
          existing.qty += line.qty_picked;
        } else {
          lineMap.set(key, {
            item_id: line.item_id,
            qty: line.qty_picked,
            uom_id: line.uom_id,
            price: orderLine?.unit_price ?? 0,
            tax_type_id: orderLine?.tax_type_id ?? "tax_t1",
          });
        }
      }
    }

    const orderIds = [...new Set(selectedNotes.map((n) => n.order_id))];
    const noteNumbers = selectedNotes.map((n) => n.number).join(", ");

    navigate("/sales/invoices/new", {
      state: {
        wholesalePrefill: {
          customerId,
          warehouseId: firstOrder?.warehouse_id ?? "",
          note: `${t("deliveries.title")}: ${noteNumbers}`,
          lines: [...lineMap.values()],
          orderIds,
          deliveryNoteIds: [...selected],
        },
      },
    });
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("deliveries.title")}
        count={notes.length > 0 ? t("deliveries.count", { n: notes.length }) : undefined}
        actions={
          <Button size="sm" onClick={invoiceSelected} disabled={selected.size === 0}>
            <Receipt className="h-4 w-4 me-1.5" />
            {t("deliveries.action_invoice")}
          </Button>
        }
      />

      <PageSection padded={false}>
        {notes.length === 0 ? (
          <EmptyState icon={Truck} title={t("deliveries.no_notes")} description="" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-10" />
                <TableHead className="text-xs">{t("deliveries.col_number")}</TableHead>
                <TableHead className="text-xs">{t("deliveries.col_order")}</TableHead>
                <TableHead className="text-xs">{t("orders.col_customer")}</TableHead>
                <TableHead className="text-xs">{t("deliveries.col_date")}</TableHead>
                <TableHead className="text-xs">{t("deliveries.col_warehouse")}</TableHead>
                <TableHead className="text-xs">{t("deliveries.col_receiver")}</TableHead>
                <TableHead className="text-xs">{t("deliveries.col_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => {
                const order = orderMap[note.order_id];
                const warehouse = warehouseMap[note.warehouse_id];
                const invoiceable = note.status === "delivered" && !note.invoice_id;
                return (
                  <TableRow key={note.id} className="border-b border-border last:border-0">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(note.id)}
                        disabled={!invoiceable}
                        onCheckedChange={() => toggle(note.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums" dir="ltr">{note.number}</TableCell>
                    <TableCell
                      className="text-sm text-brand cursor-pointer hover:underline"
                      onClick={() => navigate(`/wholesale/orders/${note.order_id}`)}
                    >
                      {order?.number ?? note.order_id}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const c = order ? customerMap[order.customer_id] : undefined;
                        return c ? (lang === "ar" ? c.name_ar : c.name_en) : "—";
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">{formatDate(note.date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{warehouse ? (lang === "ar" ? warehouse.name_ar : warehouse.name_en) : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{note.receiver_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusPill
                          variant={note.status === "delivered" ? "approved" : "default"}
                          label={t(`deliveries.status_${note.status}`)}
                        />
                        {note.invoice_id && (
                          <Badge variant="outline" className="text-[10px] text-success-text border-success/30">
                            {t("deliveries.invoiced_badge")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </PageSection>
    </div>
  );
}
