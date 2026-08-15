import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockSetPassword } from "@/lib/mock/auth";

const MIN_LEN = 8;

function PolicyRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {met
        ? <Check className="h-3.5 w-3.5 text-success shrink-0" />
        : <X    className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      <span className={met ? "text-success" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

export function SetPasswordPage() {
  const { t }      = useTranslation("auth");
  const navigate   = useNavigate();
  const [pwd,      setPwd]      = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const hasLength = pwd.length >= MIN_LEN;
  const hasNumber = /\d/.test(pwd);
  const policyMet = hasLength && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!policyMet) {
      setError(!hasLength ? t("reset.error_short", { n: MIN_LEN }) : t("reset.error_no_number"));
      return;
    }
    if (pwd !== confirm) {
      setError(t("reset.error_mismatch"));
      return;
    }

    setLoading(true);
    await mockSetPassword(pwd);
    setLoading(false);
    navigate("/", { replace: true });
  };

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{t("set_password.title")}</CardTitle>
        <CardDescription>{t("set_password.subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="set-pwd">{t("set_password.field_password")}</Label>
            <div className="relative">
              <Input
                id="set-pwd"
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                autoFocus
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
                disabled={loading}
                dir="ltr"
                className="pe-9"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {pwd.length > 0 && (
              <ul className="mt-1.5 space-y-1 ps-1">
                <PolicyRow met={hasLength} label={t("policy.min_length", { n: MIN_LEN })} />
                <PolicyRow met={hasNumber} label={t("policy.require_number")} />
              </ul>
            )}
          </div>

          {/* Confirm */}
          <div className="space-y-1.5">
            <Label htmlFor="set-confirm">{t("set_password.field_confirm")}</Label>
            <Input
              id="set-confirm"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading}
              dir="ltr"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !pwd || !confirm}>
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("set_password.submit")}
          </Button>
        </form>
      </CardContent>
    </>
  );
}
