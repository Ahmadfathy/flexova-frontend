import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PosJournalPage from "@/features/pos/JournalPage";

/** Terminal journal (FE_09 §11) mounted inside a popover — dismiss returns to the cashier. */
export function JournalPopoverBtn() {
  const { t } = useTranslation("pos");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={open ? "soft" : "icon"}
          tone={open ? "primary" : undefined}
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label={t("layout.journal")}
          aria-expanded={open}
          title={t("layout.journal")}
        >
          <BookText className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(640px,calc(100vw-2rem))] max-h-[min(600px,calc(100vh-6rem))] overflow-y-auto p-4"
      >
        <PosJournalPage />
      </PopoverContent>
    </Popover>
  );
}
