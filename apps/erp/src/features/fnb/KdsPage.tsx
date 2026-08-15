import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChefHat, Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useFnbKds, type KdsTicket } from "@/stores/fnbKds";
import { useFnbOrder } from "@/stores/fnbOrder";
import { useKds } from "./useKds";
import { KITCHEN_STATIONS } from "./menu";
import { KdsTicketCard } from "./KdsTicketCard";

function KdsSkeleton() {
  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-lg" />
      ))}
    </div>
  );
}

export default function KdsPage() {
  const { t } = useTranslation("fnb");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();
  const { stationId } = useParams<{ stationId?: string }>();

  const tickets = useFnbKds(s => s.tickets);
  const startTicket = useFnbKds(s => s.start);
  const bumpTicket = useFnbKds(s => s.bump);
  const recallTicket = useFnbKds(s => s.recall);
  const tick = useFnbKds(s => s.tick);
  const setLinesStatus = useFnbOrder(s => s.setLinesStatus);

  const { loading, error, isOffline, forcedEmpty, reload } = useKds();

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const allTickets = forcedEmpty ? [] : Object.values(tickets);

  const stations = stationId ? KITCHEN_STATIONS.filter(s => s.id === stationId) : KITCHEN_STATIONS;

  const byStation = useMemo(() => {
    const map = new Map<string, KdsTicket[]>();
    for (const st of stations) map.set(st.id, []);
    for (const ticket of allTickets) {
      const list = map.get(ticket.station_id);
      if (list) list.push(ticket);
    }
    for (const list of map.values()) list.sort((a, b) => a.fired_at.localeCompare(b.fired_at));
    return map;
  }, [allTickets, stations]);

  if (!can("fnb.kds.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("kds.permission_required")}</p>
      </div>
    );
  }

  const handleBump = (ticket: KdsTicket) => {
    bumpTicket(ticket.id);
    setLinesStatus(ticket.check_id, ticket.items.map(i => i.line_id), "ready");
    toast.success(t("kds.bumped_toast", { table: ticket.table_number ?? ticket.check_number }));
  };

  const handleRecall = (ticket: KdsTicket) => {
    recallTicket(ticket.id);
    setLinesStatus(ticket.check_id, ticket.items.map(i => i.line_id), "preparing");
  };

  const handleReprint = () => toast.info(t("kds.reprint_toast"));

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {isOffline && <OfflineBanner message={t("kds.offline_note")} />}

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <h1 className="text-base font-semibold text-foreground shrink-0">{t("kds.title")}</h1>

        <Tabs
          value={stationId ?? "all"}
          onValueChange={(v) => navigate(v === "all" ? "/fnb/kds" : `/fnb/kds/${v}`)}
          className="flex-1 min-w-0"
        >
          <TabsList className="h-auto p-1 flex-wrap justify-start bg-muted gap-1">
            <TabsTrigger value="all" className="h-11 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              {t("kds.all_stations")}
            </TabsTrigger>
            {KITCHEN_STATIONS.map(s => (
              <TabsTrigger key={s.id} value={s.id} className="h-11 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {lang === "ar" ? s.name_ar : s.name_en}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <KdsSkeleton />
      ) : error ? (
        <ErrorState title={t("kds.error_title")} description={t("kds.error_body")} onRetry={reload} />
      ) : allTickets.filter(tk => stations.some(s => s.id === tk.station_id)).length === 0 ? (
        <EmptyState icon={ChefHat} title={t("kds.empty_title")} description={t("kds.empty_body")} />
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <div className={stationId ? "max-w-2xl mx-auto space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start"}>
            {stations.map(st => {
              const stationTickets = byStation.get(st.id) ?? [];
              if (stationId) {
                return stationTickets.length === 0 ? (
                  <EmptyState key={st.id} icon={ChefHat} title={t("kds.empty_title")} description={t("kds.empty_body")} />
                ) : (
                  <div key={st.id} className="space-y-3">
                    {stationTickets.map(ticket => (
                      <KdsTicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onStart={() => startTicket(ticket.id)}
                        onBump={() => handleBump(ticket)}
                        onRecall={() => handleRecall(ticket)}
                        onReprint={handleReprint}
                      />
                    ))}
                  </div>
                );
              }
              return (
                <div key={st.id} className="flex flex-col gap-2 min-w-0">
                  <h2 className="text-sm font-bold text-foreground px-1">
                    {lang === "ar" ? st.name_ar : st.name_en}
                    <span className="ms-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                      {stationTickets.length > 0 ? `(${stationTickets.length})` : ""}
                    </span>
                  </h2>
                  <div className="space-y-2">
                    {stationTickets.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1">{t("kds.station_empty")}</p>
                    ) : (
                      stationTickets.map(ticket => (
                        <KdsTicketCard
                          key={ticket.id}
                          ticket={ticket}
                          onStart={() => startTicket(ticket.id)}
                          onBump={() => handleBump(ticket)}
                          onRecall={() => handleRecall(ticket)}
                          onReprint={handleReprint}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

