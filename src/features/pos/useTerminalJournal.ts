import { useState, useEffect, useCallback } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";

export interface PosTicketLine {
  item_id: string;
  sku?: string | null;
  description: string;
  qty?: number;
  weight_kg?: number;
  uom_id: string;
  price?: number;
  price_per_kg?: number;
  line_discount: number;
  tax_type_id: string;
  line_total: number;
  _flag?: string;
}

export interface PosTicketTender {
  type: string;
  amount: number;
  points_used?: number;
}

export interface PosTicketEta {
  uuid?: string | null;
  accepted_at?: string;
  qr?: string;
  environment?: string;
  queued_at?: string;
  window_deadline?: string;
  window_remaining_hours?: number;
  rejected_at?: string;
  reason_ar?: string;
  reason_en?: string;
  offending_field?: string;
  raw_code?: string;
}

export interface PosTicket {
  id: string;
  number: string;
  terminal_id: string;
  shift_id: string;
  branch_id: string;
  warehouse_id: string;
  customer_id: string;
  channel: "e-receipt" | "e-invoice";
  opened_at: string;
  closed_at: string | null;
  status: "open" | "parked" | "paid" | "voided";
  payment_status: "paid" | "partial" | "returned" | null;
  sync_status: "local" | "queued" | "clearing" | "valid" | "rejected";
  note?: string;
  voided_by_ar?: string;
  void_reason_ar?: string;
  lines: PosTicketLine[];
  totals: {
    subtotal: number;
    line_discounts: number;
    ticket_discount: number;
    taxable_base: number;
    tax: number;
    rounding: number;
    grand_total: number;
  };
  tenders: PosTicketTender[];
  change_due: number;
  loyalty_earned?: number;
  eta?: PosTicketEta;
  _flag?: string;
}

interface PosFixture {
  tickets: PosTicket[];
}

interface UseTerminalJournalResult {
  tickets: PosTicket[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  reload: () => void;
}

export function useTerminalJournal(): UseTerminalJournalResult {
  const [tickets, setTickets] = useState<PosTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const fixture = await mockFetch<PosFixture>(
        () => loadFixture<PosFixture>("pos"),
        { tickets: [] }
      );
      setTickets(fixture.tickets);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg === "mock_offline") {
        setIsOffline(true);
        try {
          const cached = await loadFixture<PosFixture>("pos");
          setTickets(cached.tickets);
        } catch {
          setTickets([]);
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { tickets, loading, error, isOffline, reload: load };
}
