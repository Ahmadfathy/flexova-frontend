import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Square, Circle, RectangleHorizontal } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FnbTable, TableShape } from "@/stores/fnbFloor";

interface TableEditDialogProps {
  table: FnbTable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (seats: number, shape: TableShape) => void;
}

const SHAPES: { id: TableShape; icon: typeof Square; labelKey: string }[] = [
  { id: "square", icon: Square, labelKey: "floor.shape_square" },
  { id: "round", icon: Circle, labelKey: "floor.shape_round" },
  { id: "rect", icon: RectangleHorizontal, labelKey: "floor.shape_rect" },
];

/** Editor-mode: adjust an existing table's seats + shape. */
export function TableEditDialog({ table, open, onOpenChange, onSave }: TableEditDialogProps) {
  const { t } = useTranslation("fnb");
  const { t: tCommon } = useTranslation("common");
  const [seats, setSeats] = useState(table?.seats ?? 2);
  const [shape, setShape] = useState<TableShape>(table?.shape ?? "square");

  useEffect(() => {
    if (open && table) {
      setSeats(table.seats);
      setShape(table.shape);
    }
  }, [open, table]);

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("floor.edit_table_title")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button
            variant="solid"
            tone="primary"
            onClick={() => { onSave(seats, shape); onOpenChange(false); }}
          >
            {tCommon("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("floor.seats")}</Label>
          <div className="inline-flex items-center rounded border-2 border-foreground/20 bg-card overflow-hidden">
            <Button
              type="button"
              variant="icon"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-none"
              onClick={() => setSeats(s => Math.max(1, s - 1))}
              disabled={seats <= 1}
              aria-label="-"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="h-11 min-w-[3.5rem] px-2 inline-flex items-center justify-center text-lg font-bold tabular-nums border-x-2 border-foreground/20">
              {seats}
            </span>
            <Button
              type="button"
              variant="icon"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-none"
              onClick={() => setSeats(s => Math.min(20, s + 1))}
              disabled={seats >= 20}
              aria-label="+"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("floor.shape")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setShape(s.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-16 rounded border-2 text-xs font-medium transition-colors",
                  shape === s.id
                    ? "border-brand bg-brand-tint text-brand-text"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <s.icon className="h-5 w-5" />
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
