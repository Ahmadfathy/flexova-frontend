import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import {
  AlertDialogPortal,
  AlertDialogOverlay,
} from "@/components/ui/alert-dialog"
import { Button, type ButtonTone } from "@/components/ui/button"

/*
 * ConfirmDialog — AlertDialog-based confirm sheet with ModalShell visual style.
 *
 * Built on AlertDialogPrimitive (role=alertdialog, focus trap, no overlay close).
 * The confirm button is a plain Button — the caller's onConfirm handler must
 * close the dialog itself (via onOpenChange or its own state update).
 * The cancel button uses AlertDialogPrimitive.Cancel and auto-closes.
 *
 * When onConfirm is undefined → only the cancel/close button is shown.
 * This handles "informational" alerts like blocked-delete messages.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={open} onOpenChange={setOpen}
 *     title="Delete item?"
 *     description="This cannot be undone."
 *     confirmTone="danger"
 *     onConfirm={handleDelete}
 *     loading={deleting}
 *   />
 */

type ConfirmTone = "danger" | "warning" | "primary"

const TONE_MAP: Record<ConfirmTone, ButtonTone> = {
  danger:  "danger",
  warning: "warning",
  primary: "primary",
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
  confirmTone?: ConfirmTone
  /** Called when the confirm button is clicked. Must close the dialog via state. */
  onConfirm?: () => void
  /** Disables both buttons and shows a spinner on the confirm button. */
  loading?: boolean
  /** Extra condition to disable the confirm button (e.g. form validation). */
  confirmDisabled?: boolean
  /** Custom body content — rendered after description. */
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmTone = "danger",
  onConfirm,
  loading = false,
  confirmDisabled = false,
  children,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common")

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-sm",
            "translate-x-[-50%] translate-y-[-50%]",
            "max-h-[85vh] border bg-card shadow-lg duration-200 rounded",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          )}
        >
          {/* ── Header ──────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-border shrink-0">
            <AlertDialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </AlertDialogPrimitive.Title>
          </div>

          {/* ── Body ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-3">
            {description && (
              <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">
                {description}
              </AlertDialogPrimitive.Description>
            )}
            {children}
          </div>

          {/* ── Footer ──────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="ghost" disabled={loading}>
                {cancelLabel ?? t("cancel")}
              </Button>
            </AlertDialogPrimitive.Cancel>

            {onConfirm != null && (
              <Button
                variant="solid"
                tone={TONE_MAP[confirmTone]}
                disabled={loading || confirmDisabled}
                onClick={onConfirm}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
                {confirmLabel ?? t("confirm")}
              </Button>
            )}
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPortal>
    </AlertDialogPrimitive.Root>
  )
}
