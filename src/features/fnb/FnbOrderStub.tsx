import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Stub target for /fnb/order/:checkId — the Order screen lands in the next step. */
export default function FnbOrderStub() {
  const { t } = useTranslation("fnb");
  const navigate = useNavigate();
  const { checkId } = useParams<{ checkId: string }>();

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex items-center justify-center h-14 w-14 rounded-full bg-brand-tint text-brand-text">
        <UtensilsCrossed className="h-7 w-7" />
      </span>
      <p className="text-base font-semibold text-foreground">{t("order_stub.title")}</p>
      <p className="text-sm text-muted-foreground max-w-sm">{t("order_stub.body")}</p>
      <p className="text-xs text-muted-foreground tabular-nums" dir="ltr">
        {t("order_stub.check_id")}: {checkId}
      </p>
      <Button variant="outline" size="sm" className="h-11 mt-2" onClick={() => navigate("/fnb/floor")}>
        <ArrowLeft className="h-4 w-4 me-1.5 rtl:-scale-x-100" />
        {t("order_stub.back_to_floor")}
      </Button>
    </div>
  );
}
