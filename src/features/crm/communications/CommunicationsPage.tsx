import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, MessageCircle, Phone, Mail, Loader2, MessagesSquare } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EntityCell }    from "@/components/patterns/DataTable";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Label }  from "@/components/ui/label";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Separator } from "@/components/ui/separator";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useCrmData, type Communication } from "../data/useCrmData";

// ── Channel icon ──────────────────────────────────────────────────

function ChannelIcon({ channel, className }: { channel: Communication["channel"]; className?: string }) {
  if (channel === "whatsapp") return <MessageCircle className={cn("h-4 w-4 text-green-500", className)} />;
  if (channel === "call")     return <Phone className={cn("h-4 w-4 text-blue-500", className)} />;
  return <Mail className={cn("h-4 w-4 text-orange-500", className)} />;
}

// ── Send WhatsApp dialog ──────────────────────────────────────────

function SendDialog({
  customers, templates, open, onClose, lang, t,
}: {
  customers: { id: string; name_ar: string; name_en: string }[];
  templates: { id: string; name_ar: string; name_en: string; body_ar: string }[];
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"crm">>["t"];
}) {
  const [customerId, setCust]   = useState("");
  const [templateId, setTmpl]   = useState("");
  const [sending, setSending]   = useState(false);

  const selectedTmpl = templates.find(tp => tp.id === templateId);
  const isValid = customerId && templateId;

  async function handleSend() {
    if (!isValid) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 600));
    setSending(false);
    onClose();
    toast.success(t("communications.sent_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={
        <span className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-500" />
          {t("communications.form_title")}
        </span>
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button
            disabled={!isValid || sending}
            onClick={handleSend}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            {sending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <MessageCircle className="h-4 w-4" />
            }
            {t("communications.send_btn")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("communications.form_customer")} *</Label>
          <Select value={customerId} onValueChange={setCust}>
            <SelectTrigger>
              <SelectValue placeholder={t("communications.form_customer_ph")} />
            </SelectTrigger>
            <SelectContent>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {lang === "ar" ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("communications.form_template")} *</Label>
          <Select value={templateId} onValueChange={setTmpl}>
            <SelectTrigger>
              <SelectValue placeholder={t("communications.form_template_ph")} />
            </SelectTrigger>
            <SelectContent>
              {templates.map(tp => (
                <SelectItem key={tp.id} value={tp.id}>
                  {lang === "ar" ? tp.name_ar : tp.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedTmpl && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("communications.form_preview")}</p>
              <div className="rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm text-foreground leading-relaxed">
                {selectedTmpl.body_ar}
              </div>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

// ── Channel label ─────────────────────────────────────────────────

function ChannelBadge({ channel, t }: { channel: Communication["channel"]; t: ReturnType<typeof useTranslation<"crm">>["t"] }) {
  return (
    <Badge variant="outline" className="gap-1 text-xs font-normal">
      <ChannelIcon channel={channel} />
      {t(`communications.channel_${channel}` as Parameters<typeof t>[0])}
    </Badge>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function CommunicationsPage() {
  const { t, i18n } = useTranslation("crm");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useCrmData();

  const [channelFilter, setChannel] = useState("");
  const [custFilter, setCust]       = useState("");
  const [sendOpen, setSendOpen]     = useState(false);

  const customers = useMemo(
    () => (data?.customers ?? []).filter(c => !c.is_walkin),
    [data?.customers],
  );

  function customerName(id: string) {
    const c = customers.find(cu => cu.id === id);
    if (!c) return id;
    return lang === "ar" ? c.name_ar : c.name_en;
  }

  const filtered = useMemo(() => {
    let list = data?.communications ?? [];
    if (channelFilter) list = list.filter(c => c.channel === channelFilter);
    if (custFilter)    list = list.filter(c => c.customer_id === custFilter);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [data?.communications, channelFilter, custFilter]);

  const total = data?.communications.length ?? 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("communications.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border" style={{ opacity: 1 - i * 0.15 }}>
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-24 tabular-nums" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-48 flex-1" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("communications.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("communications.title")}
          subtitle={t("communications.count", { n: total })}
          actions={
            can("crm.communication.create") ? (
              <Button size="sm" onClick={() => setSendOpen(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("communications.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={channelFilter || "__all__"} onValueChange={v => setChannel(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36">
              <SelectValue placeholder={t("communications.all_channels")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("communications.all_channels")}</SelectItem>
              <SelectItem value="whatsapp">{t("communications.channel_whatsapp")}</SelectItem>
              <SelectItem value="call">{t("communications.channel_call")}</SelectItem>
              <SelectItem value="email">{t("communications.channel_email")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={custFilter || "__all__"} onValueChange={v => setCust(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-44">
              <SelectValue placeholder={t("communications.all_customers")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("communications.all_customers")}</SelectItem>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {lang === "ar" ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <PageSection padded={false}>
          {total === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title={t("communications.no_comms")}
              description={t("communications.empty_sub")}
              action={can("crm.communication.create")
                ? { label: t("communications.new"), onClick: () => setSendOpen(true) }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("communications.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setChannel(""); setCust(""); }}>
                {t("communications.clear_filters")}
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      {["col_date","col_channel","col_customer","col_summary","col_auto"].map(k => (
                        <TableHead key={k} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t(`communications.${k}` as Parameters<typeof t>[0])}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => {
                      const name = customerName(c.customer_id);
                      return (
                        <TableRow key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatDate(c.date)}
                          </TableCell>
                          <TableCell>
                            <ChannelBadge channel={c.channel} t={t} />
                          </TableCell>
                          <TableCell>
                            <EntityCell name={name} avatarFallback={name.slice(0, 2)} />
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {c.summary_ar}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.auto ? "secondary" : "outline"} className="text-xs font-normal">
                              {c.auto ? t("communications.auto_badge") : t("communications.manual_badge")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map(c => {
                  const name = customerName(c.customer_id);
                  return (
                    <div key={c.id} className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <ChannelBadge channel={c.channel} t={t} />
                        <span className="text-xs tabular-nums text-muted-foreground">{formatDate(c.date)}</span>
                      </div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-sm text-muted-foreground">{c.summary_ar}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </PageSection>
      </div>

      <SendDialog
        customers={customers}
        templates={data?.whatsappTemplates ?? []}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        lang={lang}
        t={t}
      />
    </>
  );
}
