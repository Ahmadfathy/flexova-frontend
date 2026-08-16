import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, Plus, X, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { FormField, FormGrid, FormActions } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useEcommerceSettings } from "@/stores/ecommerceSettings";
import type { EcStoreConfig } from "../types";

const THEME_META: Record<string, { label_ar: string; layout: string }> = {
  aurora: { label_ar: "أورورا", layout: "شبكة + بانر ترحيبي (grid-hero)" },
  noir: { label_ar: "نوار", layout: "تحريري داكن (editorial-dark)" },
};

/** Small CSS-only mockup standing in for a real theme screenshot (spec
 * §8 "visual gallery + preview per theme") — genuinely mirrors each
 * theme's actual structure from the Storefront app: aurora's grid-hero
 * (banner + product grid), noir's editorial-dark numbered list. */
function ThemePreview({ theme }: { theme: string }) {
  if (theme === "noir") {
    return (
      <div className="rounded border border-border bg-[#121212] p-3 space-y-1.5">
        <div className="h-2 w-1/3 rounded-sm bg-amber-600/70 mx-auto" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[9px] text-amber-500 font-mono">{String(i).padStart(2, "0")}</span>
            <div className="h-1.5 flex-1 rounded-sm bg-white/15" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded border border-border bg-[#fdfaf7] p-3 space-y-1.5">
      <div className="h-4 rounded bg-gradient-to-l from-orange-200 to-pink-200" />
      <div className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 rounded bg-orange-100 border border-orange-200" />
        ))}
      </div>
    </div>
  );
}

/** spec §8 — StoreConfig, the theme architecture's admin surface: active
 * theme (server-side, no FOUC, data-safe switch), store data, policies. */
export function SettingsStorePage() {
  const { t } = useTranslation("ecommerce");
  const can = useCan();
  const canManage = can("ecommerce.settings.manage");

  const config = useEcommerceSettings((s) => s.storeConfig);
  const setActiveTheme = useEcommerceSettings((s) => s.setActiveTheme);
  const updateStoreConfig = useEcommerceSettings((s) => s.updateStoreConfig);

  const [form, setForm] = useState<EcStoreConfig>(config);
  const [socialDraftKey, setSocialDraftKey] = useState("");
  const [socialDraftValue, setSocialDraftValue] = useState("");

  function handleActivateTheme(theme: string) {
    setActiveTheme(theme);
    setForm((f) => ({ ...f, active_theme: theme }));
    toast.success(t("settings.theme_activated_toast", { theme: THEME_META[theme]?.label_ar ?? theme }));
  }

  function addSocial() {
    if (!socialDraftKey.trim() || !socialDraftValue.trim()) return;
    setForm((f) => ({ ...f, social: { ...f.social, [socialDraftKey.trim()]: socialDraftValue.trim() } }));
    setSocialDraftKey(""); setSocialDraftValue("");
  }
  function removeSocial(key: string) {
    setForm((f) => {
      const next = { ...f.social };
      delete next[key];
      return { ...f, social: next };
    });
  }

  function handleSave() {
    updateStoreConfig(form);
    toast.success(t("settings.store_saved_toast"));
  }

  return (
    <div className="space-y-4 pb-10">
      <PageHeader title={t("settings.store_title")} />

      <div className="px-4 space-y-4">
        <PageSection title={t("settings.theme_section_title")} subtitle={t("settings.theme_section_sub")}>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {t("settings.theme_safe_note")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.available_themes.map((theme) => {
              const active = form.active_theme === theme;
              const meta = THEME_META[theme] ?? { label_ar: theme, layout: "" };
              return (
                <div key={theme} className={cn("rounded-lg border p-3 space-y-2", active ? "border-brand ring-1 ring-brand" : "border-border")}>
                  <ThemePreview theme={theme} />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{meta.label_ar}</p>
                      <p className="text-[11px] text-muted-foreground">{meta.layout}</p>
                    </div>
                    {active ? (
                      <span className="flex items-center gap-1 text-xs text-success-text font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("settings.theme_active")}
                      </span>
                    ) : canManage ? (
                      <Button size="sm" variant="outline" onClick={() => handleActivateTheme(theme)}>{t("settings.theme_activate")}</Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </PageSection>

        <PageSection title={t("settings.store_data_title")}>
          <FormGrid cols={2}>
            <FormField label={t("settings.field_store_name")}>
              <Input value={form.store_name} onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))} disabled={!canManage} />
            </FormField>
            <FormField label={t("settings.field_logo")} helper={t("settings.field_logo_helper")}>
              <Input value={form.logo} onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))} disabled={!canManage} />
            </FormField>
            <FormField label={t("settings.field_phone")}>
              <Input dir="ltr" value={form.contact?.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, contact: { ...f.contact, phone: e.target.value } }))} disabled={!canManage} />
            </FormField>
            <FormField label={t("settings.field_email")}>
              <Input dir="ltr" type="email" value={form.contact?.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, contact: { ...f.contact, email: e.target.value } }))} disabled={!canManage} />
            </FormField>
            <FormField label={t("settings.field_default_lang")}>
              <Select value={form.default_lang} onValueChange={(v) => setForm((f) => ({ ...f, default_lang: v as "ar" | "en" }))}>
                <SelectTrigger disabled={!canManage}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("settings.field_rtl")}>
              <div className="flex items-center h-10">
                <Switch checked={form.rtl} onCheckedChange={(v) => setForm((f) => ({ ...f, rtl: v }))} disabled={!canManage} />
              </div>
            </FormField>
          </FormGrid>

          <div className="pt-3 border-t border-border">
            <p className="text-sm font-medium mb-2">{t("settings.field_social")}</p>
            {Object.entries(form.social).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {Object.entries(form.social).map(([key, value]) => (
                  <span key={key} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
                    <span className="text-muted-foreground">{key}:</span> <span dir="ltr">{value}</span>
                    {canManage && (
                      <button type="button" onClick={() => removeSocial(key)} aria-label={t("settings.remove_social")}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {canManage && (
              <div className="flex items-center gap-2">
                <Input value={socialDraftKey} onChange={(e) => setSocialDraftKey(e.target.value)} placeholder={t("settings.social_platform_placeholder")} className="w-32" />
                <Input dir="ltr" value={socialDraftValue} onChange={(e) => setSocialDraftValue(e.target.value)} placeholder={t("settings.social_handle_placeholder")} className="flex-1" />
                <Button variant="outline" onClick={addSocial}><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        </PageSection>

        <PageSection title={t("settings.policies_title")} subtitle={t("settings.policies_sub")}>
          <div className="space-y-4">
            <FormField label={t("settings.policy_shipping")}>
              <Textarea rows={3} value={form.policies?.shipping ?? ""} onChange={(e) => setForm((f) => ({ ...f, policies: { ...f.policies, shipping: e.target.value } }))} disabled={!canManage} />
            </FormField>
            <FormField label={t("settings.policy_returns")}>
              <Textarea rows={3} value={form.policies?.returns ?? ""} onChange={(e) => setForm((f) => ({ ...f, policies: { ...f.policies, returns: e.target.value } }))} disabled={!canManage} />
            </FormField>
            <FormField label={t("settings.policy_privacy")}>
              <Textarea rows={3} value={form.policies?.privacy ?? ""} onChange={(e) => setForm((f) => ({ ...f, policies: { ...f.policies, privacy: e.target.value } }))} disabled={!canManage} />
            </FormField>
          </div>
        </PageSection>

        {canManage && <FormActions onSave={handleSave} saveLabel={t("settings.save")} />}
      </div>
    </div>
  );
}
