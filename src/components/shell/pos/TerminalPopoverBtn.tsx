import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PosSettingsPage from "@/features/pos/SettingsPage";

/** Terminal settings (FE_09 §12) mounted inside a popover — dismiss returns to the cashier. */
export function TerminalPopoverBtn() {
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
          aria-label={t("layout.terminal")}
          aria-expanded={open}
          title={t("layout.terminal")}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(640px,calc(100vw-2rem))] max-h-[min(600px,calc(100vh-6rem))] overflow-y-auto p-4"
      >
        <PosSettingsPage />
      </PopoverContent>
    </Popover>
  );
}
