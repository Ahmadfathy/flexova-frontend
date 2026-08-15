import { cn } from "@/lib/utils"

interface TimePickerProps {
  /** "HH:mm" 24-hour time string */
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
}

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

export function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const parts = (value ?? "09:00").split(":")
  const h = parts[0] ?? "09"
  const m = parts[1] ?? "00"

  const selectCls =
    "flex-1 min-w-0 bg-transparent text-sm tabular-nums text-center appearance-none focus:outline-none disabled:cursor-not-allowed"

  return (
    <div
      className={cn(
        "flex h-10 items-center gap-0.5 rounded border border-input bg-background px-3 text-sm",
        "hover:border-foreground transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      dir="ltr"
    >
      <select
        value={h}
        disabled={disabled}
        onChange={e => onChange?.(`${e.target.value}:${m}`)}
        className={selectCls}
        aria-label="hour"
      >
        {HOURS.map(hr => (
          <option key={hr} value={hr}>{hr}</option>
        ))}
      </select>
      <span className="text-muted-foreground select-none font-medium">:</span>
      <select
        value={m}
        disabled={disabled}
        onChange={e => onChange?.(`${h}:${e.target.value}`)}
        className={selectCls}
        aria-label="minute"
      >
        {MINUTES.map(mn => (
          <option key={mn} value={mn}>{mn}</option>
        ))}
      </select>
    </div>
  )
}
