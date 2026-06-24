import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { ar } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface DatePickerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  /** ISO date string "YYYY-MM-DD" */
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  /** ISO "YYYY-MM-DD" lower bound */
  min?: string
  /** ISO "YYYY-MM-DD" upper bound */
  max?: string
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ value, onChange, placeholder, min, max, className, disabled, id, ...rest }, ref) => {
    const [open, setOpen] = React.useState(false)

    const lang  = document.documentElement.lang || "ar"
    const dir   = (document.documentElement.dir  || "rtl") as "ltr" | "rtl"
    const isAr  = lang.startsWith("ar")

    const selected  = value?.length === 10 ? parse(value, "yyyy-MM-dd", new Date()) : undefined
    const hasDate   = selected != null && isValid(selected)
    const fromDate  = min ? parse(min, "yyyy-MM-dd", new Date()) : undefined
    const toDate    = max ? parse(max, "yyyy-MM-dd", new Date()) : undefined

    function displayDate(): string {
      if (!hasDate) return placeholder ?? (isAr ? "اختر تاريخاً" : "Select date")
      if (isAr) {
        const day   = selected!.getDate()
        const year  = selected!.getFullYear()
        const month = format(selected!, "MMMM", { locale: ar })
        return `${day} ${month} ${year}`
      }
      return format(selected!, "MMM d, yyyy")
    }

    function handleSelect(date: Date | undefined) {
      if (date) {
        onChange?.(format(date, "yyyy-MM-dd"))
        setOpen(false)
      }
    }

    return (
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded border border-input bg-background px-3 py-2 text-sm",
              "hover:border-foreground focus:border-foreground transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !hasDate && "text-muted-foreground",
              className
            )}
            {...rest}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
            <span className="flex-1 text-start tabular-nums">{displayDate()}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align={dir === "rtl" ? "end" : "start"}
          sideOffset={4}
        >
          <Calendar
            mode="single"
            dir={dir}
            locale={isAr ? ar : undefined}
            selected={hasDate ? selected : undefined}
            onSelect={handleSelect}
            defaultMonth={hasDate ? selected : new Date()}
            fromDate={fromDate}
            toDate={toDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    )
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker }
