import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Users } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import type { FnbTable } from "@/stores/fnbFloor";

interface GuestsCountDialogProps {
  table: FnbTable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (guests: number) => void;
}

/** Tap an available table → pick guest count → open its check. */
export function GuestsCountDialog({ table, open, onOpenChange, onConfirm }: GuestsCountDialogProps) {
  const { t } = useTranslation("fnb");
  const { t: tCommon } = useTranslation("common");
  const max = Math.max(1, table?.seats ?? 1);
  const [guests, setGuests] = useState(max);

  useEffect(() => { if (open) setGuests(max); }, [open, max]);

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("guests")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button
            variant="solid"
            tone="primary"
            onClick={() => { onConfirm(guests); onOpenChange(false); }}
          >
            {t("table.open")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        <span className="flex items-center justify-center h-12 w-12 rounded-full bg-brand-tint text-brand-text">
          <Users className="h-6 w-6" />
        </span>

        <div className="inline-flex items-center rounded border-2 border-foreground/20 bg-card overflow-hidden">
          <Button
            type="button"
            variant="icon"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-none"
            onClick={() => setGuests(g => Math.max(1, g - 1))}
            disabled={guests <= 1}
            aria-label="-"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="h-11 min-w-[3.5rem] px-2 inline-flex items-center justify-center text-lg font-bold tabular-nums border-x-2 border-foreground/20">
            {guests}
          </span>
          <Button
            type="button"
            variant="icon"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-none"
            onClick={() => setGuests(g => g + 1)}
            aria-label="+"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
