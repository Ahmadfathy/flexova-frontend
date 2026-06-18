import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockRequestPasswordReset } from "@/lib/mock/auth";

export function ForgotPasswordPage() {
  const { t }  = useTranslation("auth");
  const [login,   setLogin]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await mockRequestPasswordReset(login.trim());
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <>
        <CardHeader className="items-center text-center pb-4">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <CardTitle className="text-xl">{t("forgot.sent_title")}</CardTitle>
          <CardDescription>{t("forgot.sent_sub")}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center pb-6">
          <Link
            to="/auth/login"
            className="text-sm text-primary hover:underline underline-offset-4"
          >
            {t("forgot.back_to_login_again")}
          </Link>
        </CardFooter>
      </>
    );
  }

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{t("forgot.title")}</CardTitle>
        <CardDescription>{t("forgot.subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-login">{t("forgot.field_login")}</Label>
            <Input
              id="forgot-login"
              type="text"
              inputMode="email"
              autoComplete="username"
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              disabled={loading}
              dir="ltr"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !login}>
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("forgot.submit")}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center pt-0 pb-5">
        <Link
          to="/auth/login"
          className="text-sm text-primary hover:underline underline-offset-4"
        >
          {t("forgot.back_to_login")}
        </Link>
      </CardFooter>
    </>
  );
}
