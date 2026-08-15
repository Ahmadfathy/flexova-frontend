import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, UserPlus } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { useAppearance } from "@/stores/appearance";
import { useProjectsStore } from "@/stores/projectsStore";
import { ProjectClientCreateModal } from "./ProjectClientCreateModal";
import type { ProjectClient } from "@/features/projects/types";

interface ProjectClientPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (client: ProjectClient) => void;
}

/** Client search + quick-add — mirrors repair's `RprCustomerPicker` (spec §4.9: "CRM picker + quick-add"). */
export function ProjectClientPicker({ open, onOpenChange, onPick }: ProjectClientPickerProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();
  const clients = useProjectsStore((s) => s.clients);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const list = Object.values(clients);

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder={t("client_modal.search_placeholder")} />
        <CommandList>
          <CommandEmpty>{tCommon("no_results")}</CommandEmpty>

          <CommandGroup>
            {list.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name_ar} ${c.name_en} ${c.trn ?? ""}`}
                onSelect={() => { onPick(c); onOpenChange(false); }}
              >
                <Building2 className="h-4 w-4 me-2 text-muted-foreground shrink-0" />
                <span className="min-w-0 truncate">{lang === "ar" ? c.name_ar : c.name_en}</span>
                {c.trn && <span className="ms-2 text-xs text-muted-foreground" dir="ltr">{c.trn}</span>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup>
            <CommandItem onSelect={() => { onOpenChange(false); setQuickAddOpen(true); }}>
              <UserPlus className="h-4 w-4 me-2" /> {t("client_modal.add_new")}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <ProjectClientCreateModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={(client) => onPick(client)}
      />
    </>
  );
}
