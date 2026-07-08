import { useEffect, useState, useCallback } from "react";
import { mockFetch } from "@/lib/mock/client";
import { useSvcAppointments } from "@/stores/svcAppointments";
import { useSvcTickets } from "@/stores/svcTickets";

/**
 * Five-states signal for the Service Ticket (`?mock=loading|error|offline`), mirroring
 * `useBill`/`useCalendar` — the ticket itself lives in `useSvcTickets` (lazily created from
 * the matching appointment on first visit), this hook only decides which state wraps it.
 */
export function useServiceTicket(ticketId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const appointments = useSvcAppointments((s) => s.appointments);
  const ticket = useSvcTickets((s) => s.tickets[ticketId]);
  const ensureTicketFromAppointment = useSvcTickets((s) => s.ensureTicketFromAppointment);

  const sourceAppointment = Object.values(appointments).find((a) => a.ticket_id === ticketId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);
    try {
      await mockFetch(async () => "ok" as const, "ok" as const);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg === "mock_offline") setIsOffline(true);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (ticket || !sourceAppointment) return;
    ensureTicketFromAppointment(ticketId, sourceAppointment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket, sourceAppointment, ticketId]);

  const notFound = !loading && !error && !ticket && !sourceAppointment;

  return { ticket, notFound, loading, error, isOffline, reload: load };
}
