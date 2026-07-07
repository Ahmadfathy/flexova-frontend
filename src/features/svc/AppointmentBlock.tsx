import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GRID_HEIGHT, GRID_START_MIN, PX_PER_MIN, SNAP_MIN } from "./scheduling";

interface AppointmentBlockProps {
  top: number;
  left: number;
  width: number | string;
  height: number;
  colorClass: string;
  timeLabel: string;
  clientLabel: string;
  serviceLabel: string;
  ariaLabel: string;
  /** Drag/resize enabled — gated by `svc.appointment.book` upstream. */
  interactive: boolean;
  dir: "rtl" | "ltr";
  columnWidth: number;
  columnCount: number;
  /** Mobile single-provider view — horizontal drag (provider reassignment) disabled, only time/duration change. */
  singleColumn: boolean;
  onTap: () => void;
  /** `startMin` is minute-of-day (not grid-relative) — ready to hand straight to `composeIso`. */
  onCommitMove: (columnIndex: number, startMin: number) => void;
  onCommitResize: (durationMin: number) => void;
}

const MIN_HEIGHT = 30;
const MIN_DURATION_PX = (15 / 1) * PX_PER_MIN;

/** A booked slot on the day grid — drag to reschedule (time + provider column), drag the bottom handle to resize (duration). Local `pos` mirrors the `TableTile` pattern: it previews the move during the gesture and only commits (via the parent's store call) on release; if the store rejects it (conflict), the next render's synced `top/left/height` snaps it right back. */
export function AppointmentBlock({
  top, left, width, height, colorClass, timeLabel, clientLabel, serviceLabel, ariaLabel,
  interactive, dir, columnWidth, columnCount, singleColumn,
  onTap, onCommitMove, onCommitResize,
}: AppointmentBlockProps) {
  const [pos, setPos] = useState({ top, left, height });
  useEffect(() => { setPos({ top, left, height }); }, [top, left, height]);

  const dragRef = useRef<{
    startX: number; startY: number; origTop: number; origLeft: number; origHeight: number;
    mode: "move" | "resize"; dragged: boolean;
  } | null>(null);

  // Pointer capture always engages (so tap-to-view keeps working via the drag-threshold
  // check below even on non-interactive blocks, e.g. completed/cancelled) — only the
  // resize handle itself is conditionally rendered on `interactive`, and `handlePointerMove`
  // skips the actual position preview when dragging is disabled.
  const beginDrag = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origTop: top, origLeft: left, origHeight: height, mode, dragged: false };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dxScreen = e.clientX - drag.startX;
    const dyScreen = e.clientY - drag.startY;
    if (Math.abs(dxScreen) > 3 || Math.abs(dyScreen) > 3) drag.dragged = true;
    if (!interactive) return;

    if (drag.mode === "resize") {
      const rawHeight = drag.origHeight + dyScreen;
      const snappedHeight = Math.max(MIN_DURATION_PX, Math.round(rawHeight / (SNAP_MIN * PX_PER_MIN)) * (SNAP_MIN * PX_PER_MIN));
      const clampedHeight = Math.min(snappedHeight, GRID_HEIGHT - drag.origTop);
      setPos((p) => ({ ...p, height: clampedHeight }));
      return;
    }

    const dxInline = dir === "rtl" ? -dxScreen : dxScreen;
    let newLeft = drag.origLeft;
    if (!singleColumn) {
      const rawLeft = drag.origLeft + dxInline;
      const columnIndex = Math.max(0, Math.min(columnCount - 1, Math.round(rawLeft / columnWidth)));
      newLeft = columnIndex * columnWidth;
    }
    const rawTop = drag.origTop + dyScreen;
    const snappedTop = Math.round(rawTop / (SNAP_MIN * PX_PER_MIN)) * (SNAP_MIN * PX_PER_MIN);
    const clampedTop = Math.max(0, Math.min(snappedTop, GRID_HEIGHT - drag.origHeight));
    setPos((p) => ({ ...p, top: clampedTop, left: newLeft }));
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.dragged) {
      onTap();
      return;
    }
    if (!interactive) return;
    if (drag.mode === "resize") {
      onCommitResize(Math.round(pos.height / PX_PER_MIN));
    } else {
      const columnIndex = singleColumn ? 0 : Math.round(pos.left / columnWidth);
      // pos.top is grid-relative (0 = GRID_START_MIN) — the callback contract is minute-of-day.
      onCommitMove(columnIndex, Math.round(pos.top / PX_PER_MIN) + GRID_START_MIN);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn(
        "absolute select-none touch-none rounded border shadow-sm px-1.5 py-1 overflow-hidden text-[11px] leading-tight focus-visible:ring-2 focus-visible:ring-brand",
        colorClass,
        interactive && "cursor-move"
      )}
      style={{ insetInlineStart: pos.left, insetBlockStart: pos.top, width, height: Math.max(pos.height, MIN_HEIGHT) }}
      onPointerDown={beginDrag("move")}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(); } }}
    >
      <p className="font-bold tabular-nums truncate">{timeLabel}</p>
      <p className="font-semibold truncate">{clientLabel}</p>
      <p className="truncate opacity-80">{serviceLabel}</p>

      {interactive && (
        <div
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
          onPointerDown={beginDrag("resize")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      )}
    </div>
  );
}
