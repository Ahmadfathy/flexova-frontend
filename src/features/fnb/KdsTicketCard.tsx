import { useTranslation } from "react-i18next";
import { UtensilsCrossed, ShoppingBag, Bike, Printer, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { type KdsTicket, type KdsTicketStatus } from "@/stores/fnbKds";
import type { FnbOrderType } from "@/stores/fnbOrder";
import { findCourse, findMenuItem, modifierLabels } from "./menu";

const TYPE_ICON: Record<FnbOrderType, typeof UtensilsCrossed> = {
  "dine-in": UtensilsCrossed,
  takeaway: ShoppingBag,
  delivery: Bike,
};

const STATUS_VARIANT: Record<KdsTicketStatus, PillVariant> = {
  new: "pending",
  preparing: "in-progress",
  ready: "approved",
};

const BORDER_COLOR: Record<KdsTicketStatus, string> = {
  new: "border-s-warning",
  preparing: "border-s-brand",
  ready: "border-s-success",
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function elapsedTone(seconds: number): string {
  if (seconds >= 600) return "text-danger-text";
  if (seconds >= 300) return "text-warning-text";
  return "text-muted-foreground";
}

interface KdsTicketCardProps {
  ticket: KdsTicket;
  onStart: () => void;
  onBump: () => void;
  onRecall: () => void;
  onReprint: () => void;
}

export function KdsTicketCard({ ticket, onStart, onBump, onRecall, onReprint }: KdsTicketCardProps) {
  const { t } = useTranslation("fnb");
  const { lang } = useAppearance();
  const can = useCan();

  const TypeIcon = TYPE_ICON[ticket.order_type];
  const course = findCourse(ticket.course_id);
  const tableOrType = ticket.order_type === "dine-in" && ticket.table_number
    ? t("order.table_label", { number: ticket.table_number })
    : t(`order.type.${ticket.order_type === "dine-in" ? "dine_in" : ticket.order_type}`);

  return (
    <div className={cn("rounded-lg border border-s-4 border-border bg-card p-3 shadow-sm space-y-2.5", BORDER_COLOR[ticket.status])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-base font-bold text-foreground">
            <TypeIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{tableOrType}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <span>{ticket.check_number}</span>
            {course && <span>{lang === "ar" ? course.name_ar : course.name_en}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusPill variant={STATUS_VARIANT[ticket.status]} label={t(`kds.status.${ticket.status}`)} />
          <span className={cn("flex items-center gap-1 text-sm font-bold tabular-nums", elapsedTone(ticket.elapsed_seconds))}>
            <Timer className="h-3.5 w-3.5" />
            {formatElapsed(ticket.elapsed_seconds)}
          </span>
        </div>
      </div>

      <ul className="space-y-1.5 border-t border-border pt-2">
        {ticket.items.map(it => {
          const item = findMenuItem(it.item_id);
          const name = item ? (lang === "ar" ? item.name_ar : item.name_en) : it.item_id;
          const mods = modifierLabels(it.modifiers, lang);
          return (
            <li key={it.line_id} className="text-sm">
              <span className="font-semibold text-foreground">{it.qty}×</span>{" "}
              <span className="font-semibold text-foreground">{name}</span>
              {mods.length > 0 && (
                <span className="block text-xs text-muted-foreground ps-4">{mods.join(" · ")}</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2 pt-1">
        {can("fnb.kds.bump") && ticket.status === "new" && (
          <Button variant="outline" size="sm" className="h-9 flex-1" onClick={onStart}>
            {t("kds.start")}
          </Button>
        )}
        {can("fnb.kds.bump") && ticket.status === "preparing" && (
          <Button variant="solid" tone="primary" size="sm" className="h-9 flex-1" onClick={onBump}>
            {t("kds.bump")}
          </Button>
        )}
        {can("fnb.kds.bump") && ticket.status === "ready" && (
          <Button variant="outline" size="sm" className="h-9 flex-1" onClick={onRecall}>
            {t("kds.recall")}
          </Button>
        )}
        <Button variant="icon" size="icon" className="h-9 w-9 shrink-0" onClick={onReprint} aria-label={t("kds.reprint")}>
          <Printer className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
