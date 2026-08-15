import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { User, UserPlus, UserRound } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import type { Lang } from "@/stores/appearance";
import { CLIENTS, clientName } from "./catalog";

interface ClientPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  onPickClient: (clientId: string) => void;
  onPickWalkIn?: () => void;
  /** Packages/subscriptions carry a balance tied to a stable client id — walk-in (no CRM record) doesn't have one, so those sell flows hide this option. Defaults to shown (Appointment booking). */
  allowWalkIn?: boolean;
}

/** Client quick-pick for the Appointment drawer — CRM customers + walk-in + add-new (stub, mirrors the POS customer picker). */
export function ClientPicker({ open, onOpenChange, lang, onPickClient, onPickWalkIn, allowWalkIn = true }: ClientPickerProps) {
  const { t } = useTranslation("svc");
  const { t: tCommon } = useTranslation("common");

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("appointment.client_search_placeholder")} />
      <CommandList>
        <CommandEmpty>{tCommon("no_results")}</CommandEmpty>

        {allowWalkIn && onPickWalkIn && (
          <CommandGroup>
            <CommandItem onSelect={() => { onPickWalkIn(); onOpenChange(false); }}>
              <UserRound className="h-4 w-4 me-2 text-muted-foreground shrink-0" />
              {t("appointment.walk_in_option")}
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading={t("appointment.client_picker_heading")}>
          {CLIENTS.map((c) => (
            <CommandItem
              key={c.id}
              value={`${c.name_ar} ${c.name_en}`}
              onSelect={() => { onPickClient(c.id); onOpenChange(false); }}
            >
              <User className="h-4 w-4 me-2 text-muted-foreground shrink-0" />
              {clientName(c, lang)}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup>
          <CommandItem onSelect={() => { toast.info(t("appointment.client_add_stub")); onOpenChange(false); }}>
            <UserPlus className="h-4 w-4 me-2" /> {t("appointment.client_add_new")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
