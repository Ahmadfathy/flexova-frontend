import { useTranslation } from "react-i18next";
import { Wand2 } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";

export interface AllocationInvoiceRow {
  id: string;
  number: string;
  date: string;
  total: number;
  outstanding: number;
}

interface AllocationTableProps {
  invoices: AllocationInvoiceRow[];
  amount: number;
  allocations: Record<string, number>;
  onAllocate: (invoiceId: string, value: number) => void;
  onAutoFill: () => void;
  lang: "ar" | "en";
  className?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Collection → invoices allocation grid (FE_13 §3.4) — oldest-first auto-fill,
 * fully editable per row, with a running "unallocated" counter. */
export function AllocationTable({
  invoices, amount, allocations, onAllocate, onAutoFill, lang, className,
}: AllocationTableProps) {
  const { t } = useTranslation("wholesale");

  const allocatedTotal = round2(Object.values(allocations).reduce((s, v) => s + (v || 0), 0));
  const unallocated = round2(amount - allocatedTotal);

  function handleChange(invoiceId: string, raw: string, outstanding: number) {
    let value = parseFloat(raw) || 0;
    if (value < 0) value = 0;
    if (value > outstanding) value = outstanding;
    onAllocate(invoiceId, round2(value));
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">{t("allocation.no_invoices")}</p>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{t("allocation.title")}</span>
        <Button type="button" variant="outline" size="sm" onClick={onAutoFill}>
          <Wand2 className="h-3.5 w-3.5 me-1.5" />
          {t("allocation.auto_fill")}
        </Button>
      </div>

      <div className="rounded border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("allocation.col_number")}</TableHead>
              <TableHead>{t("allocation.col_date")}</TableHead>
              <TableHead className="text-end">{t("allocation.col_total")}</TableHead>
              <TableHead className="text-end">{t("allocation.col_outstanding")}</TableHead>
              <TableHead className="text-end">{t("allocation.col_allocated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell><span className="font-mono" dir="ltr">{inv.number}</span></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(inv.date)}</TableCell>
                <TableCell className="text-end tabular-nums">{formatMoney(inv.total, lang)}</TableCell>
                <TableCell className="text-end tabular-nums">{formatMoney(inv.outstanding, lang)}</TableCell>
                <TableCell className="text-end">
                  <Input
                    type="number"
                    min={0}
                    max={inv.outstanding}
                    step="any"
                    value={allocations[inv.id] || ""}
                    onChange={(e) => handleChange(inv.id, e.target.value, inv.outstanding)}
                    className="h-8 text-end tabular-nums w-28 ms-auto"
                    placeholder="0.00"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className={cn(
        "flex items-center justify-between rounded px-3 py-2 text-sm font-medium",
        unallocated === 0 ? "bg-success-tint text-success-text" : "bg-warning-tint text-warning-text",
      )}>
        <span>{t("allocation.unallocated")}</span>
        <span className="tabular-nums">{formatMoney(unallocated, lang)}</span>
      </div>
    </div>
  );
}
