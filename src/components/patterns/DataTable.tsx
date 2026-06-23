import React, { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "./Skeletons";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Right-aligns the column and applies tabular-nums */
  numeric?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  keyExtractor: (row: T) => string;
  className?: string;
}

type SortDir = "asc" | "desc" | null;

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  onRetry,
  keyExtractor,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function handleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortKey(null); setSortDir(null);
  }

  if (loading) return <TableSkeleton />;
  if (error)   return <ErrorState description={error} onRetry={onRetry} />;
  if (data.length === 0) return <EmptyState />;

  return (
    <Table className={className}>
      <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm">
        <TableRow className="border-b border-border hover:bg-transparent">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                "h-11 py-0 px-4 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                col.numeric && "text-end",
                col.sortable && "cursor-pointer select-none hover:text-foreground",
                col.className
              )}
              onClick={col.sortable ? () => handleSort(col.key) : undefined}
            >
              <span className="inline-flex items-center gap-1">
                {col.header}
                {col.sortable && (
                  sortKey === col.key ? (
                    sortDir === "asc"
                      ? <ChevronUp className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 opacity-40" />
                  )
                )}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((row) => (
          <TableRow
            key={keyExtractor(row)}
            className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
          >
            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={cn(
                  "px-4 py-3.5",
                  col.numeric && "text-end tabular-nums num",
                  col.className
                )}
              >
                {col.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ─────────────────────────────────────────────────────────────
   EntityCell — avatar/icon + primary name + secondary label
   ───────────────────────────────────────────────────────────── */
export interface EntityCellProps {
  /** Image URL for the avatar */
  avatarSrc?: string;
  /** Fallback initials / character for the avatar */
  avatarFallback?: string;
  /** Primary line (bold) */
  name: string;
  /** Secondary line (muted, smaller) */
  sub?: string;
  /** Override avatar background color class */
  avatarClass?: string;
}

export function EntityCell({
  avatarSrc,
  avatarFallback,
  name,
  sub,
  avatarClass,
}: EntityCellProps) {
  return (
    <span className="flex items-center gap-3 min-w-0">
      <Avatar className={cn("h-8 w-8 shrink-0 rounded", avatarClass)}>
        {avatarSrc && <AvatarImage src={avatarSrc} alt={name} />}
        <AvatarFallback className="rounded text-xs bg-brand-tint text-brand-text font-semibold">
          {avatarFallback ?? name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground truncate leading-snug">
          {name}
        </span>
        {sub && (
          <span className="block text-xs text-muted-foreground truncate leading-normal">
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   ActionCell — compact icon-button row for row actions
   ───────────────────────────────────────────────────────────── */
export interface ActionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "ghost" | "destructive";
}

export function ActionCell({ actions }: { actions: ActionItem[] }) {
  return (
    <span className="flex items-center justify-end gap-0.5">
      {actions.map((a) => (
        <Button
          key={a.label}
          size="icon"
          variant="ghost"
          className={cn(
            "h-7 w-7",
            a.variant === "destructive" && "hover:text-danger hover:bg-danger-tint"
          )}
          onClick={(e) => { e.stopPropagation(); a.onClick(); }}
          aria-label={a.label}
        >
          {a.icon}
        </Button>
      ))}
    </span>
  );
}
