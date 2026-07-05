import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookText, Search, X, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { ListRow } from "@/components/patterns/ListRow";
import { StatusPill } from "@/components/patterns/StatusPill";
import { formatMoney, formatTime } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { TENDER_TYPES, tenderName } from "./tenderTypes";
import { paymentPillVariant, paymentStatusKey, syncPillVariant } from "./journalStatus";
import { useTerminalJournal, type PosTicket } from "./useTerminalJournal";
import { TicketReceiptDialog } from "./TicketReceiptDialog";
import salesFixtures from "@/lib/mock/fixtures/sales.fixtures.json";

const CUSTOMERS = salesFixtures.customers as { id: string; name_ar: string; name_en: string }[];

interface JournalFilters {
  search: string;
  paymentStatus: string;
  syncStatus: string;
  tender: string;
  channel: string;
}

const EMPTY_FILTERS: JournalFilters = { search: "", paymentStatus: "", syncStatus: "", tender: "", channel: "" };

function JournalSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0" style={{ opacity: 1 - i * 0.15 }}>
          <Skeleton className="h-10 w-10 rounded shrink-0" />
          <Skeleton className="h-3.5 w-32" />
          <div className="ms-auto flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JournalPage() {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const can = useCan();
  const { tickets, loading, error, isOffline, reload } = useTerminalJournal();

  const [filters, setFilters] = useState<JournalFilters>(EMPTY_FILTERS);
  const [activeTicket, setActiveTicket] = useState<PosTicket | null>(null);

  const setFilter = <K extends keyof JournalFilters>(key: K, val: JournalFilters[K]) =>
    setFilters(prev => ({ ...prev, [key]: val }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const customerName = (id: string) => {
    const c = CUSTOMERS.find(c => c.id === id);
    return c ? (lang === "ar" ? c.name_ar : c.name_en) : id;
  };

  const filtered = useMemo(() => {
    let list = tickets;
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(tk =>
        tk.number.toLowerCase().includes(q) ||
        customerName(tk.customer_id).toLowerCase().includes(q)
      );
    }
    if (filters.paymentStatus) list = list.filter(tk => paymentStatusKey(tk) === filters.paymentStatus);
    if (filters.syncStatus) list = list.filter(tk => tk.sync_status === filters.syncStatus);
    if (filters.tender) list = list.filter(tk => tk.tenders.some(td => td.type === filters.tender));
    if (filters.channel) list = list.filter(tk => tk.channel === filters.channel);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, filters, lang]);

  const hasFilters = Object.values(filters).some(Boolean);

  if (!can("pos.journal.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("journal.permission_required")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <BookText className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-base font-semibold text-foreground">{t("journal.title")}</h1>
      </div>

      {isOffline && <OfflineBanner message={t("journal.offline_note")} />}

      {/* Toolbar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            placeholder={t("journal.search_placeholder")}
            className="ps-9 h-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={filters.paymentStatus || "__all__"} onValueChange={v => setFilter("paymentStatus", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-9 w-auto min-w-40 text-sm"><SelectValue placeholder={t("journal.all_payment")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("journal.all_payment")}</SelectItem>
              <SelectItem value="paid">{t("ticket.status.paid")}</SelectItem>
              <SelectItem value="partial">{t("ticket.status.partial")}</SelectItem>
              <SelectItem value="returned">{t("ticket.status.returned")}</SelectItem>
              <SelectItem value="voided">{t("ticket.status.voided")}</SelectItem>
              <SelectItem value="parked">{t("ticket.status.parked")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.syncStatus || "__all__"} onValueChange={v => setFilter("syncStatus", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-9 w-auto min-w-40 text-sm"><SelectValue placeholder={t("journal.all_sync")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("journal.all_sync")}</SelectItem>
              <SelectItem value="local">{t("ticket.status.local")}</SelectItem>
              <SelectItem value="queued">{t("ticket.status.queued")}</SelectItem>
              <SelectItem value="valid">{t("ticket.status.valid")}</SelectItem>
              <SelectItem value="rejected">{t("ticket.status.rejected")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.tender || "__all__"} onValueChange={v => setFilter("tender", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-9 w-auto min-w-36 text-sm"><SelectValue placeholder={t("journal.all_tenders")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("journal.all_tenders")}</SelectItem>
              {TENDER_TYPES.map(tt => (
                <SelectItem key={tt.id} value={tt.id}>{tenderName(tt.id, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.channel || "__all__"} onValueChange={v => setFilter("channel", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-9 w-auto min-w-36 text-sm"><SelectValue placeholder={t("journal.all_channels")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("journal.all_channels")}</SelectItem>
              <SelectItem value="e-invoice">{t("journal.channel_b2b")}</SelectItem>
              <SelectItem value="e-receipt">{t("journal.channel_b2c")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 me-1" />
            {t("journal.clear_filters")}
          </Button>
        )}
      </div>

      {loading ? (
        <JournalSkeleton />
      ) : error ? (
        <ErrorState title={t("journal.error_title")} description={t("journal.error_body")} onRetry={reload} />
      ) : tickets.length === 0 ? (
        <EmptyState icon={BookText} title={t("journal.empty_title")} description={t("journal.empty_body")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("journal.no_results", { query: filters.search || "—" })}
          description={t("journal.no_results_hint")}
          action={{ label: t("journal.clear_filters"), onClick: clearFilters }}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {filtered.map(ticket => (
            <ListRow
              key={ticket.id}
              leading={<span className="text-xs font-bold tabular-nums" dir="ltr">{ticket.number.split("-").pop()}</span>}
              title={ticket.number}
              subtitle={`${customerName(ticket.customer_id)} · ${formatTime(ticket.opened_at)}`}
              tone={ticket.sync_status === "rejected" ? "danger" : ticket.sync_status === "queued" ? "warning" : "muted"}
              onClick={() => setActiveTicket(ticket)}
              chevron
              trailing={
                <div className="flex flex-col items-end gap-1">
                  <span className="tabular-nums font-semibold text-sm">{formatMoney(ticket.totals.grand_total, lang)}</span>
                  <div className="flex items-center gap-1">
                    <StatusPill variant={paymentPillVariant(ticket)} label={t(`ticket.status.${paymentStatusKey(ticket)}`)} />
                    <StatusPill variant={syncPillVariant(ticket.sync_status)} label={t(`ticket.status.${ticket.sync_status}`)} />
                  </div>
                </div>
              }
            />
          ))}
        </div>
      )}

      <TicketReceiptDialog
        ticket={activeTicket}
        open={!!activeTicket}
        onOpenChange={(o) => !o && setActiveTicket(null)}
        isOffline={isOffline}
      />
    </div>
  );
}
