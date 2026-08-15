import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth";
import { mockLogin } from "@/lib/mock/auth";

export function LoginPage() {
  const { t }   = useTranslation("auth");
  const navigate = useNavigate();
  const { user, devBypass, setUser, setPendingUserId, setDevBypass } = useAuthStore();

  const [login,       setLogin]       = useState("");
  const [password,    setPassword]    = useState("");
  const [rememberMe,  setRememberMe]  = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Already authenticated — skip straight to the app
  if (!devBypass && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await mockLogin(login.trim(), password);
    setLoading(false);

    if (result.ok) {
      setUser(result.user);
      navigate("/", { replace: true });
      return;
    }

    if (!result.ok && "requires2FA" in result && result.requires2FA) {
      setPendingUserId(result.userId);
      navigate("/auth/2fa", { replace: true });
      return;
    }

    if (!result.ok && "error" in result) {
      const key = result.error === "invalid_credentials"
        ? "login.error_invalid"
        : result.error === "suspended"
        ? "login.error_suspended"
        : "login.error_generic";
      setError(t(key));
    }
  };

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{t("login.title")}</CardTitle>
        <CardDescription>{t("login.subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Inline error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login identifier */}
          <div className="space-y-1.5">
            <Label htmlFor="login-id">{t("login.field_login")}</Label>
            <Input
              id="login-id"
              type="text"
              inputMode="email"
              autoComplete="username"
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              disabled={loading}
              dir="ltr"
              className="ltr:text-start rtl:text-start"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="login-pwd">{t("login.field_password")}</Label>
            <div className="relative">
              <Input
                id="login-pwd"
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(Boolean(v))}
              disabled={loading}
            />
            <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
              {t("login.remember_me")}
            </Label>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading || !login || !password}>
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("login.submit")}
          </Button>
        </form>

        {/* Dev bypass toggle */}
        <div className="pt-1">
          <Separator className="mb-3" />
          <div className="flex items-center gap-2">
            <Checkbox
              id="dev-bypass"
              checked={devBypass}
              onCheckedChange={(v) => setDevBypass(Boolean(v))}
            />
            <Label htmlFor="dev-bypass" className="text-xs font-normal text-muted-foreground cursor-pointer">
              {t("login.dev_bypass")}
            </Label>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-center pt-0 pb-5">
        <Link
          to="/auth/forgot-password"
          className="text-sm text-primary hover:underline underline-offset-4"
        >
          {t("login.forgot_password")}
        </Link>
      </CardFooter>
    </>
  );
}
