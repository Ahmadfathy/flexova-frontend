import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Lock } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { ErrorState } from "@/components/patterns/ErrorState";
import { EmptyState } from "@/components/patterns/EmptyState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { TimePicker } from "@/components/patterns/TimePicker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePlayRatePlans, type SaveRatePlanInput } from "@/stores/playRatePlans";
import { resolveRule } from "@/features/play/rate-engine";
import type { RateUnit, Rounding, PlayMode, RateRule, PrepaidBlock } from "@/features/play/types";
import { useRatePlanDetail } from "./useRatePlanDetail";

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const UNITS: RateUnit[] = ["minute", "15m", "30m", "hour"];
const ROUNDINGS: Rounding[] = ["ceil", "nearest", "floor"];

interface EditableRule {
  id: string;
  price_per_unit: string;
  hasWindow: boolean;
  days: string[];
  from: string;
  to: string;
  playMode: PlayMode | "any";
  priority: string;
}

interface EditableBlock {
  id: string;
  name_ar: string;
  name_en: string;
  duration_min: string;
  price: string;
  hasValidity: boolean;
  days: string[];
  from: string;
  to: string;
}

function newRule(): EditableRule {
  return {
    id: crypto.randomUUID(), price_per_unit: "0", hasWindow: false,
    days: [], from: "18:00", to: "23:59", playMode: "any", priority: "1",
  };
}
function newBlock(): EditableBlock {
  return {
    id: crypto.randomUUID(), name_ar: "", name_en: "", duration_min: "60", price: "0",
    hasValidity: false, days: [], from: "18:00", to: "23:59",
  };
}

function ruleToEditable(r: RateRule): EditableRule {
  return {
    id: r.id,
    price_per_unit: String(r.price_per_unit),
    hasWindow: r.window !== null,
    days: r.window?.days ?? [],
    from: r.window?.from ?? "18:00",
    to: r.window?.to ?? "23:59",
    playMode: r.play_mode ?? "any",
    priority: String(r.priority),
  };
}
function blockToEditable(b: PrepaidBlock): EditableBlock {
  return {
    id: b.id,
    name_ar: b.name_ar,
    name_en: b.name_en,
    duration_min: String(b.duration_min),
    price: String(b.price),
    hasValidity: b.validity_window !== null,
    days: b.validity_window?.days ?? [],
    from: b.validity_window?.from ?? "18:00",
    to: b.validity_window?.to ?? "23:59",
  };
}

type TabKey = "basic" | "rules" | "blocks";

