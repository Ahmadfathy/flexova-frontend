import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical, UserPlus, X } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";

import { cn } from "@/lib/utils";
import type { WholesaleCustomer } from "@/types/wholesale";

interface RouteBuilderProps {
  /** Ordered customer ids — index in this array is the route sequence. */
  customerIds: string[];
  allCustomers: WholesaleCustomer[];
  lang: "ar" | "en";
  onChange: (newIds: string[]) => void;
  disabled?: boolean;
  className?: string;
}

/** Drag-and-drop ordered customer list for the route editor (FE_13 §7). */
export function RouteBuilder({ customerIds, allCustomers, lang, onChange, disabled, className }: RouteBuilderProps) {
  const { t } = useTranslation("wholesale");
  const [comboOpen, setComboOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const customerMap = useMemo(() => Object.fromEntries(allCustomers.map((c) => [c.id, c])), [allCustomers]);
  const availableToAdd = useMemo(
    () => allCustomers.filter((c) => !customerIds.includes(c.id)),
    [allCustomers, customerIds],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = customerIds.indexOf(String(active.id));
    const newIndex = customerIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(customerIds, oldIndex, newIndex));
  }

  function addCustomer(id: string) {
    onChange([...customerIds, id]);
    setComboOpen(false);
  }

  function removeCustomer(id: string) {
    onChange(customerIds.filter((cid) => cid !== id));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {t("route_editor.customers_count", { n: customerIds.length })}
        </p>
        {!disabled && (
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-3.5 w-3.5 me-1.5" />
                {t("route_editor.add_customer")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder={t("route_editor.search_customer_placeholder")} />
                <CommandList>
                  <CommandEmpty>{t("route_editor.no_customers_found")}</CommandEmpty>
                  <CommandGroup>
                    {availableToAdd.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name_ar} ${c.name_en}`}
                        onSelect={() => addCustomer(c.id)}
                      >
                        {lang === "ar" ? c.name_ar : c.name_en}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {customerIds.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded">
          {t("route_editor.no_customers_yet")}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={customerIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {customerIds.map((id, index) => (
                <SortableCustomerRow
                  key={id}
                  id={id}
                  index={index}
                  customer={customerMap[id]}
                  lang={lang}
                  disabled={disabled}
                  onRemove={() => removeCustomer(id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface SortableCustomerRowProps {
  id: string;
  index: number;
  customer: WholesaleCustomer | undefined;
  lang: "ar" | "en";
  disabled?: boolean;
  onRemove: () => void;
}

function SortableCustomerRow({ id, index, customer, lang, disabled, onRemove }: SortableCustomerRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded border border-border bg-card px-3 py-2",
        isDragging && "opacity-50 shadow-lg z-10",
      )}
    >
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none shrink-0"
          aria-label="drag"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <span className="text-xs tabular-nums text-muted-foreground w-5 shrink-0">{index + 1}</span>
      <span className="flex-1 text-sm truncate">
        {customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : id}
      </span>
      {!disabled && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-danger shrink-0" onClick={onRemove}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  );
}
