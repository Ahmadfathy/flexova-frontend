import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Same Fullscreen API integration as the back-office Topbar's button
 * (FE_00 §14.5) — duplicated here rather than imported since that button
 * is a private, non-exported component inside Topbar.tsx.
 */
export function FullscreenBtn() {
  const { t } = useTranslation("shell");
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const update = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return (
    <Button
      variant="icon"
      size="icon"
      className="h-11 w-11 shrink-0"
      onClick={toggle}
      aria-label={fs ? t("topbar.fullscreen_exit") : t("topbar.fullscreen_enter")}
    >
      {fs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
    </Button>
  );
}
