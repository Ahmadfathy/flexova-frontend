import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, ChevronDown, ChevronRight, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Badge }   from "@/components/ui/badge";
import { ModalShell } from "@/components/patterns/ModalShell";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useFinanceData, type CoaAccount } from "../data/useFinanceData";

// ── Create dialog ──────────────────────────────────────────────────

function CreateCoaDialog({
  open, onClose, accounts, lang, t,
}: {
  open: boolean;
  onClose: () => void;
  accounts: CoaAccount[];
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"finance">>["t"];
}) {
  const [code, setCode]       = useState("");
  const [nameAr, setNameAr]   = useState("");
  const [nameEn, setNameEn]   = useState("");
  const [parent, setParent]   = useState("");
  const [type, setType]       = useState<"group" | "account">("account");
  const [saving, setSaving]   = useState(false);

  const codeTaken = code.trim() !== "" && accounts.some(a => a.code === code.trim());
  const isValid   = code.trim() && nameAr.trim() && nameEn.trim() && !codeTaken;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    // reset form
    setCode(""); setNameAr(""); setNameEn(""); setParent(""); setType("account");
    onClose();
    toast.success(t("coa.saved_toast"));
  }

  // Only show accounts that can be parents (roots and groups)
  const parentOptions = accounts.filter(a => a.type === "root" || a.type === "group");

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("coa.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!isValid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("coa.form_code")} *</Label>
          <Input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={lang === "ar" ? "مثال: 1105" : "e.g. 1105"}
            dir="ltr"
            className={cn(codeTaken && "border-danger")}
          />
          {codeTaken && (
            <p className="text-xs text-danger">{t("coa.form_code_taken")}</p>
          )}
          {!codeTaken && (
            <p className="text-xs text-muted-foreground">{t("coa.form_code_hint")}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("coa.form_name_ar")} *</Label>
          <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("coa.form_name_en")} *</Label>
          <Input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("coa.form_type")} *</Label>
          <Select value={type} onValueChange={v => setType(v as "group" | "account")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="group">{t("coa.type_group")}</SelectItem>
              <SelectItem value="account">{t("coa.type_account")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("coa.form_parent")}</Label>
          <Select value={parent || "__none__"} onValueChange={v => setParent(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("coa.form_parent_ph")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("coa.form_parent_ph")}</SelectItem>
              {parentOptions.map(a => (
                <SelectItem key={a.code} value={a.code}>
                  <span className="font-mono text-xs me-2 text-muted-foreground">{a.code}</span>
                  {lang === "ar" ? a.name_ar : a.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ModalShell>
  );
}

// Root code → accent colour
function rootAccent(code: string) {
  const root = code[0];
  if (root === "1") return "text-blue-600 dark:text-blue-400";
  if (root === "2") return "text-orange-600 dark:text-orange-400";
  if (root === "3") return "text-purple-600 dark:text-purple-400";
  if (root === "4") return "text-success";
  if (root === "5") return "text-danger";
  return "text-foreground";
}

function depth(account: CoaAccount, map: Map<string, CoaAccount>): number {
  if (account.parent === null) return 0;
  const parent = map.get(account.parent);
  if (!parent) return 1;
  return 1 + depth(parent, map);
}

export function CoaPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useFinanceData();

  const [search, setSearch]       = useState("");
  const [createOpen, setCreate]   = useState(false);
  // expanded state — roots start expanded
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["1","2","3","4","5"]));

  const accounts = data?.chartOfAccounts ?? [];

  const codeMap = useMemo(
    () => new Map(accounts.map(a => [a.code, a])),
    [accounts],
  );

  const depthMap = useMemo(
    () => new Map(accounts.map(a => [a.code, depth(a, codeMap)])),
    [accounts, codeMap],
  );

  // Children map: parent code → child codes
  const childrenMap = useMemo(() => {
    const m = new Map<string | null, string[]>();
    accounts.forEach(a => {
      const p = a.parent;
      if (!m.has(p)) m.set(p, []);
      m.get(p)!.push(a.code);
    });
    return m;
  }, [accounts]);

  function isVisible(account: CoaAccount): boolean {
    if (search) return true; // show all when searching
    if (account.parent === null) return true;
    // visible if all ancestors are expanded
    let cur = account.parent;
    while (cur !== null) {
      if (!expanded.has(cur)) return false;
      cur = codeMap.get(cur)?.parent ?? null;
    }
    return true;
  }

  const visibleAccounts = useMemo(() => {
    if (search) {
      const q = search.toLowerCase();
      return accounts.filter(a =>
        a.code.includes(q) ||
        a.name_ar.toLowerCase().includes(q) ||
        a.name_en.toLowerCase().includes(q)
      );
    }
    return accounts.filter(a => isVisible(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, search, expanded, codeMap]);

  function toggleExpand(code: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function hasChildren(code: string) {
    return (childrenMap.get(code)?.length ?? 0) > 0;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("coa.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border"
              style={{ paddingInlineStart: `${(i % 3) * 20 + 16}px`, opacity: 1 - i * 0.1 }}>
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-12 font-mono" />
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-4 w-24 ms-auto" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("coa.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("coa.title")}
        subtitle={t("coa.count", { n: accounts.filter(a => a.type === "account").length })}
        actions={
          can("finance.coa.create") ? (
            <Button size="sm" onClick={() => setCreate(true)}>
              <Plus className="h-4 w-4 me-1.5" />
              {t("coa.new")}
            </Button>
          ) : undefined
        }
      />

      {isOffline && <OfflineBanner />}

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("coa.search_ph")}
          className="ps-9"
        />
      </div>

      <PageSection padded={false}>
        <div className="divide-y divide-border">
          {visibleAccounts.map(account => {
            const d = search ? 0 : depthMap.get(account.code) ?? 0;
            const name = lang === "ar" ? account.name_ar : account.name_en;
            const accent = rootAccent(account.code);
            const canExpand = !search && hasChildren(account.code);
            const isExpanded = expanded.has(account.code);

            return (
              <div
                key={account.code}
                className={cn(
                  "flex items-center gap-2 py-2 pe-4 transition-colors",
                  account.type === "root" && "bg-muted/20",
                  account.type !== "root" && "hover:bg-muted/30",
                  canExpand && "cursor-pointer",
                )}
                style={{ paddingInlineStart: `${d * 20 + 16}px` }}
                onClick={() => canExpand && toggleExpand(account.code)}
              >
                {/* Expand icon */}
                <div className="w-4 shrink-0">
                  {canExpand && (
                    isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                {/* Code */}
                <span className={cn(
                  "font-mono text-xs tabular-nums shrink-0 w-12",
                  account.type === "root" ? cn("font-bold text-sm", accent) : "text-muted-foreground",
                )}>
                  {account.code}
                </span>

                {/* Name */}
                <span className={cn(
                  "flex-1 text-sm truncate",
                  account.type === "root" && cn("font-bold", accent),
                  account.type === "group" && "font-medium text-foreground",
                  account.type === "account" && "text-foreground",
                )}>
                  {name}
                </span>

                {/* Type badge */}
                {account.type !== "account" && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0 text-muted-foreground">
                    {t(account.type === "root" ? "coa.type_root" : "coa.type_group")}
                  </Badge>
                )}

                {/* Balance */}
                {account.balance !== undefined && account.balance !== null && (
                  <span className={cn(
                    "tabular-nums text-sm font-medium shrink-0 ms-auto",
                    account.balance < 0 ? "text-danger" : "text-foreground",
                  )}>
                    {formatMoney(account.balance, lang)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </PageSection>

      <CreateCoaDialog
        open={createOpen}
        onClose={() => setCreate(false)}
        accounts={accounts}
        lang={lang}
        t={t}
      />
    </div>
  );
}
