import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { MoreVertical, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppearance, dirOf } from "@/stores/appearance";
import { formatMoney } from "@/lib/format";
import type { FnbTable } from "@/stores/fnbFloor";
import { TABLE_STATUS_TILE } from "./tableStatus";

export function tileDims(shape: FnbTable["shape"], seats: number) {
  const base = seats <= 2 ? 64 : seats <= 4 ? 76 : seats <= 6 ? 88 : 100;
  if (shape === "rect") return { w: Math.round(base * 1.5), h: base };
  return { w: base, h: base };
}

function useElapsed(openedAt?: string) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!openedAt) return;
    const id = setInterval(() => forceTick(v => v + 1), 1000);
    return () => clearInterval(id);
  }, [openedAt]);

  if (!openedAt) return null;
  const secs = Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface TableTileProps {
  table: FnbTable;
  scale: number;
  editMode: boolean;
  checkTotal?: number;
  checkOpenedAt?: string;
  onTap: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onEditRequest: () => void;
  onRemove: () => void;
  onStubAction: (action: "transfer" | "merge") => void;
}

/** Single table on the floor canvas — status color, occupied total+timer, drag-to-move in editor mode. */
export function TableTile({
  table, scale, editMode, checkTotal, checkOpenedAt,
  onTap, onMove, onEditRequest, onRemove, onStubAction,
}: TableTileProps) {
  const { t } = useTranslation("fnb");
  const { lang } = useAppearance();
  const dir = dirOf(lang);
  const elapsed = useElapsed(checkOpenedAt);
  const { w, h } = tileDims(table.shape, table.seats);

  const [pos, setPos] = useState({ x: table.x, y: table.y });
  useEffect(() => { setPos({ x: table.x, y: table.y }); }, [table.x, table.y]);

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; dragged: boolean } | null>(null);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editMode) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: table.x, origY: table.y, dragged: false };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editMode || !dragRef.current) return;
    const dxScreen = e.clientX - dragRef.current.startX;
    const dyScreen = e.clientY - dragRef.current.startY;
    if (Math.abs(dxScreen) > 3 || Math.abs(dyScreen) > 3) dragRef.current.dragged = true;
    const dxInline = (dir === "rtl" ? -dxScreen : dxScreen) / scale;
    const dyBlock = dyScreen / scale;
    setPos({
      x: Math.max(0, Math.round(dragRef.current.origX + dxInline)),
      y: Math.max(0, Math.round(dragRef.current.origY + dyBlock)),
    });
  };

  const handlePointerUp = () => {
    if (!editMode || !dragRef.current) return;
    const wasDragged = dragRef.current.dragged;
    dragRef.current = null;
    if (wasDragged) {
      onMove(table.id, pos.x, pos.y);
    } else {
      onEditRequest();
    }
  };

  return (
    <div
      className="absolute select-none touch-none"
      style={{
        insetInlineStart: pos.x * scale,
        insetBlockStart: pos.y * scale,
        width: w * scale,
        height: h * scale,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <button
        type="button"
        onClick={() => { if (!editMode) onTap(); }}
        className={cn(
          "relative flex h-full w-full flex-col items-center justify-center gap-0.5 border-2 p-1 text-center shadow-sm transition-colors",
          table.shape === "round" ? "rounded-full" : "rounded-md",
          TABLE_STATUS_TILE[table.status],
          editMode && "cursor-move"
        )}
      >
        <span className="text-sm font-bold tabular-nums leading-none">{table.number}</span>
        <span className="flex items-center gap-0.5 text-[10px] opacity-80">
          <Users className="h-2.5 w-2.5" /> {table.seats}
        </span>
        {table.status === "occupied" && checkTotal != null && (
          <span className="text-[10px] font-semibold tabular-nums">{formatMoney(checkTotal, lang)}</span>
        )}
        {table.status === "occupied" && elapsed && (
          <span className="text-[10px] tabular-nums" dir="ltr">{elapsed}</span>
        )}
        {table.status === "reserved" && table.reserved_for && (
          <span className="text-[9px] truncate max-w-full px-0.5">{table.reserved_for}</span>
        )}
      </button>

      {editMode && (
        <Button
          type="button"
          variant="solid"
          tone="danger"
          size="icon"
          className="absolute -top-2 -end-2 h-6 w-6 rounded-full shrink-0 z-10"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={t("floor.remove_table")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      {!editMode && table.status === "occupied" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="soft"
              tone="secondary"
              size="icon"
              className="absolute -top-2 -end-2 h-6 w-6 rounded-full shrink-0 z-10"
              onClick={(e) => e.stopPropagation()}
              aria-label={t("floor.transfer_table")}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onStubAction("transfer")}>{t("floor.transfer_table")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onStubAction("merge")}>{t("floor.merge_tables")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
