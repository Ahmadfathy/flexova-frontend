import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { User, UserPlus } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { useAppearance } from "@/stores/appearance";
import type { PosCustomer } from "@/stores/posRegister";
import crmFixtures from "@/lib/mock/fixtures/CRM.fixtures.json";

interface CrmCustomer {
  id: string;
  type: string;
  name_ar: string;
  name_en: string;
  phone: string;
  credit_limit: number;
  ar_balance: number;
}

const CUSTOMERS = crmFixtures.customers as CrmCustomer[];

interface CustomerPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (customer: PosCustomer) => void;
}

export function CustomerPickerDialog({ open, onOpenChange, onPick }: CustomerPickerDialogProps) {
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("customer_picker.search_placeholder")} />
      <CommandList>
        <CommandEmpty>{tCommon("no_results")}</CommandEmpty>
        <CommandGroup heading={t("customer_picker.heading")}>
          {CUSTOMERS.map(c => (
            <CommandItem
              key={c.id}
              value={`${c.name_ar} ${c.name_en} ${c.phone}`}
              onSelect={() => {
                onPick({
                  id: c.id,
                  type: c.type === "company" ? "company" : "individual",
                  name_ar: c.name_ar,
                  name_en: c.name_en,
                  credit_limit: c.credit_limit,
                  ar_balance: c.ar_balance,
                });
                onOpenChange(false);
              }}
            >
              <User className="h-4 w-4 me-2 text-muted-foreground shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate">{lang === "ar" ? c.name_ar : c.name_en}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{c.phone}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup>
          <CommandItem onSelect={() => { toast.info(t("customer_picker.create_stub")); onOpenChange(false); }}>
            <UserPlus className="h-4 w-4 me-2" /> {t("customer_picker.create_new")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
