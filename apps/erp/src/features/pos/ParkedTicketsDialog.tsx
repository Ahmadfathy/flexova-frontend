import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Clock, Timer } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { useAppearance } from "@/stores/appearance";
import { formatMoney, formatTime } from "@/lib/format";
import { usePosRegister } from "@/stores/posRegister";
import { computeCartTotals } from "./posTotals";
import inventoryFixtures from "@/lib/mock/fixtures/Inventory.fixtures.json";

const TAX_TYPES = inventoryFixtures.tax_types as { id: string; rate: number }[];
const TAX_RATES: Record<string, number> = Object.fromEntries(TAX_TYPES.map(tt => [tt.id, tt.rate]));

interface ParkedTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasActiveTicket: boolean;
}

export function ParkedTicketsDialog({ open, onOpenChange, hasActiveTicket }: ParkedTicketsDialogProps) {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const parkedTickets = usePosRegister(s => s.parkedTickets);
  const retrieveTicket = usePosRegister(s => s.retrieveTicket);

  const handleRetrieve = (id: string) => {
    if (hasActiveTicket) {
      toast.warning(t("parked.active_ticket_warning"));
      return;
    }
    retrieveTicket(id);
    onOpenChange(false);
    toast.success(t("parked.retrieved_toast"));
  };

  return (
    <ModalShell open={open} onOpenChange={onOpenChange} title={t("parked.title")} size="sm">
      {parkedTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Timer className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("parked.empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {parkedTickets.map(ticket => {
            const grandTotal = computeCartTotals(ticket.lines, ticket.ticketDiscount, TAX_RATES).grandTotal;
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => handleRetrieve(ticket.id)}
                className="flex items-center justify-between gap-3 rounded border border-border p-3 text-start hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{ticket.number}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(ticket.parkedAt)} · {t("parked.item_count", { n: ticket.lines.length })}
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-foreground shrink-0">
                  {formatMoney(grandTotal, lang)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}
