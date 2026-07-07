import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Minus, Plus, Trash2, Flag, ChevronDown, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useFnbOrder, type FnbCheckLine, type FnbLineStatus } from "@/stores/fnbOrder";
import { FNB_COURSES, findCourse, findModifierGroup, findMenuItem, findStation } from "./menu";
import inventoryFixtures from "@/lib/mock/fixtures/inventory.fixtures.json";

const TAX_TYPES = inventoryFixtures.tax_types as { id: string; rate: number }[];
const TAX_RATES: Record<string, number> = Object.fromEntries(TAX_TYPES.map(tt => [tt.id, tt.rate]));

const LINE_STATUS_VARIANT: Record<FnbLineStatus, PillVariant> = {
  held: "default",
  preparing: "pending",
  ready: "active",
  served: "approved",
  void: "inactive",
};

function lineUnitPrice(line: FnbCheckLine): number {
  return line.price + line.modifiers.reduce((sum, m) => sum + m.delta, 0);
}

function CourseBadgeButton({ checkId, line, disabled }: { checkId: string; line: FnbCheckLine; disabled: boolean }) {
  const { lang } = useAppearance();
  const setLineCourse = useFnbOrder(s => s.setLineCourse);
  const course = findCourse(line.course_id);

  if (disabled) {
    return (
      <span className="text-[11px] text-muted-foreground">
        {course ? (lang === "ar" ? course.name_ar : course.name_en) : ""}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-[11px] rounded px-1.5 h-6 text-muted-foreground hover:bg-muted shrink-0"
        >
          {course ? (lang === "ar" ? course.name_ar : course.name_en) : "—"}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        {FNB_COURSES.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setLineCourse(checkId, line.id, c.id)}
            className={cn(
              "flex w-full items-center rounded px-2 py-1.5 text-sm hover:bg-muted",
              c.id === line.course_id && "font-semibold text-brand-text"
            )}
          >
            {lang === "ar" ? c.name_ar : c.name_en}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

interface OrderCheckPanelProps {
  checkId: string;
  onEditLine: (line: FnbCheckLine) => void;
}

export function OrderCheckPanel({ checkId, onEditLine }: OrderCheckPanelProps) {
  const { t } = useTranslation("fnb");
  const { lang } = useAppearance();
  const can = useCan();

  const check = useFnbOrder(s => s.checks[checkId]);
  const updateQty = useFnbOrder(s => s.updateQty);
  const removeLine = useFnbOrder(s => s.removeLine);
  const fireLines = useFnbOrder(s => s.fireLines);
  const voidLine = useFnbOrder(s => s.voidLine);

  const [activeCourse, setActiveCourse] = useState<string>("all");
  const [voidTarget, setVoidTarget] = useState<FnbCheckLine | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const lines = check?.lines.filter(l => l.status !== "void") ?? [];
  const visibleLines = activeCourse === "all" ? lines : lines.filter(l => l.course_id === activeCourse);

  const totals = useMemo(() => {
    let subtotal = 0;
    const byTax = new Map<string, number>();
    for (const l of lines) {
      const net = lineUnitPrice(l) * l.qty;
      subtotal += net;
      byTax.set(l.tax_type_id, (byTax.get(l.tax_type_id) ?? 0) + net);
    }
    let tax = 0;
    for (const [taxId, base] of byTax) tax += base * ((TAX_RATES[taxId] ?? 0) / 100);
    return { subtotal, tax, grandTotal: subtotal + tax };
  }, [lines]);

  const heldInScope = visibleLines.filter(l => l.status === "held");

  if (!check) return null;

  const handleFire = () => {
    if (!can("fnb.order.fire")) return;
    const courseId = activeCourse === "all" ? null : activeCourse;
    const fired = fireLines(checkId, courseId);
    if (fired.length === 0) return;
    const stations = Array.from(new Set(fired.map(l => l.station_id)))
      .map(id => findStation(id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map(s => (lang === "ar" ? s.name_ar : s.name_en));
    toast.success(t("order.fired_toast", { n: fired.length, stations: stations.join(lang === "ar" ? "، " : ", ") }));
  };

  const handleBill = () => toast.info(t("order.bill_stub_toast"));

  const handleConfirmVoid = () => {
    if (!voidTarget || !voidReason.trim()) return;
    voidLine(checkId, voidTarget.id);
    setVoidTarget(null);
    setVoidReason("");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <Tabs value={activeCourse} onValueChange={setActiveCourse} className="shrink-0 px-3 pt-3">
        <TabsList className="h-auto p-1 flex-wrap justify-start bg-muted gap-1 w-full">
          <TabsTrigger value="all" className="h-9 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("order.course_all")}
          </TabsTrigger>
          {FNB_COURSES.map(c => (
            <TabsTrigger key={c.id} value={c.id} className="h-9 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
              {lang === "ar" ? c.name_ar : c.name_en}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex-1 min-h-0 overflow-auto px-3 py-2">
        {visibleLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-1">
            <p className="text-sm font-medium text-foreground">{t("order.check_empty_title")}</p>
            <p className="text-xs text-muted-foreground">{t("order.check_empty_body")}</p>
          </div>
        ) : (
          visibleLines.map(line => {
            const item = findMenuItem(line.item_id);
            const name = item ? (lang === "ar" ? item.name_ar : item.name_en) : line.name;
            const modLabels = line.modifiers.map(m => {
              const group = findModifierGroup(m.group);
              const opt = group?.options.find(o => o.id === m.option);
              return opt ? (lang === "ar" ? opt.name_ar : opt.name_en) : null;
            }).filter(Boolean);
            const summary = modLabels.length > 0 ? `${name} — ${modLabels.join(" · ")}` : name;
            const canEditModifiers = line.status === "held" && (item?.modifier_groups.length ?? 0) > 0;
            const canVoid = can("fnb.order.void") && (line.status === "preparing" || line.status === "ready");

            return (
              <div key={line.id} className="py-2 border-b border-border last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {canEditModifiers ? (
                      <button
                        type="button"
                        onClick={() => onEditLine(line)}
                        className="w-full text-sm text-foreground truncate flex items-center gap-1 text-start hover:underline"
                      >
                        <span className="truncate">{summary}</span>
                        {line.eta_code_missing && <Flag className="h-3 w-3 text-warning-text shrink-0" />}
                      </button>
                    ) : (
                      <p className="text-sm text-foreground truncate flex items-center gap-1">
                        <span className="truncate">{summary}</span>
                        {line.eta_code_missing && <Flag className="h-3 w-3 text-warning-text shrink-0" />}
                      </p>
                    )}
                  </div>
                  <span className="tabular-nums text-sm font-semibold text-foreground shrink-0">
                    {formatMoney(lineUnitPrice(line) * line.qty, lang)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <StatusPill variant={LINE_STATUS_VARIANT[line.status]} label={t(`order.line_status.${line.status}`)} />
                    <CourseBadgeButton checkId={checkId} line={line} disabled={line.status !== "held"} />
                  </div>

                  {line.status === "held" ? (
                    <div className="flex items-center gap-1">
                      <div className="inline-flex items-center gap-1 rounded border border-border h-7">
                        <button
                          type="button"
                          onClick={() => updateQty(checkId, line.id, line.qty - 1)}
                          className="flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground"
                          aria-label="-"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold tabular-nums">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(checkId, line.id, line.qty + 1)}
                          className="flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground"
                          aria-label="+"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(checkId, line.id)}
                        className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-danger-tint hover:text-danger-text"
                        aria-label="delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : canVoid ? (
                    <button
                      type="button"
                      onClick={() => setVoidTarget(line)}
                      className="text-[11px] font-medium text-danger-text hover:underline"
                    >
                      {t("order.void")}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {lines.length > 0 && (
        <div className="px-3 py-2 border-t border-border shrink-0 space-y-1 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t("subtotal", { ns: "pos" })}</span>
            <span className="tabular-nums">{formatMoney(totals.subtotal, lang)}</span>
          </div>
          <div className="flex items-center justify-between font-bold text-foreground pt-1 border-t border-border">
            <span>{t("layout.grand_total", { ns: "pos" })}</span>
            <span className="tabular-nums">{formatMoney(totals.grandTotal, lang)}</span>
          </div>
        </div>
      )}

      <div className="p-3 border-t border-border shrink-0 grid grid-cols-2 gap-2">
        <Button
          variant="solid" tone="primary" size="lg" className="h-11"
          disabled={!can("fnb.order.fire") || heldInScope.length === 0}
          onClick={handleFire}
        >
          <Flame className="h-4 w-4 me-1.5" />
          {heldInScope.length > 0 ? t("order.fire_count", { n: heldInScope.length }) : t("order.fire")}
        </Button>
        <Button variant="outline" size="lg" className="h-11" disabled={!hasLinesAtAll(check)} onClick={handleBill}>
          {t("order.bill")}
        </Button>
      </div>

      <ConfirmDialog
        open={!!voidTarget}
        onOpenChange={(o) => { if (!o) { setVoidTarget(null); setVoidReason(""); } }}
        title={t("order.void_line_title")}
        description={t("order.void_line_body")}
        confirmTone="danger"
        confirmLabel={t("order.void_confirm")}
        confirmDisabled={!voidReason.trim()}
        onConfirm={handleConfirmVoid}
      >
        <Textarea
          value={voidReason}
          onChange={e => setVoidReason(e.target.value)}
          placeholder={t("order.void_reason_placeholder")}
          className="min-h-20"
        />
      </ConfirmDialog>
    </div>
  );
}

function hasLinesAtAll(check: { lines: FnbCheckLine[] } | undefined) {
  return !!check && check.lines.some(l => l.status !== "void");
}
