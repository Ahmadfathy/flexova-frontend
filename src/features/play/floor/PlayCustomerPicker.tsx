import { useState } from "react";
import { useTranslation } from "react-i18next";
import { User, UserPlus } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { useAppearance } from "@/stores/appearance";
import { CustomerCreateModal } from "@/features/crm/customers/CustomerCreateModal";
import crmFixtures from "@/lib/mock/fixtures/crm.fixtures.json";
import type { SessionCustomer } from "@/features/play/types";

interface CrmCustomer {
  id: string;
  name_ar: string;
  name_en: string;
  phone: string;
  trn?: string;
}

const CUSTOMERS = crmFixtures.customers as CrmCustomer[];

interface PlayCustomerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (customer: SessionCustomer) => void;
}

/** Quick-pick a customer for a session (§5.2) — same CRM search + quick-add shape as
 * `RprCustomerPicker`/POS's `CustomerPickerDialog`, but Play's `Session.customer` is only
 * `{ name, phone, trn? }` (no CRM id), so picking just maps the CRM record down to that shape
 * — `trn` rides along so End & Bill (§5.7) can tell B2C from B2B. */
export function PlayCustomerPicker({ open, onOpenChange, onPick }: PlayCustomerPickerProps) {
  const { t } = useTranslation("play");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder={t("floor.customer_search_placeholder")} />
        <CommandList>
          <CommandEmpty>{tCommon("no_results")}</CommandEmpty>

          <CommandGroup>
            {CUSTOMERS.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name_ar} ${c.name_en} ${c.phone}`}
                onSelect={() => {
                  onPick({ name: lang === "ar" ? c.name_ar : c.name_en, phone: c.phone, trn: c.trn || undefined });
                  onOpenChange(false);
                }}
              >
                <User className="h-4 w-4 me-2 text-muted-foreground shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{lang === "ar" ? c.name_ar : c.name_en}</span>
                  <span className="text-xs text-muted-foreground tabular-nums" dir="ltr">{c.phone}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup>
            <CommandItem onSelect={() => { onOpenChange(false); setQuickAddOpen(true); }}>
              <UserPlus className="h-4 w-4 me-2" /> {t("floor.customer_add_new")}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <CustomerCreateModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  );
}
