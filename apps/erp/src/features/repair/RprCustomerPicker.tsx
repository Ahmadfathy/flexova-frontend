import { useState } from "react";
import { useTranslation } from "react-i18next";
import { User, UserPlus } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import type { Lang } from "@/stores/appearance";
import { CustomerCreateModal } from "@/features/crm/customers/CustomerCreateModal";
import { CUSTOMERS, customerName } from "./catalog";

interface RprCustomerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  onPickCustomer: (customerId: string) => void;
}

/** Intake customer picker — CRM search + quick-add, reusing FE_05's CustomerCreateModal AS-IS (mirrors svc's ClientPicker). */
export function RprCustomerPicker({ open, onOpenChange, lang, onPickCustomer }: RprCustomerPickerProps) {
  const { t } = useTranslation("repair");
  const { t: tCommon } = useTranslation("common");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder={t("intake.customer_search_placeholder")} />
        <CommandList>
          <CommandEmpty>{tCommon("no_results")}</CommandEmpty>

          <CommandGroup>
            {CUSTOMERS.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name_ar} ${c.name_en} ${c.phone ?? ""}`}
                onSelect={() => { onPickCustomer(c.id); onOpenChange(false); }}
              >
                <User className="h-4 w-4 me-2 text-muted-foreground shrink-0" />
                <span className="min-w-0 truncate">{customerName(c, lang)}</span>
                {c.phone && <span className="ms-2 text-xs text-muted-foreground" dir="ltr">{c.phone}</span>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup>
            <CommandItem onSelect={() => { onOpenChange(false); setQuickAddOpen(true); }}>
              <UserPlus className="h-4 w-4 me-2" /> {t("intake.customer_add_new")}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <CustomerCreateModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  );
}