export default function RatePlanEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const createRatePlan = usePlayRatePlans((s) => s.createRatePlan);
  const updateRatePlan = usePlayRatePlans((s) => s.updateRatePlan);

  const { ratePlan, notFound, loading, error, isOffline, reload } = useRatePlanDetail(id ?? "");

  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [unit, setUnit] = useState<RateUnit>("hour");
  const [rounding, setRounding] = useState<Rounding>("ceil");
  const [minUnits, setMinUnits] = useState("1");
  const [rules, setRules] = useState<EditableRule[]>([newRule()]);
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [previewMode, setPreviewMode] = useState<PlayMode | "any">("any");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formInit, setFormInit] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isNew || formInit) return;
    if (ratePlan) {
      setNameAr(ratePlan.name_ar);
      setNameEn(ratePlan.name_en);
      setUnit(ratePlan.unit);
      setRounding(ratePlan.rounding);
      setMinUnits(String(ratePlan.min_units));
      setRules(ratePlan.rules.map(ruleToEditable));
      setBlocks(ratePlan.prepaid_blocks.map(blockToEditable));
      setFormInit(true);
    }
  }, [ratePlan, isNew, formInit]);

  // Keeps the "effective now" preview live without a per-card timer storm elsewhere in the app.
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  function patchRule(ruleId: string, patch: Partial<EditableRule>) {
    setRules((rs) => rs.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)));
  }
  function toggleRuleDay(ruleId: string, day: string) {
    setRules((rs) => rs.map((r) => {
      if (r.id !== ruleId) return r;
      const days = r.days.includes(day) ? r.days.filter((d) => d !== day) : [...r.days, day];
      return { ...r, days };
    }));
  }
  function removeRule(ruleId: string) {
    setRules((rs) => rs.filter((r) => r.id !== ruleId));
  }

  function patchBlock(blockId: string, patch: Partial<EditableBlock>) {
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  }
  function toggleBlockDay(blockId: string, day: string) {
    setBlocks((bs) => bs.map((b) => {
      if (b.id !== blockId) return b;
      const days = b.days.includes(day) ? b.days.filter((d) => d !== day) : [...b.days, day];
      return { ...b, days };
    }));
  }
  function removeBlock(blockId: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== blockId));
  }

  function buildRules(): RateRule[] {
    return rules.map((r) => ({
      id: r.id,
      price_per_unit: parseFloat(r.price_per_unit) || 0,
      window: r.hasWindow ? { days: r.days, from: r.from, to: r.to } : null,
      play_mode: r.playMode === "any" ? null : r.playMode,
      priority: parseInt(r.priority, 10) || 1,
    }));
  }
  function buildBlocks(): PrepaidBlock[] {
    return blocks.map((b) => ({
      id: b.id,
      name_ar: b.name_ar.trim(),
      name_en: b.name_en.trim(),
      duration_min: parseInt(b.duration_min, 10) || 0,
      price: parseFloat(b.price) || 0,
      validity_window: b.hasValidity ? { days: b.days, from: b.from, to: b.to } : null,
    }));
  }

  const draftPlan = useMemo(() => ({
    id: ratePlan?.id ?? "draft",
    name_ar: nameAr, name_en: nameEn,
    unit, rounding, min_units: parseInt(minUnits, 10) || 1,
    rules: buildRules(), prepaid_blocks: buildBlocks(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [nameAr, nameEn, unit, rounding, minUnits, rules, blocks, ratePlan?.id]);

  const preview = useMemo(() => {
    void tick;
    try {
      const rule = resolveRule(draftPlan, new Date(), previewMode === "any" ? null : previewMode);
      return { rule, errorMsg: null as string | null };
    } catch {
      return { rule: null, errorMsg: t("rate.preview_no_match") };
    }
  }, [draftPlan, previewMode, tick, t]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!nameAr.trim()) e.name_ar = t("rate.name_ar_required");
    if (!nameEn.trim()) e.name_en = t("rate.name_en_required");
    const builtRules = buildRules();
    if (builtRules.length === 0) e.rules = t("rate.rules_required");
    else if (!builtRules.some((r) => r.window === null)) e.rules = t("rate.fallback_rule_required");
    setErrors(e);
    if (Object.keys(e).length > 0) setActiveTab(e.name_ar || e.name_en ? "basic" : "rules");
    return Object.keys(e).length === 0;
  }

  function buildInput(): SaveRatePlanInput {
    return {
      name_ar: nameAr.trim(), name_en: nameEn.trim(),
      unit, rounding, min_units: parseInt(minUnits, 10) || 1,
      rules: buildRules(), prepaid_blocks: buildBlocks(),
    };
  }

  function handleSave() {
    if (!validate()) return;
    const input = buildInput();
    if (isNew) {
      const created = createRatePlan(input);
      toast.success(t("rate.saved_toast"));
      navigate(`/settings/play/rate-plans/${created.id}`);
    } else {
      updateRatePlan(id!, input);
      toast.success(t("rate.saved_toast"));
      navigate("/settings/play/rate-plans");
    }
  }

  function handleCancel() {
    navigate("/settings/play/rate-plans");
  }

  if (!can("play.config")) {
    return (
      <div>
        <PageHeader title={t("rate.title")} />
        <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-16 text-center">
          <Lock className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("rate.permission_required")}</p>
        </div>
      </div>
    );
  }

  if (!isNew) {
    if (loading) {
      return (
        <div className="space-y-4">
          <PageHeader title={t("rate.form_title_edit")} />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="space-y-4">
          <PageHeader title={t("rate.form_title_edit")} />
          <ErrorState title={t("rate.error_title")} description={t("rate.error_body")} onRetry={reload} />
        </div>
      );
    }
    if (notFound) {
      return (
        <div className="space-y-4">
          <PageHeader title={t("rate.form_title_edit")} />
          <EmptyState
            title={t("rate.not_found_title")}
            description={t("rate.not_found_body")}
            action={{ label: t("rate.back_to_list"), onClick: () => navigate("/settings/play/rate-plans") }}
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={isNew ? t("rate.form_title_new") : t("rate.form_title_edit")}
        alert={isOffline ? <OfflineBanner message={t("rate.offline_note")} /> : undefined}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="h-9 p-1 bg-muted">
          <TabsTrigger value="basic" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("rate.tab_basic")}
          </TabsTrigger>
          <TabsTrigger value="rules" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("rate.tab_rules")}
          </TabsTrigger>
          <TabsTrigger value="blocks" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("rate.tab_blocks")}
          </TabsTrigger>
        </TabsList>

        {/* Basic */}
        <TabsContent value="basic" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("rate.form_name_ar")} *</Label>
              <Input
                value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl"
                className={cn(errors.name_ar && "border-destructive")}
              />
              {errors.name_ar && <p className="text-xs text-destructive">{errors.name_ar}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("rate.form_name_en")} *</Label>
              <Input
                value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr"
                className={cn(errors.name_en && "border-destructive")}
              />
              {errors.name_en && <p className="text-xs text-destructive">{errors.name_en}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("rate.unit")}</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as RateUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{t(`rate.unit_${u}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("rate.rounding")}</Label>
              <Select value={rounding} onValueChange={(v) => setRounding(v as Rounding)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROUNDINGS.map((r) => <SelectItem key={r} value={r}>{t(`rate.rounding_${r}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("rate.min")}</Label>
              <Input type="number" min={1} step={1} value={minUnits} onChange={(e) => setMinUnits(e.target.value)} className="tabular-nums" />
            </div>
          </div>
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules" className="mt-3 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("rate.preview_title")}</p>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="space-y-1 w-40">
                <Label className="text-xs text-muted-foreground">{t("rate.preview_mode")}</Label>
                <Select value={previewMode} onValueChange={(v) => setPreviewMode(v as PlayMode | "any")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t("rate.rule_play_mode_any")}</SelectItem>
                    <SelectItem value="single">{t("dt.play_mode_single")}</SelectItem>
                    <SelectItem value="double">{t("dt.play_mode_double")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("rate.preview_price")}</p>
                {preview.rule ? (
                  <p className="text-lg font-semibold tabular-nums">{formatMoney(preview.rule.price_per_unit, lang)}</p>
                ) : (
                  <p className="text-sm text-danger">{preview.errorMsg}</p>
                )}
              </div>
              {preview.rule && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("rate.preview_rule")}</p>
                  <p className="text-sm font-mono" dir="ltr">{preview.rule.id}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t("rate.rules_title")}</p>
              <Button variant="outline" size="sm" onClick={() => setRules((rs) => [...rs, newRule()])}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("rate.rule_add")}
              </Button>
            </div>
            {errors.rules && <p className="text-xs text-destructive">{errors.rules}</p>}

            <div className="space-y-3">
              {rules.map((r) => (
                <div key={r.id} className="rounded border border-border p-3 space-y-2">
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="space-y-1 w-28">
                      <Label className="text-xs text-muted-foreground">{t("rate.rule_price")} *</Label>
                      <Input
                        type="number" min={0} step={0.01} value={r.price_per_unit}
                        onChange={(e) => patchRule(r.id, { price_per_unit: e.target.value })}
                        className="h-8 tabular-nums"
                      />
                    </div>
                    <div className="space-y-1 w-32">
                      <Label className="text-xs text-muted-foreground">{t("rate.rule_play_mode")}</Label>
                      <Select value={r.playMode} onValueChange={(v) => patchRule(r.id, { playMode: v as PlayMode | "any" })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t("rate.rule_play_mode_any")}</SelectItem>
                          <SelectItem value="single">{t("dt.play_mode_single")}</SelectItem>
                          <SelectItem value="double">{t("dt.play_mode_double")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 w-20">
                      <Label className="text-xs text-muted-foreground">{t("rate.rule_priority")}</Label>
                      <Input
                        type="number" min={1} step={1} value={r.priority}
                        onChange={(e) => patchRule(r.id, { priority: e.target.value })}
                        className="h-8 tabular-nums"
                      />
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 ms-auto text-muted-foreground hover:text-destructive"
                      onClick={() => removeRule(r.id)} aria-label={t("rate.rule_remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={!r.hasWindow}
                      onCheckedChange={(checked) => patchRule(r.id, { hasWindow: checked !== true })}
                    />
                    {t("rate.rule_any_time")}
                  </label>

                  {r.hasWindow && (
                    <div className="flex items-center gap-3 flex-wrap pt-1">
                      <div className="flex gap-1">
                        {DAY_CODES.map((code) => (
                          <button
                            key={code} type="button" onClick={() => toggleRuleDay(r.id, code)}
                            className={cn(
                              "h-7 min-w-9 px-1.5 text-xs rounded border transition-colors",
                              r.days.includes(code)
                                ? "bg-brand text-on-brand border-brand"
                                : "border-input text-muted-foreground hover:border-foreground"
                            )}
                          >
                            {t(`rate.day_${code.toLowerCase()}`)}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground">{t("rate.rule_from")}</Label>
                        <TimePicker value={r.from} onChange={(v) => patchRule(r.id, { from: v })} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground">{t("rate.rule_to")}</Label>
                        <TimePicker value={r.to} onChange={(v) => patchRule(r.id, { to: v })} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Prepaid blocks */}
        <TabsContent value="blocks" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("rate.blocks_title")}</p>
            <Button variant="outline" size="sm" onClick={() => setBlocks((bs) => [...bs, newBlock()])}>
              <Plus className="h-4 w-4 me-1.5" />
              {t("rate.block_add")}
            </Button>
          </div>

          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-3">
              {blocks.map((b) => (
                <div key={b.id} className="rounded border border-border p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("rate.block_name_ar")}</Label>
                      <Input value={b.name_ar} onChange={(e) => patchBlock(b.id, { name_ar: e.target.value })} dir="rtl" className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("rate.block_name_en")}</Label>
                      <Input value={b.name_en} onChange={(e) => patchBlock(b.id, { name_en: e.target.value })} dir="ltr" className="h-8" />
                    </div>
                  </div>
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="space-y-1 w-32">
                      <Label className="text-xs text-muted-foreground">{t("rate.block_duration")}</Label>
                      <Input
                        type="number" min={0} step={1} value={b.duration_min}
                        onChange={(e) => patchBlock(b.id, { duration_min: e.target.value })}
                        className="h-8 tabular-nums"
                      />
                    </div>
                    <div className="space-y-1 w-32">
                      <Label className="text-xs text-muted-foreground">{t("rate.block_price")}</Label>
                      <Input
                        type="number" min={0} step={0.01} value={b.price}
                        onChange={(e) => patchBlock(b.id, { price: e.target.value })}
                        className="h-8 tabular-nums"
                      />
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 ms-auto text-muted-foreground hover:text-destructive"
                      onClick={() => removeBlock(b.id)} aria-label={t("rate.block_remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={b.hasValidity}
                      onCheckedChange={(checked) => patchBlock(b.id, { hasValidity: checked === true })}
                    />
                    {t("rate.block_validity")}
                  </label>

                  {b.hasValidity && (
                    <div className="flex items-center gap-3 flex-wrap pt-1">
                      <div className="flex gap-1">
                        {DAY_CODES.map((code) => (
                          <button
                            key={code} type="button" onClick={() => toggleBlockDay(b.id, code)}
                            className={cn(
                              "h-7 min-w-9 px-1.5 text-xs rounded border transition-colors",
                              b.days.includes(code)
                                ? "bg-brand text-on-brand border-brand"
                                : "border-input text-muted-foreground hover:border-foreground"
                            )}
                          >
                            {t(`rate.day_${code.toLowerCase()}`)}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground">{t("rate.rule_from")}</Label>
                        <TimePicker value={b.from} onChange={(v) => patchBlock(b.id, { from: v })} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground">{t("rate.rule_to")}</Label>
                        <TimePicker value={b.to} onChange={(v) => patchBlock(b.id, { to: v })} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <Button variant="ghost" onClick={handleCancel}>{t("cancel")}</Button>
        <Button onClick={handleSave}>{t("save")}</Button>
      </div>
    </div>
  );
}
