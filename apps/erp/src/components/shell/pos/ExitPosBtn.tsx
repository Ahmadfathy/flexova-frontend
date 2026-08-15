import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { getPosExitTarget } from "./PosExitTracker";

interface ExitPosBtnProps {
  hasOpenTicket: boolean;
}

export function ExitPosBtn({ hasOpenTicket }: ExitPosBtnProps) {
  const { t } = useTranslation("pos");
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const exit = () => navigate(getPosExitTarget());

  return (
    <>
      <Button
        variant="soft"
        tone="danger"
        size="sm"
        className="h-11 gap-1.5 shrink-0"
        onClick={() => (hasOpenTicket ? setConfirmOpen(true) : exit())}
      >
        <DoorOpen className="h-4 w-4" />
        <span className="hidden md:inline">{t("layout.exit")}</span>
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("layout.exit_confirm_title")}
        description={t("layout.exit_confirm")}
        confirmTone="warning"
        confirmLabel={t("layout.exit")}
        onConfirm={() => {
          setConfirmOpen(false);
          exit();
        }}
      />
    </>
  );
}
