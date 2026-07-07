import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Users, UtensilsCrossed, ShoppingBag, Bike, ChevronUp, ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useFnbFloor } from "@/stores/fnbFloor";
import { useFnbOrder, type FnbOrderStatus, type FnbOrderType } from "@/stores/fnbOrder";
import { OrderMenuGrid } from "./OrderMenuGrid";
import { OrderCheckPanel } from "./OrderCheckPanel";
import { ModifiersDialog } from "./ModifiersDialog";
import type { MenuItem } from "./menu";

const TYPE_ICON: Record<FnbOrderType, typeof UtensilsCrossed> = {
  "dine-in": UtensilsCrossed,
  takeaway: ShoppingBag,
  delivery: Bike,
};

const TYPE_LABEL_KEY: Record<FnbOrderType, string> = {
  "dine-in": "order.type.dine_in",
  takeaway: "order.type.takeaway",
  delivery: "order.type.delivery",
};

const ORDER_STATUS_VARIANT: Record<FnbOrderStatus, PillVariant> = {
  open: "default",
  fired: "pending",
  served: "in-progress",
  billed: "active",
  settled: "approved",
  void: "inactive",
};

export default function OrderPage() {
  const { t } = useTranslation("fnb");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();
  const { checkId = "" } = useParams<{ checkId: string }>();
  const [searchParams] = useSearchParams();

  const tables = useFnbFloor(s => s.tables);
  const check = useFnbOrder(s => s.checks[checkId]);
  const ensureCheck = useFnbOrder(s => s.ensureCheck);

  const [modifiersItem, setModifiersItem] = useState<MenuItem | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const addLine = useFnbOrder(s => s.addLine);

  useEffect(() => {
    if (!checkId || check) return;
    const table = tables.find(tb => tb.current_check_id === checkId);
    ensureCheck(checkId, {
      type: "dine-in",
      table_id: table?.id ?? null,
      section_id: table?.section_id,
      guests: Number(searchParams.get("guests")) || 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkId, check, tables]);

  if (!can("fnb.order.create")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("order.permission_required")}</p>
      </div>
    );
  }

  if (!check) return null;

  const table = check.table_id ? tables.find(tb => tb.id === check.table_id) : undefined;
  const TypeIcon = TYPE_ICON[check.type];

  const handleActivate = (item: MenuItem) => {
    if (item.modifier_groups.length > 0) {
      setModifiersItem(item);
    } else {
      addLine(checkId, item, []);
    }
  };

  const activeLineCount = check.lines.filter(l => l.status !== "void").length;
  const grandTotalPreview = check.lines
    .filter(l => l.status !== "void")
    .reduce((sum, l) => sum + (l.price + l.modifiers.reduce((s, m) => s + m.delta, 0)) * l.qty, 0);

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3 p-4 pb-24 lg:pb-4">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button variant="icon" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/fnb/floor")} aria-label={t("order.back_to_floor")}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Button>

          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground shrink-0">
            <TypeIcon className="h-4 w-4" />
            {check.type === "dine-in" && table
              ? t("order.table_label", { number: table.number })
              : t(TYPE_LABEL_KEY[check.type])}
          </span>

          <span className="text-sm text-muted-foreground tabular-nums shrink-0">{check.number}</span>

          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3.5 w-3.5" />
            {t("order.guests_count", { n: check.guests })}
          </span>

          <StatusPill variant={ORDER_STATUS_VARIANT[check.status]} label={t(`order.status.${check.status}`)} className="shrink-0" />
        </div>

        <div className="flex-1 min-h-0">
          <OrderMenuGrid onActivate={handleActivate} />
        </div>
      </div>

      {/* Check panel — static side panel on desktop, collapsible sheet on small screens */}
      <aside
        className={cn(
          "flex flex-col shrink-0 border-border bg-card z-20",
          "fixed inset-x-0 bottom-0 border-t rounded-t-xl shadow-lg overflow-hidden",
          "transition-[max-height] duration-200 ease-brand",
          panelExpanded ? "max-h-[70vh]" : "max-h-16",
          "lg:static lg:inset-auto lg:rounded-none lg:shadow-none lg:border-t-0 lg:border-s",
          "lg:w-[380px] lg:max-h-none lg:overflow-visible"
        )}
      >
        {!panelExpanded && (
          <button
            type="button"
            onClick={() => setPanelExpanded(true)}
            className="lg:hidden flex items-center justify-between h-16 px-4 shrink-0 w-full"
          >
            <span className="text-sm font-semibold text-foreground">
              {t("order.items_count", { n: activeLineCount })}
            </span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums font-bold text-foreground">{formatMoney(grandTotalPreview, lang)}</span>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </span>
          </button>
        )}

        <div className={cn("flex-col min-h-0", panelExpanded ? "flex flex-1" : "hidden lg:flex lg:flex-1")}>
          {panelExpanded && (
            <button
              type="button"
              onClick={() => setPanelExpanded(false)}
              className="lg:hidden flex items-center justify-center h-8 shrink-0 text-muted-foreground"
              aria-label="close"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
          <OrderCheckPanel checkId={checkId} />
        </div>
      </aside>

      <ModifiersDialog
        item={modifiersItem}
        open={!!modifiersItem}
        onOpenChange={(o) => !o && setModifiersItem(null)}
        onConfirm={(modifiers) => {
          if (modifiersItem) addLine(checkId, modifiersItem, modifiers);
        }}
      />
    </div>
  );
}
