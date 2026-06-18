import { useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth";
import { mockVerify2FA, mockGetUserById } from "@/lib/mock/auth";

export function TwoFAPage() {
  const { t }      = useTranslation("auth");
  const navigate   = useNavigate();
  const { pendingUserId, setUser } = useAuthStore();
  const inputRef   = useRef<HTMLInputElement>(null);

  const [code,     setCode]    = useState("");
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState<string | null>(null);

  // Guard: no pending 2FA → back to login
  if (!pendingUserId) return <Navigate to="/auth/login" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const valid = await mockVerify2FA(code.trim());

    if (!valid) {
      setLoading(false);
      setError(t("twofa.error_invalid"));
      setCode("");
      inputRef.current?.focus();
      return;
    }

    const user = await mockGetUserById(pendingUserId);
    setLoading(false);

    if (user) {
      setUser(user);
      navigate("/", { replace: true });
    } else {
      setError(t("twofa.error_invalid"));
    }
  };

  return (
    <>
      <CardHeader className="items-center text-center pb-4">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">{t("twofa.title")}</CardTitle>
        <CardDescription>{t("twofa.subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="twofa-code">{t("twofa.field_code")}</Label>
            <Input
              id="twofa-code"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              disabled={loading}
              dir="ltr"
              className="text-center text-xl tracking-[0.5em] font-mono"
              placeholder="• • • • • •"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.length !== 6}
          >
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("twofa.submit")}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-1 pt-0 pb-5">
        <p className="text-xs text-muted-foreground">{t("twofa.hint")}</p>
        <p className="text-xs text-muted-foreground/60 italic">{t("twofa.mock_hint")}</p>
      </CardFooter>
    </>
  );
}
